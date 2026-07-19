# Frontend Architecture

## Status And Authority

This document is the mandatory architecture contract for `frontend/`.

- Read it before creating, moving, or substantially changing frontend code.
- `AGENTS.md` contains operational rules. This document explains module ownership, dependency direction, and placement decisions.
- When this document conflicts with `frontend/AGENTS.md`, `AGENTS.md` wins.
- The target structure is normative. The legacy structure is a temporary migration state, not a template for new code.
- Architecture fitness tests in `test/frontend-architecture.test.ts` enforce the mechanically checkable subset.

## Goals

The frontend architecture must make five questions cheap to answer:

1. Which domain owns this behavior?
2. Which module exposes the interface used by callers?
3. Where does remote state live?
4. Which direction may this dependency point?
5. What must be tested when behavior changes?

The design optimizes for:

- domain ownership;
- locality of code, tests, and change impact;
- deep modules with small interfaces;
- predictable dependency direction;
- route-level loading and bundle isolation;
- one source of truth for server state;
- incremental migration without a flag day.

It does not optimize for:

- one file per DTO, endpoint, hook, or helper;
- maximum folder depth;
- speculative reuse;
- framework fashion;
- interfaces with only one hypothetical adapter.

## Architecture Vocabulary

Use these terms consistently in architecture discussions and reviews.

### Module

Anything with an interface and an implementation: a function, React component, file, folder, feature, or capability.

### Interface

Everything callers must know to use a module correctly: exported types and functions, invariants, errors, ordering, configuration, and performance characteristics.

### Implementation

Code hidden behind a module's interface.

### Depth

Leverage provided through an interface. A deep module hides substantial behavior behind a small interface. A shallow module makes callers learn almost as much as its implementation contains.

### Seam

A place where behavior can change through an interface without editing callers.

### Adapter

A concrete implementation satisfying an interface at a seam. Do not create an adapter seam until at least two real implementations exist or a test/runtime seam is demonstrably necessary.

### Locality

Change, bugs, domain knowledge, and verification concentrated in one place.

### Deletion Test

Imagine deleting a module. If complexity disappears, the module was probably pass-through ceremony. If complexity spreads into several callers, the module was providing depth.

## Technology Decisions

Keep the current stack unless a separate decision explicitly changes it:

- React for UI;
- React Router Data Mode for routes, layouts, lazy route modules, and route-owned loading states;
- TanStack Query for remote/server state;
- Jotai for small, truly global client UI state;
- local React state or reducers for screen-local workflows;
- Vite+ for build, checks, tests, and package operations;
- Tailwind and design-system modules for visual implementation;
- MLForm behind MLSuite-owned capability interfaces.

Do not add Redux, Zustand, another query cache, another router, or a meta-framework to compensate for unclear ownership. Fix ownership first.

## Target Source Tree

```text
src/
  app/
    main.tsx
    providers/
    router/
    layouts/

  shared/
    api/
      http.ts
    config/
      runtime.ts
    ui/
    lib/

  capabilities/
    editor/
    mlform/
    prediction-feedback/
    workspace-context/

  features/
    admin/
    models/
    plugins/
    reviews/
    schemas/
    search/
    user/
    workspace/
```

The tree may grow only when a new folder has clear ownership and a distinct interface. Avoid generic roots such as `common`, `core`, `helpers`, `utils`, or a new global `services` folder.

## Dependency Direction

The mandatory direction is:

```text
shared <- capabilities <- features <- app
```

Arrows mean “may be imported by”. Dependencies point left.

### `shared/`

May import only other `shared/` modules and external packages.

Must never import:

- `capabilities/`;
- `features/`;
- application composition;
- any legacy domain root.

Shared modules contain domain-neutral mechanisms, not business policy.

Examples:

- HTTP transport and common error conversion;
- runtime configuration;
- design-system primitives;
- generic date, keyboard, collection, and formatting functions.

### `capabilities/`

May import:

- its own capability;
- `shared/`;
- external packages.

Must not import another capability directly. If two capabilities need the same mechanism, move that mechanism to `shared/`. If they participate in one coherent workflow, reconsider whether they are one capability.

Capabilities own reusable product mechanisms with real domain meaning, such as MLForm integration, Monaco-backed document editing, prediction feedback, or the active workspace context. They are not dumping grounds for helpers shared by accident.

`capabilities/workspace-context` is the narrow downward-facing interface for session identity, active organization, and permissions. Domain features may consume that interface; they must not import the `workspace` or `user` feature. `app` composes its provider with authenticated data. The `workspace` feature still owns workspace resources and workflows, not the cross-cutting context interface.

### `features/`

A feature may import:

- modules inside the same feature;
- `capabilities/`;
- `shared/`;
- external packages.

A feature must not import internals of another feature. If behavior belongs to two features:

1. keep orchestration in the caller when reuse is superficial;
2. move a real reusable mechanism into a named capability;
3. move a domain-neutral mechanism into `shared/`;
4. fuse features when both names describe one workflow.

Do not create a cross-feature barrel to bypass this rule.

### `app/`

`app/` is the composition root. It may import features, capabilities, shared modules, and temporary legacy entry points.

It owns:

- provider composition;
- router composition;
- layouts and persistent shell assembly;
- global error handling;
- application startup.

Business rules, remote resource implementations, MLForm internals, and feature UI do not belong in `app/`.

## Feature Structure

Use only folders needed by a feature:

```text
features/schemas/
  api/
    schema.api.ts
    schema.keys.ts
    schema.queries.ts
    schema.mutations.ts
    schema.types.ts
  lib/
    runtime-assembly.ts
    one-hot-category.ts
    report-display.ts
  components/
  pages/
  routes.tsx
```

### `api/`

Owns the feature's remote-data interface:

- request and response contracts;
- HTTP calls;
- TanStack Query keys and options;
- mutations and cache reconciliation.

Group by resource or coherent use case. Do not default to one file per DTO, request, endpoint, or hook. Split only when a file approaches the line limit or contains unrelated responsibilities.

`*.api.ts` performs transport. It must not manage React state or UI.

`*.keys.ts` creates serializable, tenant-aware query keys.

`*.queries.ts` exports reusable `queryOptions()` and thin hooks only when hooks improve the interface.

`*.mutations.ts` owns remote writes and all cache updates or invalidations required by those writes.

`*.types.ts` groups related contracts. Avoid a file for a three-line union unless it has independent ownership.

Transport DTOs remain inside their owning feature's `api/` module. `shared/` and capabilities must never import a feature DTO. A feature adapts transport contracts into the narrow capability or domain input at its own boundary.

### `lib/`

Owns feature-specific domain logic and orchestration that is not React UI.

- Prefer pure functions for transformations and validation.
- Side-effecting orchestration must say so through naming and interface.
- Never name a folder or file only `algorithm`, `helper`, `utils`, or `index`.
- A transport workflow is not a pure algorithm; name it after the domain action.

### `components/`

Owns feature-specific React components.

- Maximum one React component per file.
- Components consume feature interfaces; they do not construct ad hoc remote cache contracts.
- Reusable visual primitives belong in `shared/ui`, not here.
- A component reused only inside one feature remains inside that feature.

### `pages/`

Owns route-level wiring:

- route params and URL state;
- query/mutation composition;
- screen-level loading, error, and empty states;
- composition of feature components.

Pages should not contain transport implementations, large domain transformations, reusable primitives, or a second React component.

### `routes.tsx`

Exports lazy-compatible route modules owned by the feature. The application router composes them without importing every page eagerly.

## Shared Structure

### `shared/api`

Owns one deep HTTP module:

- base URL resolution;
- credentials and headers;
- response parsing;
- typed error conversion;
- `AbortSignal` propagation;
- empty-response handling.

Feature transport modules depend on this interface. `shared/api` never knows schemas, models, plugins, users, or workspace rules.

### `shared/config`

Owns runtime configuration parsing and validation. Configuration flows outward; configuration modules never import features.

### `shared/ui`

Owns visual primitives, tokens, variants, and interaction states.

- No feature-specific data fetching.
- No feature permission policy.
- No domain DTOs.
- Stable interfaces preferred over giant barrels.
- Import a concrete module or narrow public interface; avoid a barrel exporting the entire design system.

### `shared/lib`

Owns domain-neutral functions. Before moving code here, require at least two real callers or clear platform-level meaning.

## Server State And TanStack Query

TanStack Query is the only source of truth for remote state.

### Query keys

- Every tenant-owned resource key starts with `['org', organizationId, ...]`.
- Include every variable used by the query function.
- Use one key factory per feature/resource.
- Never spell the same resource key manually in pages.
- Changing organization must remove or safely isolate previous tenant data, not only invalidate visible lists.

### Query options

Define key and query function together with `queryOptions()` so hooks, loaders, prefetching, and cache writes reuse one contract.

### Query functions

- Accept and propagate TanStack Query's `AbortSignal`.
- Throw typed errors; never encode failures as successful `undefined` data.
- Keep transport and normalization behind the feature's remote-data interface.

### Mutations

- Remote writes use mutation modules, not direct transport calls from components.
- Mutation success owns all related cache changes.
- Await invalidation when UI completion depends on refreshed data.
- Use `setQueryData` when response is authoritative; invalidate for reconciliation when needed.
- Choose one error owner. Do not emit both a global and contextual toast for the same failure.

### Manual caches

Do not add module-global promises or maps for remote resources already represented by Query. Derived runtime caches must be explicitly scoped by organization and invalidated through one owner.

## Client State

Choose the narrowest owner:

1. derive during render when possible;
2. URL search params for navigable filters, sorting, tabs, and pagination;
3. local state for one component or page;
4. reducer/provider local to a complex screen;
5. Jotai only for small state shared across unrelated branches.

Good global Jotai candidates:

- theme mode;
- sidebar state;
- global search visibility;
- fullscreen UI state.

Bad global Jotai candidates:

- copies of Query DTOs;
- route-specific editor drafts;
- selected entities already represented by URL or workspace context;
- mutation pending/error state.

Scope editor state with a provider keyed by the draft or document id so it cannot leak across routes.

## Routing

Use React Router Data Mode without creating a second remote cache.

- Route modules load lazily by feature or heavy route.
- Persistent shell lives in one layout route.
- Permission modules render explicit loading, denied, not-found, and failure states.
- Root error handling distinguishes route absence from unexpected errors.
- Loaders may call `queryClient.ensureQueryData()` using feature query options.
- Feature route factories receive `QueryClient` or a narrow route dependency object from `app`; they never import the application QueryClient singleton. The factory closes over that dependency when defining loaders.
- Prefer Query mutations for remote writes. Use route actions only when form lifecycle is genuinely route-owned.
- Heavy modules such as Monaco, TypeScript, Xterm, charts, diffs, and MLForm load only where required.
- Preload on intent only when measurement supports it.

## MLForm And Plugin Runtime

MLForm is a capability, not application-global infrastructure and not the MLSuite plugin catalog.

- MLSuite feature code depends on an MLSuite-owned capability interface.
- Built-in MLForm kinds and MLSuite plugin catalog items remain distinct.
- Plugin catalog data is remote state and tenant-scoped.
- Runtime definitions derived from plugins share one invalidation owner.
- Schema bindings and output mappings remain source of truth for execution.
- UI modules must not import low-level runtime registries when a capability interface can hide them.

## Error Ownership

- Transport converts protocol/network failures into typed errors.
- Query and mutation modules preserve those errors.
- Pages choose visible states and contextual recovery.
- Global handling is reserved for genuinely unhandled failures.
- A route error is not automatically a 404.
- Do not render operational claims unless they come from fetched state.

## Naming And Public Interfaces

- Use kebab-case for non-component TypeScript files.
- Use PascalCase for files exporting a React component.
- Use plural feature names consistently: `plugins`, `schemas`, `reviews`.
- Use `@/` for every source import that would otherwise climb with `../`; for example, `@/shared/api/http`. Keep `./` for files in the same local module. TypeScript, Vite, and the fitness test must resolve the same alias so dependency direction cannot be bypassed.
- Avoid generic `index.ts` files. A named file makes ownership searchable.
- Barrels are allowed only as narrow external interfaces.
- A module must not import its own folder's barrel.
- Internal imports use concrete files.
- Do not use a barrel to conceal cross-feature coupling.

## File And Module Size

- Maximum 300 source lines excluding comments, as required by root rules.
- Split before reaching the limit.
- Split by responsibility, not arbitrary line ranges.
- Maximum one React component per file.
- A folder containing only one generically named `index.ts` is usually shallower than a named file; remove the folder or name the module.
- Do not create one file per trivial type/function merely to keep files small.

## Testing

### Behavioral tests

- Existing behavior tests live in `test/`, with one file per behavior or feature as required by repository rules. Do not duplicate a test beside source code unless a separate placement decision changes this convention.
- Test visible behavior and public interfaces.
- Keep one test file per feature behavior, covering success and every error case at least once.
- Domain logic tests exercise the feature's public transformation interface.
- Query/mutation tests verify key identity, tenant scope, transport call, cache updates, and failures.
- Route tests cover auth, permission, loading, denied, not-found, and unexpected-error states.
- Critical MLForm/plugin tests exercise the real MLSuite capability lifecycle, not wrapper mocks.

### Architecture fitness test

`test/frontend-architecture.test.ts` is the single architecture test file. It must enforce:

- known top-level source roots;
- target dependency direction;
- feature isolation;
- no target-to-legacy imports outside `app` migration composition;
- no internal barrel imports in target modules;
- only `.ts` source files inside legacy `src/algorithms`;
- source line limit, with exact non-growing legacy baselines only;
- existence and `AGENTS.md` linkage of this contract.

An exception is grandfathered migration debt, not permission. It must identify an exact existing path and ceiling, cannot grow, and may only be removed. New or substantially edited files cannot claim an exception. When a violation falls back inside the contract, the test must fail until its stale exception is deleted.

## Transitional Legacy Structure

Current legacy roots include:

```text
admin algorithms api editor layout models plugin review router schemas search user workspace
```

They exist because the repository previously mixed domain folders with horizontal `api/` and `algorithms/` trees.

During migration:

- do not model new features after the legacy tree;
- do not create another top-level legacy root;
- do not move code into global `api/` or `algorithms/` when a vertical feature can own it;
- a small bug fix may remain in legacy location when moving the whole seam would inflate risk;
- a substantial change should migrate one coherent vertical slice;
- never leave forwarding files, compatibility barrels, dead imports, or duplicate implementations after a move;
- update source and tests in the same slice;
- preserve query keys and public contracts unless behavior intentionally changes.

The application composition root may import legacy entry points while migration is incomplete. New `shared`, `capabilities`, and `features` modules must never import legacy roots.

## Placement Decision Tree

When adding code, ask in order:

1. Is it application composition, a provider, layout, or router assembly?
   - Put it in `app/`.
2. Is it owned by one user-facing domain?
   - Put it in that `features/<domain>/` module.
3. Is it a named product mechanism reused by multiple features?
   - Put it in `capabilities/<mechanism>/`.
4. Is it domain-neutral platform code or a visual primitive?
   - Put it in `shared/`.
5. Is it reused only once or hypothetically?
   - Keep it local; do not invent a seam.

Then apply the deletion test. If the proposed module only forwards one call and hides no policy, combine it with its owner.

## Allowed And Forbidden Examples

Allowed:

```ts
// feature -> shared
import { appFetch } from "@/shared/api/http";

// feature -> capability
import { createSchemaForm } from "@/capabilities/mlform/schema-form";

// app injects infrastructure into a feature route factory
const schemaRoutes = createSchemaRoutes({ queryClient });

// inside features/schemas/routes.tsx
const createSchemaRoutes = ({ queryClient }: RouteDependencies): RouteObject[] => [
  {
    lazy: () => import("./pages/SchemaRoute"),
    loader: ({ params }) => queryClient.ensureQueryData(schemaOptions(params.schemaId)),
  },
];
```

Forbidden:

```ts
// shared must not know a feature
import type { SchemaDto } from "@/features/schemas/api/schema.types";

// one feature must not reach into another
import { ReportQuestionnaire } from "@/models/components/ReportQuestionnaire";

// internal barrel creates cycles and hides ownership
import type { SchemaDto } from "./index";

// page invents cache identity
useQuery({ queryKey: ["organizationMembers", id], queryFn: () => getMembers(id) });
```

## Refactor Sequence

Use vertical, compiling slices:

1. Establish this contract and fitness test.
2. Create `shared/api`, `shared/config`, and initial `shared/ui` interfaces.
3. Make `app` the real composition root; absorb router/layout assembly.
4. Pilot one small feature such as admin users or plugins.
5. Migrate workspace and fix tenant-scoped Query interfaces.
6. Migrate models.
7. Extract real MLForm, editor, and feedback capabilities.
8. Migrate schemas last because it has the widest runtime surface.
9. Move routes into lazy feature route modules.
10. Delete global legacy roots when empty.

Never perform a repository-wide path rewrite without a computed move map and full test run.

## Change Checklist

Before implementation:

- [ ] Read this document and nearest `AGENTS.md`.
- [ ] Name the owning feature/capability/shared module.
- [ ] Confirm dependency direction.
- [ ] Check whether an existing deep interface already covers the need.
- [ ] Identify tenant scope and cache owner.
- [ ] Identify route and bundle impact.

During implementation:

- [ ] Keep one source of truth for remote state.
- [ ] Keep one React component per file.
- [ ] Use concrete internal imports.
- [ ] Keep files below 300 non-comment lines.
- [ ] Add success and error coverage in one feature test file.
- [ ] Remove obsolete paths and exports after moves.

Before completion:

- [ ] Run focused tests first.
- [ ] Run `vp check`, `vp test`, and `vp build` when environment supports them.
- [ ] Run architecture fitness tests.
- [ ] Confirm no new dependency-direction exception was added.
- [ ] Confirm query keys, UI copy, and backend contract agree.
- [ ] Run `graphify update .` after source/documentation changes.
