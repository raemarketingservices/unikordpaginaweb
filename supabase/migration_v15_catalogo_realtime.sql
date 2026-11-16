-- UNIKO-RD · v15 — Catálogo en tiempo real
-- La web, app.uniko-rd.com y la APK leen la misma BD; con esto un producto, tienda o
-- servicio publicado desde cualquiera aparece en los demás sin recargar. Realtime
-- respeta RLS: cada cliente solo recibe las filas que ya podía leer.
do $$
declare t text;
begin
  foreach t in array array['products', 'stores', 'services', 'categories'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
