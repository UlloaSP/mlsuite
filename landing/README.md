# MLsuite landing

The product site intended for <https://mlsuite.eshkra.dev>, built with Astro. It shares the
eshkra palette, Mona Sans and JetBrains Mono fonts, and the MLsuite mark (`src/assets/mlsuite.png`,
the same file the eshkra site uses). The page follows the visitor's light or dark system
preference. It links to the live instance at <https://mlsuite.irlab.org> and the documentation at
<https://docs.mlsuite.eshkra.dev>.

## Local development

This directory is its own pnpm workspace with its own lockfile. From here, with Node.js 22.18+,
24.11+, or 26+ and Vite+ installed:

```sh
vp install --frozen-lockfile
vp run dev
```

Open <http://127.0.0.1:4350>. `vp run build` checks Astro/TypeScript and produces the static site
in `dist/`; `vp run preview` serves that build. Use `vp run check:format` to check formatting or
`vp run format` to apply it.

## The screenshots are the live instance

Every capture in `src/assets/captures/` is the real application at <https://mlsuite.irlab.org>,
taken with Playwright at 2x in light and dark mode by a demo account in its own organization,
**Penguin Lab (demo)**. Its two models are a decision tree (species) and a random forest (body
mass) trained on the public Palmer penguins dataset and exported with MLbundle 0.1.0a3. The
workspace captures have the navigation sidebar cropped off; Astro turns each PNG into WebP at
several widths at build time. Every screenshot opens at full size in a dialog; without JavaScript
they stay inline.

`src/data/api-call.ts` holds one real call the demo API client made to its bookmark, reformatted
and with ids shortened. Its key was revoked after the captures, and the bookmark was unpublished
again after the public page was captured.

To refresh a capture, sign in to the instance as a member of an organization with equivalent data,
take the page at a 1440 px wide viewport with `deviceScaleFactor: 2` in both colour schemes, and
replace the `<name>-light.png` and `<name>-dark.png` pair.

## Deployment

`wrangler.jsonc` deploys `dist/` as static assets to the `mlsuite.eshkra.dev` custom domain on
Cloudflare Workers. CI runs `vp run check:deploy` (`wrangler deploy --dry-run`, never uploads)
and deploys the tested build from `main`; see the root `README.md`.
