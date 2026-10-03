# UNIKO-RD Cloudflare API

This directory contains the D1/R2 API Worker used by the marketplace frontend.

## Deploy

From this directory, install dependencies, apply the additive D1 migrations, and deploy:

```powershell
npm ci
npx wrangler d1 migrations apply uniko-db --remote
npm run deploy
```

Set the administrator password as a Cloudflare Worker secret; do not put it in this repository:

```powershell
npx wrangler secret put ADMIN_PASSWORD
```

The D1 binding and R2 bucket are declared in `wrangler.jsonc`. Cloudflare credentials are provided by Wrangler login and are not stored here.
