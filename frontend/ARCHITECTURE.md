# Frontend architecture

This is the durable contract for ownership, dependency direction, state, routing, and testing in `frontend/`. The architecture fitness test enforces its mechanical boundaries.

## Goals

- A change should have one obvious owner.
- Business workflows should be discoverable by feature name.
- Shared mechanisms should expose narrow interfaces.
- Remote state should have one cache and one invalidation owner.
- Heavy runtimes should remain behind MLSuite-owned boundaries.
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
- Mutations own all related cache updates and invalidations.
- Do not copy Query DTOs into Jotai or module-global caches.

Use the narrowest owner for client state:

1. derive it during render;
2. use URL state for navigable filters, tabs, sorting, and pagination;
3. use local state for one component or page;
4. use a local reducer/provider for a complex screen;
5. use Jotai only across unrelated branches.

## Routing

- Use React Router Data Mode and lazy feature routes.
- Keep the persistent shell in one layout route.
- Loaders may call `queryClient.ensureQueryData()` with feature query options.
- Route factories receive dependencies from `app`; they do not import application singletons.
- Permission boundaries render loading, denied, not-found, and unexpected-failure states explicitly.
- Heavy modules such as Monaco, Xterm, charts, diffs, and MLForm load only where needed.

## MLForm and plugins

MLForm is a capability, not the MLSuite plugin catalog.

- Features depend on an MLSuite-owned capability interface.
- MLForm built-in kinds and catalog plugins remain distinct.
- Plugin catalog data is tenant-scoped remote state.
- Schema bindings and output mappings remain the execution source of truth.
- Theme changes update mounted runtimes without discarding their state.

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
