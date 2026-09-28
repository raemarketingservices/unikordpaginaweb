import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

// Requires a server-only key; never use a VITE_ variable for this credential.
const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
assert(process.env.SUPABASE_SERVICE_ROLE_KEY, "Missing server-only test credential");
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, options);
const anon = createClient(url, key, options);
const users = [];
const storeId = `test-${randomUUID()}`;
const paths = [];
function ok(result) {
  assert.ifError(result.error);
  return result.data;
}

try {
  for (const role of ["vendor", "user"]) {
    const client = createClient(url, key, options);
    const email = `integration-${randomUUID()}@example.com`;
    const password = `${randomUUID()}Aa1!`;
    const signup = ok(
      await client.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: "Prueba",
            last_name: "Temporal",
            phone: "0000000000",
            cedula: "00000000000",
            account_type: role,
            full_name: "Prueba Temporal",
          },
        },
      }),
    );
    assert(signup.user);
    users.push({ id: signup.user.id, client });
    if (!signup.session) {
      ok(await admin.auth.admin.updateUserById(signup.user.id, { email_confirm: true }));
      ok(await client.auth.signInWithPassword({ email, password }));
    }
    const profile = ok(await client.from("profiles").select("*").eq("id", signup.user.id).single());
    assert.equal(profile.role, role);
    assert.equal(profile.first_name, "Prueba");
  }
  const [seller, buyer] = users;
  console.log("PASS signup, login, profile fields and roles");

  for (const [name, mime, bytes] of [
    [
      "photo.png",
      "image/png",
      Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXZkAAAAASUVORK5CYII=",
        "base64",
      ),
    ],
    [
      "video.mp4",
      "video/mp4",
      Buffer.from("00000018667479706d703432000000006d70343269736f6d", "hex"),
    ],
  ]) {
    const path = `${seller.id}/${randomUUID()}-${name}`;
    ok(await seller.client.storage.from("marketplace").upload(path, bytes, { contentType: mime }));
    paths.push(path);
    const publicUrl = seller.client.storage.from("marketplace").getPublicUrl(path).data.publicUrl;
    assert.equal((await fetch(publicUrl)).status, 200);
  }
  const media = paths.map(
    (path) => seller.client.storage.from("marketplace").getPublicUrl(path).data.publicUrl,
  );
  ok(await seller.client.from("profiles").update({ avatar_url: media[0] }).eq("id", seller.id));
  console.log("PASS image/video storage and profile photo");

  const store = ok(
    await seller.client
      .from("stores")
      .insert({
        id: storeId,
        owner_id: seller.id,
        name: "Prueba temporal",
        description: "Integration test",
        logo: media[0],
        verified: true,
        rating: 5,
      })
      .select()
      .single(),
  );
  assert.equal(store.verified, false);
  assert.equal(store.rating, 0);
  const productId = `${storeId}-product`;
  const product = ok(
    await seller.client
      .from("products")
      .insert({
        id: productId,
        store_id: storeId,
        title: "Articulo temporal",
        price: 123.45,
        image: media[0],
        gallery: [media[0], media[0]],
        videos: [media[1]],
        is_new: true,
      })
      .select()
      .single(),
  );
  assert.match(product.sku, /^UNIKO-\d{10}$/);
  assert.equal(product.price, 123.45);
  assert.equal(ok(await anon.from("products").select("id").eq("id", productId)).length, 1);
  assert.equal(
    ok(await anon.from("stores").select("products_count").eq("id", storeId).single())
      .products_count,
    1,
  );
  console.log(
    "PASS store, optional RNC, media gallery, decimal price, automatic SKU and public catalog",
  );

  assert.equal(
    ok(await buyer.client.from("products").update({ price: 1 }).eq("id", productId).select())
      .length,
    0,
  );
  assert(
    (
      await buyer.client
        .from("products")
        .insert({ id: `${storeId}-denied`, store_id: storeId, title: "Denied", price: 1 })
    ).error,
  );
  assert(
    (await seller.client.from("profiles").update({ role: "admin" }).eq("id", seller.id)).error,
  );
  assert.equal(ok(await anon.from("profiles").select("*")).length, 0);
  assert.equal(ok(await buyer.client.from("profiles").select("*")).length, 1);
  assert.equal(
    ok(
      await buyer.client
        .from("chatbot_settings")
        .update({ enabled: false })
        .eq("id", "default")
        .select(),
    ).length,
    0,
  );
  console.log("PASS ownership, private profiles, admin role and chatbot settings authorization");

  for (const rating of [5, 3]) {
    ok(
      await buyer.client
        .from("store_ratings")
        .upsert({ store_id: storeId, user_id: buyer.id, rating }),
    );
    const rated = ok(await anon.from("stores").select("rating,reviews").eq("id", storeId).single());
    assert.equal(rated.rating, rating);
    assert.equal(rated.reviews, 1);
  }
  assert(
    (
      await buyer.client
        .from("store_ratings")
        .upsert({ store_id: storeId, user_id: buyer.id, rating: 6 })
    ).error,
  );
  const catalog = ok(await anon.rpc("marketplace_chatbot_catalog"));
  const allowed =
    catalog.cfg.enabled &&
    (catalog.cfg.allowed_stores.includes("*") || catalog.cfg.allowed_stores.includes(storeId));
  assert.equal(
    catalog.products.some((p) => p.id === productId),
    allowed,
  );
  console.log("PASS 1-5 stars, update without duplicate votes and fresh chatbot catalog");
} finally {
  ok(await admin.from("stores").delete().eq("id", storeId));
  if (paths.length) ok(await admin.storage.from("marketplace").remove(paths));
  for (const user of users) ok(await admin.auth.admin.deleteUser(user.id));
  console.log("Temporary test accounts, store, product and files removed.");
}
