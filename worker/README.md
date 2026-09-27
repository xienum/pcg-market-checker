# PCG Admin API

Cloudflare Worker backend for the PCG Market Checker admin console.

## Deploy

From the repository root:

```sh
npx wrangler deploy --config worker/wrangler.jsonc
```

This Worker currently runs in preview/read-only mode. It does not write to GitHub or data.json.
