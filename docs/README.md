# MLsuite documentation site

The Astro Starlight site for `docs.mlsuite.eshkra.dev`, package `mlsuite-docs`. It is a
self-contained project with its own lockfile. Run every command from `docs/` with Vite+ (`vp`) and
Node.js 22.18+, 24.11+ or 26+:

```shell
vp install --frozen-lockfile
vp run dev       # http://127.0.0.1:4351/
vp run build     # astro check, then a static build in docs/dist
vp run test      # link checks of the rendered repository files
vp run check:deploy   # wrangler deploy --dry-run; never uploads
```

The scripts invoke Astro through `vp exec`; bare `vp dev` and `vp build` run Vite's own commands
and do not build an Astro site. In development the Product link points to the local landing
(`4350`); built output links to the production hosts.

## Sources

Pages live in `src/content/docs/`. `RELEASES.md` beside this README and the root `SECURITY.md` are
rendered in place at `/self-hosting/releases/` and `/security/` through the `sources` collection
(`src/content.config.ts`, routes in `src/sources.ts`); edit those files, never a copy.

Screens in `src/assets/captures/` were taken on https://mlsuite.irlab.org with a demo account and
synthetic data, in light and dark, and are stored as WebP at 1536 px wide. The MLsuite mark in
`src/assets/mlsuite.png` is the eshkra product mark.

The site deploys to Cloudflare Workers Static Assets as the `mlsuite-docs` worker; `wrangler.jsonc`
owns the worker name, custom domain and asset routing. CI deploys the tested build from `main`;
see the root `README.md`.
