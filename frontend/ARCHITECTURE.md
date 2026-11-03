# Frontend architecture

This is the durable contract for ownership, dependency direction, state, routing, and testing in `frontend/`. The architecture fitness test enforces its mechanical boundaries.

## Goals

- A change should have one obvious owner.
- Business workflows should be discoverable by feature name.
- Shared mechanisms should expose narrow interfaces.
- Remote state should have one cache and one invalidation owner.
- Heavy runtimes should remain behind MLsuite-owned boundaries.
- Deleting a module should remove complexity rather than spread it into callers.

## Source tree

```text
src/
  app/           application composition, providers, router, layouts
  shared/        domain-neutral API, config, UI, and utilities
  capabilities/  reusable product mechanisms
  features/      user-facing domain workflows
```

The allowed dependency direction is:

```text
shared <- capabilities <- features <- app
```

Dependencies point left.

### `shared/`

Shared code may import only other shared modules and external packages. It owns HTTP transport, runtime configuration, design-system primitives, and domain-neutral functions. It must not know features or their DTOs.

`shared/api/openapi.gen.ts` is the Spring API's JSON contract, generated from `api/openapi.json` with `vp run api:types`. Import API DTOs from it rather than redeclaring them; derive narrower or UI-specific types from it. Never edit it by hand. It is exempt from the line limit because the generator owns its size. Payloads owned by the Python runtime or ops agent, which the spec leaves untyped, keep hand-written types in their feature.

### `capabilities/`

Capabilities own reusable product mechanisms such as MLForm integration, document editing, prediction feedback, or workspace context. They may depend on `shared/`, but not on features or another capability's internals.

### `features/`

A feature owns one user-facing domain. It may import its own modules, capabilities, shared code, and external packages. It must not import another feature's internals.

Use only folders a feature needs:

```text
features/schemas/
  api/
  lib/
  components/
  pages/
  routes.tsx
```

- `api/` owns transport contracts, query keys/options, mutations, and cache reconciliation.
- `lib/` owns feature-specific transformations and orchestration.
- `components/` owns feature UI.
- `pages/` owns route parameters, URL state, screen states, and composition.
- `routes.tsx` exports lazy-compatible route definitions.

### `app/`

`app/` composes providers, routes, layouts, startup, and global error handling. It does not own business rules, transport implementations, or runtime internals.

## State

TanStack Query is the source of truth for remote state.

- Tenant-owned query keys begin with `['org', organizationId, ...]`.
- Include every query input in the key and define keys once per resource.
- Define key and fetch function together with `queryOptions()`.
- Propagate `AbortSignal` and throw typed errors.
- Mutations own all related cache updates and invalidations. Define each with
  `mutationOptions()` in the feature's `api/`; its callbacks reach the cache through the
  context's `client`, and its hook only supplies inputs such as the current organization.
  Components call the hook; they do not invalidate or write the cache after a mutation.
- Do not copy Query DTOs into TanStack Store atoms or module-global caches.

Use the narrowest owner for client state:

1. derive it during render;
2. use URL state for navigable filters, tabs, and sorting;
3. use local state for one component or page;
4. use a local reducer/provider for a complex screen;
5. use TanStack Store atoms only across unrelated branches; persist preferences with
   `createPersistedAtom`.

Persisted catalogs use backend search, filters, sorting, and page counts. TanStack Query
accumulates server pages through `useInfiniteCatalog`, and TanStack Virtual renders the loaded
rows. Whole-result actions request an explicit server selection of identities and snapshots
independently of the pages the user has scrolled through.

- An infinite key is the resource's tenant root, the literal `"infinite"`, then the search,
  filter, and sort values. Everything before `"infinite"` names the catalog: new values keep
  that catalog's previous rows on screen while they load, and existing invalidations of the root
  still reach it.
- Typed search reaches the server through `useDebouncedValue`; clearing it applies at once.
- Every virtual list asks for its next page through `useLoadMoreNearEnd`.
- An invalidation refetches every loaded page of an active catalog, so mutations invalidate the
  narrowest key that covers what they changed.
- A popup opened from a row or a menu renders in the top layer, never inside the scroll container.

## Routing

- Use TanStack Router with a code-based route tree in `app/router/` and lazy page components.
  Pathless layout routes hold the shell and the permission guards; the router is registered, so
  `to`, `params` and `search` are type-checked against real routes.
- Make page routes with `page()` or `searchPage()` from `lazy-route.tsx`, never with
  `createRoute()` where the tree is declared: a page module imported in place would make the
  tree's type depend on the page, whose links depend on the tree, and every typed address would
  silently become `any`.
- Keep the persistent shell in one layout route.
- Write in-code addresses as typed `to` + `params` + `search`, or `linkOptions()` from a helper.
  Addresses only known at runtime as strings (return-to, remembered or server-sent links) go
  through `appHref()`. Render links with `AppLink`, which is the current page only on its exact
  address.
- A page reads its params with `getRouteApi(id).useParams()`. Only a component shown under
  several routes (a layout guard, one page mounted at several addresses) reads
  `useParams({ strict: false })`.
- Search params are plain strings in the URL, never JSON (`search-params.ts`). Each page route
  validates the params it owns with a zod schema kept in its feature's `pages/*-search.ts` and
  built from `shared/lib/search-schema.ts`: an absent or unknown value reads as the param's
  fallback, and the router leaves fallbacks out of the URL. Read them with
  `getRouteApi(id).useSearch()`; change them with `useSearchUpdate()`, `useCatalogControls()` or
  `useSearchFilters()`. A component shown under several routes takes its values from its page.
- `useLocation()` already names the next address while its page loads; code that must follow the
  page on screen reads the resolved location or the matches.
- Links preload their page and its data on intent. A loader starts its page's queries with
  feature query options (`prefetchForMember()` for workspace data) and never fails navigation:
  the page owns its loading, missing and failure states. Query owns caching, so every preload asks
  it again.
- Scroll lives in page containers, not the window. `app/layouts/use-scroll-memory.ts` restores a
  history entry's positions on back and forward, resumes a section at its last position when it
  is returned to through the navigation, and waits for a paged catalog to load enough rows; the
  router's own scroll restoration keys one position per entry and restores it at once, so it
  cannot express either.
- Route factories receive dependencies from `app`; they do not import application singletons.
- Permission boundaries render loading, denied, not-found, and unexpected-failure states explicitly.
- Heavy modules such as Monaco, Xterm, charts, diffs, and MLForm load only where needed.

## MLForm and plugins

MLForm is a capability, not the MLsuite plugin catalog.

- Features depend on an MLsuite-owned capability interface.
- MLForm built-in kinds and catalog plugins remain distinct.
- Plugin catalog data is tenant-scoped remote state.
- Schema bindings and output mappings remain the execution source of truth.
- Theme changes update mounted runtimes without discarding their state.

Plugin code is untrusted and runs only in the plugin sandbox, never in the app's origin.

- The sandbox is a separate Vite entry (`plugin-sandbox.html` + `app/plugin-sandbox-main.ts`),
  embedded as an opaque-origin `<iframe sandbox>`; it alone bundles the plugin compiler (Sucrase,
  which strips TypeScript types) and MLForm's plugin execution. The app entry graph must not
  import `sucrase` or build Blob-URL modules; `frontend-architecture.test.ts` enforces this.
- `capabilities/prediction-runtime/sandbox/` owns the host (`openPluginSandbox`), the typed
  `postMessage` channel and its zod protocol, the app-side services that open a sandbox to
  inspect or run plugins, and the guest that runs inside the sandbox document.
- Every mount site (workspace run, bulk run, schema preview, run/review report rendering,
  feedback questionnaires with plugin kinds, public pages, and the plugin editor's validation
  and type detection) reaches plugins through those services, not by compiling sources itself.
- The parent is the only party that calls the API; the sandbox receives schema, sources, data,
  and theme, and returns form values and results. It is given no credentials.

## Errors

- Transport converts protocol and network failures into typed errors.
- Query and mutation modules preserve them.
- Pages own contextual error states and recovery.
- Global handling is reserved for unhandled failures.
- A failed request is not automatically a 404.
- One failure gets one visible owner.

## Naming and imports

- Use PascalCase filenames for React components and kebab-case for other TypeScript modules.
- Use plural feature names consistently.
- Use `@/` for source imports that would otherwise climb with `../`; keep `./` inside one local module.
- Avoid generic `index.ts`, `helpers`, `utils`, `common`, and `services` containers.
- Barrels are narrow public interfaces only. Internal code imports concrete files.

## Size and testing

- Keep source files below 300 non-comment lines.
- Keep one React component per file.
- Split by responsibility, not arbitrary line ranges.
- Behavioral tests live in `test/` and exercise public behavior.
- `test/frontend-architecture.test.ts` is the single architecture fitness test.
- Fix architecture violations at their owner; do not add exceptions.

## Placement test

Ask in order:

1. Is it application composition? Put it in `app/`.
2. Is one domain the owner? Put it in that feature.
3. Is it a reusable product mechanism? Put it in a named capability.
4. Is it domain-neutral platform or UI code? Put it in `shared/`.
5. Is reuse hypothetical? Keep it local.

If a proposed module only forwards a call and hides no policy, combine it with its owner.
