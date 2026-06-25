# Lessons

## 2026-06-25 - Organization catalog dense card correction

- Correction: organization catalog filtering used implementation-centric asset/empty states, and card actions were split between inline affordances and direct buttons while the item had too much information for a grid tile.
- Rule: dense organization catalog items should be full-width cards; domain filters should use user-facing visibility terms such as public/private, and secondary edits/destructive/ownership actions belong under one overflow menu while editable primary fields remain clickable inline.

## 2026-06-25 - Organizations catalog UI correction

- Correction: org catalog tiles were implemented as card-like panels, rename/delete were hidden in a menu, and create page kept a preview/help card instead of a direct form.
- Rule: when user asks for catalog tiles, keep tiles flat and direct; primary fields/actions should be inline, destructive actions need a real modal, and create forms should not include explanatory preview cards unless explicitly requested.

## 2026-06-25 - Sidebar child shortcut correction

- Correction: `Alt+Shift+number` depended on ambiguous open submenu state and keyboard layout-specific shifted characters.
- Rule: child nav shortcuts need one deterministic submenu source and must read physical digit codes (`DigitN`/`NumpadN`) before layout-specific `event.key`.
- Correction: collapsed collapsible sidebar parents toggled hidden state instead of navigating, and Alt hints resized rows.
- Rule: collapsed parent rows with hidden children should navigate to their overview child; shortcut hints must reserve layout space or be absolutely positioned so showing hints does not resize navigation rows.

## 2026-06-23 - Sidebar shortcut and collapsed navigation correction

- Correction: `Alt+Shift+1` did not navigate second-level items because browsers report shifted digit keys as symbols like `!`, not `"1"`.
- Rule: shortcut digit helpers must normalize shifted digit symbols or use a physical-code strategy; tests need at least one `Shift+digit` symbol case.
- Correction: collapsed sidebar still showed submenu chevrons/expanded-only hints, creating a broken visual rail.
- Rule: collapsed sidebar rows must hide expanded-only affordances, including submenu chevrons, shortcut hint badges, and submenu containers.

## 2026-06-23 - Workspace org navigation correction

- Correction: Organizations was exposed from org-scoped `canViewOrganization`, but product intent is superadmin-only global org access.
- Rule: distinguish current-workspace/org scoped navigation from global admin navigation; first-level `Organizations` belongs behind `SUPERADMIN` unless explicitly scoped to the active workspace.

## 2026-06-23 - Frontend dev runtime config correction

- Correction: Vite dev loaded missing `/runtime-config.js` and `.env` forced cross-origin `https://localhost:8443`, so startup readiness failed with browser CORS before app UI rendered.
- Rule: local Vite dev must serve a concrete runtime config and default backend calls to same-origin `/api`; deploy/runtime config owns absolute backend URLs.
- Correction: user preferred removing frontend `.env.*` and runtime config duplication once global `.env` was confirmed as the config source.
- Rule: frontend backend URL config must have one path only: global `.env` into Docker build args for bundled env, otherwise same-origin fallback; do not keep runtime env files/scripts that imply a second source.
- Correction: sidebar migration moved the rail left, widened collapsed state, and made the collapse action icon-only.
- Rule: when replacing a layout primitive, preserve explicit product layout invariants first: side, previous measured width, and visible action labels unless the user asks to change them.
- Correction: putting Actions inside sidebar scroll content made route/menu changes feel like the rail jumped.
- Rule: sidebar global actions belong in a fixed bottom area above the account footer; keep scrollable navigation separate from persistent controls.
- Correction: wrapping every protected route element in its own `AppShellFrame` remounted header/sidebar on navigation, making sidebar clicks feel like hard jumps.
- Rule: app chrome must live in one persistent layout route; permission wrappers belong inside the outlet content so navigation replaces pages, not the shell.
- Correction: collapsed 52px sidebar was too tight for the shadcn-style org/user controls even after padding adjustments.
- Rule: shadcn-style collapsed rails need enough rail width for icon/avatar controls plus padding; prefer the component's original collapsed width over forcing the old 52px rail.
- Correction: sidebar/header migration left schema save modal below app chrome, so overlay did not cover the right sidebar.
- Rule: app-level modals must render above persistent shell chrome and be checked with expanded/collapsed sidebar visible; portal modal overlays to `document.body` or use a z-index above sidebar/header.

## 2026-06-22 - Schema preview correction

- Correction: schema editor preview rendered one report for multi-model `mappedTo` because the preview used only the first target and did not expand MLForm report configs.
- Rule: editor/schema previews must expand compact multi-target schema reports before MLForm mount; transport payload count alone cannot create extra report frames.
- Correction: user preferred the existing animated floating `ToggleButton.tsx` over top tabs.
- Rule: when a previous local UI component is named, inspect and reuse it before introducing a new switch primitive.
- Correction: first-time schema creation should not expose mutable JSON; the schema is generated from selected models and only version creation is an editing/refinement flow.
- Rule: keep initial schema creation automatic from model selection, and reserve mutable schema editing for explicit schema-version creation.
- Correction: user reverted schema preview tabs and removed create-schema preview entirely.
- Rule: for schema creation, do the shortest direct flow: name + model selection + create; keep visual form preview only where user explicitly needs refinement/inspection.

## 2026-06-21 - Analyzer reports contract correction

- Correction: MLSuite kept normalizing backend model reports from legacy `outputs[]/type` after backend prediction responses had already moved to `reports[]/kind`.
- Rule: when backend contract migration is complete and user requests breaking cleanup, delete compatibility reads and update tests to the current contract; do not keep silent fallback paths that hide wrong payload shapes.
- Correction: report fixes kept compatibility for keyed `reports` maps, `explanations`, exact report-id aliases, and single-target `mappedTo` map fallback after the user clarified those were legacy.
- Rule: current report contract is `reports[]` plus explicit `mappedTo`; do not keep keyed report maps, `outputs`, `explanations`, report-id fallback, alias migration, or model-map fallback unless the user explicitly asks for a migration bridge.
- Correction: a single plugin report with multi-model `mappedTo` rendered as one MLForm report controller, so report fetch/display state did not align with per-model persistence.
- Rule: schema reports with multi-model `mappedTo` must expand into per-binding runtime report instances before MLForm mount; persisted schema can stay compact, but report lifecycle state needs model-specific ids.

## 2026-06-19 - MLForm linked API correction

- Correction: headless MLForm API tests passed while MLSuite browser/render path lost fields and visible inputs.
- Rule: linked MLForm migrations must verify mounted DOM has field controls plus reports, and saved/review display shows user-facing input values; headless `executeFormPipeline()` is not enough.
- Correction: repeated report fixes still left uncertainty about where payloads disappeared between submit, MLForm fetch, MLSuite normalization, display extraction, and save modal.
- Rule: when browser behavior remains unclear after contract tests pass, add one stable-prefix diagnostic trace across every boundary from user submit to final display/save before changing more logic.
- Correction: mounted MLForm submit exposed fetched plugin reports on `pipelineResult.reportFetchResults`, but MLSuite read only model submit `result.raw`, so plugin payloads were lost and reports stayed pending/empty.
- Rule: mounted MLForm submit handlers must merge `pipelineResult.reportFetchResults` into schema-run raw reports and preserve report target aliases from `reportContextById`; model submit raw alone is incomplete.
- Correction: real backend schema bindings can carry numeric model ids, while strict report plugins expect string `meta.modelId`, causing plugin fetch to throw before making the analyzer request.
- Rule: schema report plugin context must normalize backend DTO ids to string at plugin boundaries; mounted regressions need numeric model ids plus strict plugin `modelId` checks.
- Correction: model reports fetched but did not render because schema display matched result `modelId` to bindings with strict equality, while backend/runtime ids can differ by string vs number.
- Rule: schema display/report lookup must normalize scalar ids at DTO/runtime boundaries; multi-model regressions must include string binding ids and numeric result ids.
- Correction: classifier model reports still did not render correctly when analyzer returned `mapping` as an object such as `{ "0": "1" }`, and numeric-string labels were reinterpreted as indices.
- Rule: analyzer report regressions must cover real payload shapes, including object mappings, scalar/array report payloads, and numeric-string class labels; display should normalize payload shape once before rendering.
- Correction: model reports still stayed pending/empty when schema report `mappedTo` was keyed by model name but persisted binding lacked `modelName`; the runtime adapter added `default`, but MLSuite treated duplicate target values as ambiguous.
- Rule: built-in model report routing may fallback to a single unique mapped target when binding metadata is incomplete; custom/plugin report routing must stay strict to avoid collapsing multi-model plugin contexts.

## 2026-06-18 - MLSchema one-hot parent correction

- Correction: frontend schema composer still required or preserved parent-level `mappedTo` for `onehot-category`, while MLSchema 0.2.1 puts model targets on `options[].mappedTo`.
- Rule: all schema paths must treat `onehot-category` parent as UI-only; compose, validate, run, display, and transport must read/write option mappings only.

## 2026-06-17 - MLForm UI fetch regression correction

- Correction: removing MLSuite prefetch before proving mounted MLForm UI consumes upstream report fetch state left report cards in error and no analyzer request visible.
- Rule: MLForm submit pipeline fixes must verify both headless `executeFormPipeline()` and mounted `mountForm` UI path; kit submit may not use the pipeline automatically.
- Correction: storing MLSuite skipped sentinel as a report payload can still render as MLForm report `ERROR` when the plugin has a strict payload schema.
- Rule: skipped/unsupported custom report fetches must be omitted from MLForm `reports`; sentinel is only safe in internal raw/result merge paths that explicitly filter it.
- Correction: tests that only assert "fetch was called" missed the user-visible error card regression.
- Rule: schema custom-report regressions need a strict `payloadSchema` fake and a mounted-style `form.submit()` assertion that unsupported reports do not enter `error` state.
- Correction: omitting unsupported report payloads fixed MLForm `ERROR` but left the report controller `idle`, so save/result code kept waiting forever.
- Rule: unsupported schema custom reports need an internal skipped id marker outside MLForm `reports`; result-state pending checks must ignore those ids without feeding invalid payloads to plugins.
- Correction: explanations fetch could still receive the full schema input record through report request values, causing 400 missing-feature errors for the target model.
- Rule: schema custom-report fetch requests must be model-scoped across `values`, `fieldValues`, `serializedValues`, `serializedFieldValues`, and `meta.backendFieldValues`; tests must inspect request bodies, not only URLs.

## 2026-06-17 - MLForm report fetch correction

- Correction: treating schema custom report prefetch as an upstream MLForm gap was stale; MLForm already exposes `ReportDefinition.fetch`, `executeReportFetches`, and `executeFormPipeline`.
- Rule: before adding or preserving app-owned MLForm lifecycle workarounds, check current MLForm runtime exports and prefer upstream orchestration APIs over duplicating report fetch logic.

## 2026-06-17 - Schema feedback/display correction

- Correction: schema reports without persisted ids lost classifier config during feedback-step building, so assessment fell back to number.
- Rule: schema feedback must use the already resolved display report config after mapped report routing; do not re-find config only by optional runtime id.
- Correction: removing label from every input lookup broke display for pending MLForm visible payloads, showing `N/A` even when the user entered a value.
- Rule: labels may be read as UI-display/submitted aliases, but must never be persisted as data keys; persist mapped targets only.

## 2026-06-17 - Schema mappedTo source of truth correction

- Correction: label and source kept leaking as runtime fallbacks after mappedTo migration, so saved schema runs could still persist display aliases or route reports by legacy source/id.
- Rule: schema data paths must use `mappedTo` only for model/report targets; `label` is display text, `id` is MLForm/UI identity, and `source` is not an active schema contract.

## 2026-06-17 - Schema run persistence rework correction

- Correction: assessment type must follow output kind only: classifier -> category, regressor -> number; labels/mapping do not change kind.
- Rule: do not infer model task type from display metadata such as labels; use explicit backend/runtime kind.
- Correction: previous save fix still trusted direct visible aliases even when their values were `undefined`, blocking mapped model-key fallback and saving unresolved fields.
- Rule: schema visible-input reconstruction must treat `undefined`/`null`/empty string as absent before trying mapped model keys, and saved visible input must omit unresolved values.
- Correction: plugin report payload aliases were updated in aggregate reports but custom-report result outputs missed the normalized report id alias.
- Rule: any report payload persisted for history/review must be written to aggregate raw reports and owning result output under normalized id, raw id, and mapped source.

## 2026-06-17 - Schema run persistence correction

- Correction: fixing schema-run display did not fix saved `inputData`; save modal still sent stale raw visible inputs.
- Rule: schema-run save/review/export must persist and consume one canonical visible-input reconstruction from schema snapshot + model inputs; do not trust first-submit `raw.inputData` after async report updates.
- Correction: plugin reports rendered in form but were not persisted when async report state patched only display-level reports.
- Rule: any report payload aliasing fix must update both initial transport result and async MLForm report-state merge path.
- Correction: output feedback `assessment` relied on derived field ids, causing category questionnaire drift between save modal and review.
- Rule: generated feedback fields need stable explicit ids when values are persisted or displayed later.

## 2026-06-17 - Signature deprecation correction

- Correction: schema cardinality was `>=1` models, not exactly one model.
- Rule: when deprecating an intermediate domain object, preserve stated collection cardinality; do not infer simpler cardinality from "accept one" wording without confirmation.
- Correction: hiding routes/controllers is not deprecation completion if legacy files remain importable and tests still exercise them.
- Rule: removal tasks must delete dead files and then let compile/typecheck reveal real remaining dependencies; disabling exposure alone is incomplete.

## 2026-06-17 - Schema mappedTo persistence correction

- Correction: removing schema mapping logic is incomplete if persisted DTO/entity/form schema still writes legacy ids, source, inputMapping, or outputMapping.
- Rule: when changing schema mapping source of truth, audit generated schema JSON, saved signature JSON, DTOs, entities, and runtime normalization in the same pass.
- Rule: generated schema fields/reports should not persist runtime-only ids/source when `mappedTo` is the contract; runtime may derive local ids after load.
- Rule: schema `mappedTo` record keys must use domain-stable names when those names are unique; one-hot option mappings must preserve per model/signature records after merge.
- Correction: signature save wrapped fields before one-hot grouping, so feature keys became records and grouping failed.
- Rule: one-hot grouping must run before wrapping `mappedTo`; after grouping, wrap one-hot option mappings, not the master field.
- Correction: MLForm validates/submits concrete one-hot targets, but app persists per-binding mapped records.
- Rule: schema-run runtime may collapse mapped records for MLForm only; transport must restore original field/report mapped records before building model input and report context.
- Correction: schema-run normal fields with no persisted ids submitted exact mapped keys, but mapper only read generated UI ids, dropping scalar features.
- Rule: schema-run input mapping must accept generated UI ids and exact mapped model keys for scalar and one-hot fields.
- Correction: tests missed broken schema-run because submit success did not prove full feature count or report payload.
- Rule: mapped schema-run regressions must assert exact model feature count and at least one mapped report payload.
- Correction: editor validation used raw persisted schema while runtime used an adapted schema, so `onehot-category`/mapped records validated differently than render/submit.
- Rule: editor validation and runtime mount must share the same MLForm adapter for persisted mapped records.
- Correction: schema version creation dropped `modelName`/`signatureName`, breaking name-key report mappings after save/reload.
- Rule: when mappedTo keys use names, every binding copy path must preserve names; ids alone are not enough.
- Correction: report mapping lookup by exact id/source missed MLForm-normalized ids and no-id persisted reports.
- Rule: report mapping lookup must normalize id/source/label aliases, and display must fall back to saved payload ids when binding source cannot be resolved.
- Correction: report normalization by id/source/label reintroduced wrong model routing and duplicated one report across bindings.
- Rule: schema runtime routing must use only `mappedTo`; missing field/report/onehot option `mappedTo` is a schema error, not a cue to infer from id/source/label.
- Rule: onehot-category parent fields do not own model targets; each option owns its mapped target record.
- Correction: single-model signature editor still showed raw analyzer signatures because only save/run paths were normalized.
- Rule: mappedTo/one-hot contract changes must cover all boundaries: analyzer output, persisted old signatures, editor load, save normalization, and runtime submit/report rendering.
- Correction: missing `mappedTo` surfaced as thrown errors instead of editor diagnostics.
- Rule: schema authoring invariants that MLForm cannot express must be appended as `CompatIssue` editor validation errors, so users see markers and Save disables before runtime.

## 2026-06-15 - Header Brand Reference Correction

- Correction: header brand drifted from supplied visual reference for icon shape, typography, and icon/text spacing.
- Rule: when user supplies brand reference imagery, update the shared brand mark and header brand composition together; do not tune surrounding layout while leaving old logo/type assets in place.
- Correction: using the supplied SVG without checking its internal bounds made favicon/header mark look too small.
- Rule: brand SVG assets used as favicon or compact header marks must have a tight viewBox; verify rendered alpha bounds, not only CSS size.

## 2026-06-14 - Breadcrumb Ellipsis Correction

- Correction: shadcn-style breadcrumb ellipsis was decorative only, but supplied reference expects the ellipsis to open a menu for collapsed breadcrumb items.
- Rule: when implementing collapsed breadcrumbs, ellipsis must expose hidden path items as an interactive menu; do not replace collapsed structure with inert `...`.
- Correction: breadcrumb dropdown was rendered inside an overflow-clipped breadcrumb shell, so the menu could be hidden behind/cut by nearby layout.
- Rule: any dropdown/popover inside compact nav must either render in a non-clipping layer or avoid `overflow-hidden` ancestors; z-index alone cannot beat ancestor clipping.
- Correction: even after visible overflow, later page stacking contexts could paint over the dropdown while HTML existed.
- Rule: navigation dropdowns used inside arbitrary page shells should render through a document-body portal with viewport-fixed coordinates, not inside the breadcrumb DOM subtree.

## 2026-06-14 - Plugin Catalog Query Pattern Correction

- Correction: plugin catalog page used custom local feed state and infinite scroll after backend pagination, while app convention expects `appFetch` services plus TanStack Query hooks for fetched pages and mutations.
- Rule: React pages that fetch/mutate app API data must use feature hooks built on TanStack Query; services own `appFetch`, hooks own request state/cache invalidation, pages own UI state.
- Rule: when user asks for classic pagination, do not keep sentinel/infinite-scroll code or copy; expose explicit previous/next page controls and remove scroll-loading branches.
- Correction: type filter should be direct `All` / `Fields` / `Reports` buttons, and pagination controls should stay visible while plugin rows scroll internally.
- Rule: catalog pages with pagination need one scroll body for rows and a fixed footer outside that scroll body; filters with three options should prefer explicit segmented buttons over selects.
- Correction: segmented/pill container looked like slider and duplicated count/page info below filters.
- Rule: when user asks for separate buttons, render independent button affordances with visible gaps; avoid grouped segmented backgrounds, and keep page/count copy in one place only.
- Correction: plugin search/filter/sort/count logic stayed in frontend even though backend can own it.
- Rule: plugin catalog frontend should pass query intent only; backend owns catalog row metadata, counts, filtering, search, and ordering whenever data already lives server-side.
- Correction: plugin catalog search/filter/sort refetch flickered because changing query keys temporarily cleared page data and reset page in a delayed effect.
- Rule: paginated TanStack Query UIs must keep previous page data during refetch and reset page inside the initiating filter/search/sort handler, not through a later effect that creates intermediate query keys.
- Correction: plugin page response carried catalog stats and redundant total, coupling list pagination with independent counters.
- Rule: catalog stats that change on create/delete but not page filters belong in a separate query/endpoint; derive redundant totals client-side and invalidate page + stats query families after mutations.
- Correction: plugin backend exposed a mixed `PluginService` interface that blurred hexagonal use-case ports with implementation service naming.
- Rule: controllers and application consumers depend on explicit use-case ports; application service implementations may implement ports, but should not introduce broad service interfaces that duplicate port boundaries.
- Correction: plugin catalog page subscribed to page/stats query state in the route shell, so refetches rerendered header/toolbar/page layout instead of only data regions.
- Rule: route pages should own URL/local UI state; TanStack Query subscriptions should live in the smallest component that renders that data, with mutations invalidating query families from dedicated hooks.
- Correction: plugin frontend files lived under generic `app/api`, `app/pages`, and `app/utils/mlform`, hiding feature ownership.
- Rule: plugin-owned frontend API, catalog UI, TanStack hooks, and MLForm plugin runtime belong under `src/plugin/...`; app/model/schema/editor code imports plugin module instead of owning plugin files.
- Correction: plugin catalog toolbar hand-rolled a sort dropdown while shared `AppSelect` already existed, and controls used overly rounded corners.
- Rule: before adding feature-local form controls, check shared app primitives first; use global primitives and tune their radius/tokens there unless feature needs a distinct interaction.
- Correction: shared select should use the requested shadcn/Radix primitive instead of a native `<select>` approximation.
- Rule: when user names a specific UI system component, adapt the global primitive to that system and preserve existing call-site contracts.
- Correction: Radix select migration showed ids for nested option labels, forced full-width layout, and missed native selects.
- Rule: shared select migrations must audit every native `<select>`, preserve option display text separately from submitted value, and keep trigger width opt-in so compact toolbars do not wrap.
- Correction: user wanted shadcn visual behavior but not Radix runtime dependency, matching breadcrumb local primitive approach.
- Rule: when asked to mimic shadcn components in this repo, prefer local design-system primitives with the same visual/composition behavior; add a runtime dependency only when explicitly requested or impossible locally.
- Correction: user supplied exact shadcn Select composition code, but previous change only reproduced behavior through `AppSelect`.
- Rule: when user provides a target component import/composition snippet, expose primitives with matching names and JSX structure, then adapt legacy wrappers on top.
- Correction: select trigger rendered empty because selected-label lookup only handled a single React element, while real composition passes arrays/fragments.
- Rule: composed primitives that inspect children must handle arrays and nested wrappers, then verify at real call sites with current classes.
- Correction: select popup was wider than trigger and opened with label level to trigger instead of item-aligned above selected option.
- Rule: shared select popups must match trigger width and align selected option to trigger position; labels live above that aligned option.
- Correction: local shadcn-like select kept diverging from requested Radix/shadcn behavior after multiple visual fixes.
- Rule: when user explicitly accepts the dependency path for a UI primitive, use the upstream primitive and remove compatibility shims instead of extending a local clone.
- Correction: preserving legacy `<AppSelect><option /></AppSelect>` delayed full migration and hid contract drift.
- Rule: when a breaking UI primitive contract is requested, remove the legacy API in the shared wrapper and migrate every consumer so typecheck catches stragglers.

## 2026-06-14 - Page Header Consumer Migration

- Correction: new `AppPageHeader` API existed, but pages still used separate breadcrumbs, generic `Back` links, `aside`, and wrapped action buttons.
- Rule: when changing a shared UI primitive contract, migrate every consumer in the same pass and remove legacy props so typecheck catches stragglers.
- Rule: breadcrumb labels must name the destination/domain (`Models`, `Schemas`, `Organizations`, `Members`) instead of generic navigation copy like `Back`.

## 2026-06-14 - Component Barrel Cleanup

- Correction: shared UI files were split but old `ui.tsx`/`ui-controls.tsx`/`ui-utils.ts` barrels remained.
- Rule: in this frontend, `src/app/components/index.ts` is the only component barrel; split primitives must be imported through it by features, and component internals should import sibling files directly.
- Correction: page-header action order was underspecified for 2x2 placement.
- Rule: when a grid has semantic slot priority, encode explicit grid coordinates instead of relying on normal DOM flow.

## 2026-05-07

- User correction: admin user table reordered after toggling enabled, making status changes visually disorienting.
- Rule: mutable admin tables must preserve row order by default; status/group sorting belongs behind explicit user-controlled sort/filter UI.

- User correction: when infra dashboard includes charts or terminal, pick real supported libraries up front, not placeholder/custom UI.
- Rule: if plan says charting or terminal UX is first-class product scope, decide exact package names and integration path before implementation starts.
- Rule: when containerized ops code shells out to platform tooling, verify the exact package provides the expected client binary and subcommands inside the image before wiring compose around it.
- User correction: infra page looked like a landing page, not a dashboard.
- Rule: dashboards must surface scanable state in first viewport: KPI row, service status, and localize error badges so failures inform instead of owning hierarchy.
- User correction: infra terminal spawned sessions in a render loop until ops-agent hit max sessions.
- Rule: never auto-open scarce backend sessions from render/mount; require explicit user intent and keep React effect deps stable around mutation functions.
- User correction: infra marked running services without Docker healthchecks as unhealthy and exposed shell for every managed service.
- Rule: normalize empty upstream health fields to unknown/null, and gate privileged shell access behind explicit allowlists instead of hardcoded availability.
- User correction: new ops-agent module was wired in compose but not GHCR publish CI.
- Rule: when adding a deployable module/image, update dev compose, prod compose, CI image matrix, env names, and verification docs in one pass.
- User correction: ops-agent overview read host metrics when dashboard only needed managed service totals.
- Rule: infra telemetry must come from the intended source of truth; if the UI says managed services, aggregate Docker service stats instead of probing host CPU/RAM/disk.
- User correction: preserving `host` contract names after switching to service totals left legacy in the new module.
- Rule: after changing a contract source of truth, rename payloads, types, tests, and UI copy in the same pass; do not keep misleading compatibility names unless explicitly required.
- User correction: frontend should keep its existing dashboard visuals while adapting to new backend contract.
- Rule: when contract changes affect UI, preserve established composition first; only rename labels/data bindings and add requested controls unless user asks for a redesign.
- User correction: Docker service telemetry also includes disk read/write and network I/O, not only CPU/RAM.
- Rule: when deriving infra metrics from Docker stats, map the full relevant stats contract (`CPUPerc`, `MemUsage`, `BlockIO`, `NetIO`) through backend models, frontend types, tests, and visible labels in one pass.
- User correction: MLForm 0.1.8 questionnaire support should use `mountWizardForm`/kit API, not local questionnaire compatibility shims.
- Rule: when upstream library replaces a removed subpath with a new public API, adapt to the new public API directly; do not preserve local legacy facades unless no upstream path exists.
- User correction: Docker frontend build failed on `vp run build` TypeScript errors after a Vite-only verification missed them.
- Rule: for frontend release/Docker readiness, run the package build script (`vp run build`) so `tsc -b` executes; `vp build` alone is insufficient for strict type checks.
- User correction: MLForm builtins should come from registry pack API, not manual default field registration.
- Rule: when upstream exposes a pack/factory for builtin registries, use that source of truth before composing local registries; only fall back to manual registration if no public pack exists.
- User correction: auth landing page called current-user profile even though public auth UI does not need user state.
- Rule: public/login pages must not mount profile/session queries unless they render auth state or redirect from it; keep submit busy state scoped to active auth mutations.
- User correction: removing a query from a page was insufficient because its route wrapper still mounted the query.
- Rule: when stopping a public-page request, trace parent route/layout wrappers too; verify the rendered route branch, not just the leaf component.
- User correction: auth landing refactor accidentally changed the intended typography.
- Rule: when splitting visual components, preserve page-level font families and display/mono font assignments from the original design unless typography change is explicitly requested.

- User correction: invite-user role selector used a hardcoded legacy role list, so newly created roles could not be assigned from invitations.
- Rule: role assignment UI must read role definitions from the role catalog and persist role definition ids; legacy enum roles are fallback compatibility only.

- User correction: admin reset password used browser prompt, exposing password text and giving poor UI.
- Rule: password entry/reset flows must use masked inputs by default with explicit eye-toggle reveal; never collect secrets through browser prompt/plain text UI.
- User correction: bulk upload generated names used upload row index, but names need real DB prediction sequence base.
- Rule: when UI generates persisted auto names that must align with DB ids, fetch authoritative DB sequence/max id from API and use row order only as offset.
- User correction: review prediction detail could not render explanation feedback questionnaire because portal avoided plugin catalog calls and schema stored only `feedbackEnabled`.
- Rule: restricted portals must receive full review metadata from backend-owned/persisted contracts; do not depend on normal app plugin/catalog APIs for isolated review UI.
- User correction: review portal forced users to bounce between history and detail pages.
- Rule: review workflows over multiple selected records need persistent local navigation (rail/aside/drawer) so reviewers can switch records without leaving detail context.
- User correction: review portal showed separate output/explanation questionnaires with custom buttons instead of one native questionnaire flow.
- Rule: when MLForm already owns questionnaire navigation/submission UX, compose steps into one wizard and persist via transport; avoid wrapper-level save/edit controls unless product needs a separate state machine.
- User correction: review route used wrapper pages and combined questionnaire used ids MLForm normalized away.
- Rule: if two routes render the same page, point router directly at the shared page; do not keep pass-through page wrappers.
- Rule: MLForm layout ids must use the same slug-stable ids as runtime schema ids; avoid separators that upstream normalizes differently.
- User correction: review UI put a card inside another card.
- Rule: framed components belong in unframed page regions; never wrap MLForm/card-like surfaces in another visual card.
- User correction: review feedback saved but UI kept showing editable questionnaire, with no staging/submission step.
- Rule: review feedback has workflow state; persist submitted state server-side and derive pending/revision/submitted from backend, not local UI assumptions.
- User correction: original explanation text was hidden from the review detail.
- Rule: feedback forms must keep reviewed artifact visible nearby; when the questionnaire is first, show outputs/explanations/inputs as explicit follow-up accordions.
- User correction: review tray should match provided reference: right-side sticky rail with no outer scroll.
- Rule: sidebar/tray components that group lists should keep the shell fixed/sticky and put overflow only on the grouped list bodies.
- User correction: review tray must carry the full reference affordances, not just grouping.
- Rule: when matching a supplied UI reference, include semantic microcopy, count pills, colored state dots, item status markers, and backend-sourced dates in the first pass.
- User correction: review tray item click flickered back to previous/first prediction.
- Rule: URL params are strings; normalize backend ids at route/selection boundaries before equality checks or navigation.
- User correction: closing one review tray accordion left unused space while the other list still had internal scroll.
- Rule: accordion panels in fixed-height trays must use flex allocation, not static max-heights; closed panels shrink, open panels own remaining scroll space.
- User correction: empty/short open review tray accordion still reserved blank height.
- Rule: use `max-height` for tray/list constraints and natural height for short content; do not use `flex-1` on accordion groups unless content must fill remaining space.
- User correction: review tray height logic was overcomplicated and changed the outer sidebar.
- Rule: when a fixed shell is already accepted, do not alter the shell; constrain only the inner list with natural height plus a max-height overflow rule.
- User correction: if sibling accordion is collapsed/empty/short, the scrolling accordion should use the freed sidebar height.
- Rule: when two lists share a fixed panel, split max scroll height only when both lists actually need it; otherwise let the long list use the full available max.
- User correction: review tray scroll behavior kept regressing because states were not enumerated before implementation.
- Rule: for adaptive panel layouts, write the full state matrix first and visually verify representative states before finalizing CSS/measurement logic.

## 2026-05-15 - External review auth/theme correction
- Correction: review login page drifted from main auth surface and review portal had light-only hardcoded colors.
- Rule: external portal pages must reuse primary auth/page primitives when possible and use theme tokens/dark variants, not hardcoded light surfaces.

## 2026-05-15 - Share review modal correction
- Correction: management modal reused full prediction history table, causing nested boxes and irrelevant status/view/id columns.
- Rule: modal tables must be purpose-built for modal task; do not reuse rich app tables when user only needs selection + minimal metadata.

## 2026-05-15 - Review links list cleanup
- Correction: share modal still exposed generated URL text and revoked links.
- Rule: management surfaces should show only actionable active objects; if copy is the action, don't also print bearer URL unless explicitly requested.

## 2026-05-15 - Export review selection modal
- Rule: when export includes reviewer-level data, expose selection at same granularity as export semantics: whole prediction, reviewer globally, reviewer within one prediction.
- Rule: export UI should summarize collapsed rows and reveal detail only on expansion; avoid dense always-visible review payloads.

## 2026-05-15 - External reviewer legacy-role mapping
- Correction: `External Reviewer` is a locked role definition, not a legacy `OrganizationRole` enum value.
- Rule: when introducing locked system roles outside legacy enums, every persistence path that still writes legacy role fields must map the new system key explicitly and test invite/update flows.
- Correction: same system role metadata was duplicated as strings across seed/auth/invite/change-role tests.
- Rule: system role key/label/slug/legacy-role mapping must live in one domain object; callers reference that object, not copied strings.

## 2026-05-15 - Backend lessons audit
- Correction: global fallback could turn intentional `ResponseStatusException` 4xx responses into generic 500s.
- Rule: catch-all exception handlers must explicitly preserve framework/status exceptions before returning generic 500.
- Correction: prediction feedback completion depended on parsing active plugin source, not persisted schema metadata.
- Rule: backend status/state transitions must use persisted contract metadata as source of truth; plugin/catalog source can enrich writes, not decide historical saved state.

## 2026-05-17 - Crystal Tree regression loop
- Correction: frontend payload narrowing did not fix Crystal Tree because backend still produced the same runtime error.
- Rule: when user reports same error after a fix, build a backend/runtime repro for the exact exception before another frontend-only patch.

## 2026-05-19 - External review permission model
- Correction: external review access was modeled as a special role check instead of an assignable permission.
- Rule: access gates must check effective permissions, not role names/system keys; default roles may carry permissions but must not be the authorization source of truth.
- Correction: external review logout could fall through to normal app login instead of review login.
- Rule: portal-local auth flows must preserve their own route on logout/login transitions when the route owns a distinct unauthenticated surface.
- Correction: explanation feedback steps disappeared when explanation content was missing.
- Rule: questionnaire availability must derive from persisted schema feedback metadata, not from presence of rendered explanation content.
- Correction: review logout still hit protected context and surfaced 401 on the review page.
- Rule: protected portal routes need a dedicated public login route; logout should land on that public route, not on a protected content route.
- Correction: review selection URLs exposed raw prediction ids.
- Correction: reviewed external review detail showed current output even though questionnaire had no active step until Edit.
- Rule: side context panels must reflect active workflow state; when form is idle/read-only, reserve layout space with empty shell instead of showing stale first-step context.
- Rule: externally shared or portal URLs must use opaque selection tokens and resolve ids server-side after token validation.
- Correction: review prediction selection looked like full page reload because global route view transitions animated the whole route.
- Rule: local record switching inside a portal/workspace must opt out of page-level transitions when only detail content changes.
- Correction: feedback questionnaire lacked nearby context for the active output/explanation step.
- Rule: multi-step review forms must keep the artifact under review visible beside the active step, not only in accordions below.
- Correction: publishing active review step on every form value snapshot caused questionnaire rerenders/remount symptoms.
- Rule: external form mounts must publish navigation state only when navigation changes; never mirror every value snapshot into page-level state.
- Correction: page-level active-step state still rerendered the form subtree.
- Rule: sidecar UI for embedded third-party forms should subscribe out-of-band or in a sibling boundary so sidecar updates cannot remount the form.
- Correction: external review draft feedback was treated as completed public feedback before reviewer submitted revision.
- Rule: review draft persistence and public feedback publication are separate states; history/export/status must use submitted review records, while review detail may load draft feedback for resume/edit.

## 2026-05-20 - Invitation create surface correction
- Correction: invite modal felt too small, too rounded, and boxed unnecessarily.
- Rule: for workspace admin CRUD flows, prefer inline page sections over modals when form scope is small and page context helps; avoid nested/framed boxes unless they add real grouping.

## 2026-05-20 - Role form modal correction
- Correction: role form modal made actions depend on page scroll and displayed permissions as a long ungrouped list of cards.
- Rule: permission-heavy modals need fixed header/footer, one internal scroll region, backend-catalog grouping, and flat rows instead of card-per-permission decoration.

## 2026-05-27 - Runtime artifact ownership
- Correction: `.joblib` classification cannot be inferred in frontend because model/dataframe share extension and supported model libraries vary.
- Rule: Python runtime must own uploaded artifact inspection and library-specific model capability detection; frontend/API may route results but must not duplicate model/dataframe business rules.
- Correction: frontend inspect request was called directly from page code instead of using TanStack Query like app requests.
- Rule: frontend API calls from React surfaces must go through feature hooks (`useQuery`/`useMutation`) so request state, retries, and error handling follow app conventions.
- Correction: upload empty state looked passive and dataframe type copy still listed stale non-runtime formats.
- Rule: upload surfaces must accept input wherever the UI invites dropping, and displayed accepted types must match the actual backend-inspected contract.
- Correction: upload bundle actions used clickable text/icons without pointer cursor and a remove tile action labeled only by `X`.
- Rule: visible click targets must expose pointer affordance across nested text/icon children, and destructive/clearing tile actions need explicit text labels when space allows.
- Correction: save-all model upload only saved first model because multipart files were reused across analyzer/storage/signature paths.
- Rule: when a multipart upload is consumed by more than one backend path, buffer it once and pass reusable fresh-stream wrappers; batch UI saves should avoid unnecessary concurrent multipart uploads.
- Correction: saving last unsaved model tile should exit like Save All instead of leaving user on completed upload page.
- Rule: per-item save actions in batch creation flows should follow batch-complete navigation when they complete the remaining work.
- Correction: tile-level model/dataframe selectors also need drag-and-drop, not only click browse.
- Rule: if an upload UI exposes both global and per-item targets, support the same drag/drop affordance at each target and route files through the same validation path.

## 2026-05-22 - MLForm package type correction
- Correction: `mlform@0.1.10` ships its declarations under nested type folders even when root/public exports do not expose every type cleanly.
- Rule: before adding local `.d.ts` shims for a dependency, inspect the package's full `dist/types` tree and prefer direct existing declaration imports or `tsconfig` paths over redeclaring external module APIs.

## 2026-05-22 - Crystal Tree analyzer payload correction
- Correction: Crystal Tree plugin sent MLForm field ids in `serializedFieldValues`, causing analyzer 400 `Missing features`.
- Rule: analyzer-bound explanation plugins must send backend-shaped feature keys from `request.meta.backendFieldValues`; MLForm serialized field ids are UI/runtime ids, not model feature names.
- Correction: Crystal Tree plugin returned `null` from `resolve` when no report payload existed, so MLForm marked the report ready and skipped fetch.
- Rule: MLForm async report plugins must return `undefined` from `resolve` for absent payload; `null` is a real ready payload and prevents `fetch.submit`.
- Correction: MLForm 0.1.11 migration left MLSuite frontend naming around `explanation` even though MLForm now models all such artifacts as reports.
- Rule: after migrating a domain concept into a broader upstream abstraction, rename active files/types/functions/UI copy to the new abstraction in the same patch; keep old terms only at persisted/public compatibility boundaries and mark that boundary explicitly.
- Correction: prediction detail output feedback saved classifier choices as index-like values and showed fragmented feedback cards before context.
- Rule: classifier feedback controls must serialize the backend/prediction mapping value and normalize target updates through that same mapping; prediction detail feedback should mirror external review order with one combined questionnaire first, then outputs, then inputs.
- Correction: saved classifier feedback showed only the stored mapping value, and the Reports context panel still rendered only output targets.
- Rule: display-only questionnaire summaries must resolve option labels from the same schema that collected the answer, and prediction detail report context must include both output reports and generated MLForm report entries.
- Correction: prediction feedback create hit 500 when hidden/draft feedback already existed, and Crystal Tree feedback used the answer payload as report value.
- Rule: create feedback endpoints must be idempotent by prediction/user/order, and report feedback storage must keep generated report content in `value` while human answers live in `realValue`.
- Correction: Crystal Tree text was saved but Reports panel still showed empty because it only read prediction report payload.
- Rule: report display must fall back to saved report feedback `value` when runtime report content is missing; use one shared formatter for runtime and saved report text.
- Correction: Crystal Tree report rendered in MLForm but was absent from saved prediction history/modal because MLSuite detected feedback metadata on raw report configs only, not MLForm report controllers.
- Rule: code that receives MLForm runtime controllers must read app metadata from `controller.config`; raw schema helpers may inspect the object directly, but shared predicates must support both shapes.
- Correction: Crystal Tree plugin exposes formatted canonical text as `explanation`; legacy `explanations[]` is raw backend material.
- Rule: for Crystal Tree payloads, persist/display `explanation` first and use `explanations[]` only as compatibility fallback.
- Correction: external review split generated reports away from outputs and kept stale side context while the wizard step changed.
- Rule: when a review workflow language says outputs, present generated reports as output artifacts in that surface; side context must subscribe to wizard navigation state, not value snapshots.
- Correction: external review saved classifier summary showed numeric raw value instead of backend mapping.
- Rule: saved review summaries for classifier feedback must resolve raw/numeric values through the same questionnaire options used during collection and display mapping-only when requested.
- Correction: prediction-history feedback showed a success toast but stayed on the questionnaire while refetch state lagged behind.
- Rule: after successful questionnaire persistence, close from the confirmed submitted payload; use refetch to reconcile server state, not as the only UI completion trigger.
- Correction: prediction feedback summary displayed `mapping (raw)` when the user expected only the mapping.
- Rule: user-facing classifier feedback summaries must show the selected option label only; raw stored values are persistence detail.
- Correction: prediction-history feedback was treated like review draft feedback when a prediction belonged to a review link.
- Rule: app-owned feedback endpoints must publish immediately; only review portal endpoints should create draft/revision state that requires explicit submit.

## 2026-05-28 - Auto-assignment smoke check correction
- Correction: using model `.predict` as a hard dataframe-match gate broke auto-assignment for count/name-compatible uploads when the sampled row failed due value/type quirks.
- Rule: upload auto-assignment compatibility must be based on stable structural checks first; runtime smoke predictions may annotate diagnostics, but must not veto a structurally compatible single match unless product explicitly requires type-level rejection.

## 2026-06-01 - MLSchema runtime contract correction
- Correction: migrating backend internals to `mlschema` 0.2.0 removed the runtime API wrapper expected by API/frontend and dropped backend-created prediction reports.
- Rule: when upgrading an internal schema library, preserve the service contract consumed by neighboring modules unless the user explicitly requests cross-layer contract migration; use the new library for its owned data and keep locally-owned metadata generation where the app still owns it.

## 2026-06-01 - Schema creation UX correction
- Correction: initial schema create flow exposed raw `formSchema` and binding JSON, but product intent is user selects models and MLSuite derives canonical schema/mappings.
- Rule: organization-level schema UX must hide technical mappings; create/edit surfaces should collect product choices and derive `formSchema`, `inputMapping`, and `outputMapping` internally.
- Correction: after selecting models, schema editor must appear immediately; composed schema is draft user edits, not hidden final artifact.
- Rule: when selections derive a user-editable artifact, seed the editor immediately and persist edited artifact while rebasing hidden technical mappings by stable ids.
- Correction: schema creation should not ask for description, generated schema must include reports, and version creation should reuse create flow instead of raw JSON forms.
- Rule: schema UX has two explicit paths only: create schema with first version, or create new version for an existing schema; never expose binding/schema JSON editors when model selection can derive them.
- Correction: new schema version must not allow changing bound models; model choice and schema editing are separate workflow steps.
- Rule: schema creation should treat model selection as a structural step before editing; version creation must reuse previous version bindings and expose only schema editing.
- Correction: one-hot encoded model fields should collapse into a user-facing `mapped-category` when safe.
- Rule: schema composition should count visible/user-editable fields separately from hidden technical fields, and preserve hidden subordinate mappings for model payload compatibility.
- Correction: schema run form page must fit inside available viewport height.
- Rule: MLForm run/editor pages should use flex `min-h-0` shells with overflow only on the form host, not page-level auto overflow plus fixed min-height.
- Correction: `/schemas/create` exposed new-version controls even when user clicked create new schema, and model selection wasted horizontal/vertical space.
- Rule: create routes should default to the user's explicit intent; alternate flows belong behind explicit entry URLs/actions, while long selection steps need top command bars plus internal scroll and responsive grids.
- Correction: mapped-category one-hot composition sent bad blood-group payloads because visible masters were not explicitly excluded and lossy slug ids could collide for `+`/`-` categories.
- Rule: generated technical field ids must preserve category uniqueness after slugging; visible derivation controls must set `includeInSubmission: false` and only hidden target fields should map to model inputs.
- Correction: schema save failed because composer regenerated canonical ids after one-hot mapping already wrote option mappings.
- Rule: when one generated field references another by id, later canonicalization must preserve those ids or rewrite all references in the same step.
- Correction: `backendKey` was used in new schema flow even though feature labels are exact model feature names.
- Rule: org-level schema flow should treat `id` as internal UI/form identity and `label` as exact model feature key; avoid storing technical key duplicates in `ui`.
- Correction: one-hot conversion ran before merging model schemas, so cross-model one-hot groups could not be detected.
- Rule: schema derivations that depend on combined canonical field set must run after merge; per-model transforms should only handle model-local facts.
- Correction: schema-run report pane missed model outputs because run transport returned `reports: {}` and composer merged reports like fields.
- Rule: org-level schema fields may merge for one user input, but reports are per model binding; schema-run transport must hydrate MLForm `reports` by schema report id before persistence.
- Correction: schema-run save persisted immediately after MLForm submit instead of staging like prediction modal.
- Rule: prediction/run submit and persistence are separate UX states; run MLForm first, review result in modal, then persist on explicit save.
- Correction: schema run modal/history exposed raw JSON and technical one-hot fields instead of user-facing form values.
- Rule: schema-run display must derive visible inputs from the schema snapshot and map technical one-hot values back to the visible control; raw model payload belongs in `PredictionResult.modelInput`, not primary UI.
- Rule: MLForm-rendered report snapshots are not persisted today; history/detail should render report DTOs from saved schema+payload, and exact HTML snapshots require an explicit persisted snapshot contract later.
- Correction: schema-run report cards used analyzer `mapping` labels (`0`/`1`) instead of schema report labels and wrapped each result in redundant Model/Status boxes.
- Rule: report display labels come from persisted schema report config; analyzer output is numeric payload only. Grouping by model is metadata, not primary visual framing unless user asks for it.
# Schema Run Parity
- When adding a parallel schema-run path, audit legacy prediction-history affordances explicitly. Search/export/bulk/share/predict-again are UI/runtime features; review/feedback are backend domain features tied to `Prediction` and need their own schema-run contract before UI parity.
- Predict-again prefill for schema-runs must use schema-aware visible inputs, not raw saved inputs. Mapped-category defaults may need reconstruction from hidden one-hot fields.
- If schema inferences are conceptually parallel to legacy predictions, reuse the legacy page/action layout first. Only diverge when schema-specific domain rules require it.
- Mapped-category predict-again must initialize both visible default and hidden mapped values. MLForm may show selected default without firing option mapping change events.
- Legacy prediction action components cannot be reused blindly for schema runs when their handlers call `predictionId` APIs. Reuse interaction structure; keep schema-specific API adapters.
- Correction: schema bulk/export were simplified like user-facing history/detail, but product intent is model-facing import/export.
- Rule: schema history/detail/modal/review show visible canonical inputs; schema bulk upload and CSV export use exact technical model inputs from `PredictionResult.modelInput`, including one-hot columns.
- Correction: schema plugin reports validated but did not render like signatures because schema transport lacked per-model `meta.modelId/backendUrl/backendFieldValues`.
- Rule: schema-run plugin execution must preserve signature plugin contract per report id; multi-model context belongs in `reportContextById`, not in one global run meta.
- Correction: schema plugin reports still failed because context was created only after payload existed and only descriptor rendering was patched.
- Rule: async MLForm report plugins need per-report context before `fetch.submit`; wrap schema custom report fetch requests as well as descriptor contexts, and create `reportContextById` even when report payload is absent.
- Correction: opening schema save modal remounted MLForm and flushed entered values because effect dependencies used unstable catalog object identity.
- Rule: MLForm host effects must depend on stable catalog fields/status, not composite hook return objects; submit modal state must not unmount the form.
- Correction: schema custom report fetch wrapper tested fake `{ report: { id } }` args, but MLForm uses `{ reportId, config }`, so Crystal Tree still missed `modelId`.
- Rule: custom MLForm wrapper tests must use upstream runtime type shape; patch both `DefinedReportKind.fetch` and inner `definition.fetch`, because registration uses inner report definition.
- Correction: schema form remount could still be triggered by callback identity changes from modal/result state.
- Rule: long-lived MLForm mounts should call latest callbacks through refs; modal/result state handlers must not be effect dependencies.
- Correction: schema predict-again still flushed because prefill inputs were rebuilt from `sourceRun` on render/refetch, changing `formSchema` and remounting MLForm.
- Rule: predict-again prefill is an initial snapshot; freeze it after first source run load and never let query refetch or modal state update remount the form.
- Correction: schema Crystal Tree failures showed report error cards even when only some bound models support explanations.
- Rule: schema multi-model custom report fetch is best-effort per result; unsupported model/report fetch failures should become skipped schema report payloads, not user-facing report errors or save blockers.
- Correction: plugin tests mocked wrapper internals but not the full MLForm `createReportFetchRequest` path.
- Rule: plugin regression tests must exercise `createSchemaRunRuntime -> transport.submit -> createReportFetchRequest -> registry.getReport(kind).fetch(...).submit(...)` with model-specific assertions.
- Correction: schema-level plugin reports added in editor were not bound to schema model bindings, so multi-model runtime had no `reportContextById` and Crystal Tree never called explanations.
- Rule: any schema report not already mapped by `SchemaModelBinding.outputMapping` must be expanded per binding before save/use; plugin policy and output mapping must be updated together.
- Correction: schema save modal reused generic custom-report `describe` and skipped plugin questionnaire persistence.
- Rule: custom report rendering must prefer plugin presenter output, and schema save modal must collect questionnaire feedback before persistence then write it after real `PredictionResult` ids exist.
- Correction: plugin reports generated redundant OUTPUT feedback steps.
- Rule: plugin reports use `feedbackQuestionnaire` as their feedback contract; do not synthesize generic output feedback for custom report kinds.
- Correction: schema custom report execution depended on MLForm report-pane lazy fetch, so multi-model plugin reports could remain unfetched even when model predictions succeeded.
- Rule: schema multi-model custom reports are part of run transport; fetch them best-effort after model fan-out using per-report context and persist only successful payloads.
- Correction: schema plugin tests called transport directly and missed MLForm id normalization (`_` -> `-`), so report contexts were keyed differently from report controllers.
- Rule: plugin/report regression tests must exercise the real MLForm lifecycle (`createForm`, report controllers, `createReportFetchRequest`) and normalize report-id matching against MLForm ids.
- Correction: schema custom report wrapper swallowed all plugin fetch errors, hiding missing model-context bugs as invisible skipped reports.
- Rule: only model-level unsupported report fetches may become skipped payloads; missing schema binding/context is an application bug and must surface as an error.
- Correction: missing custom report context was treated as unbound even when the report was mapped but its model prediction failed first.
- Rule: distinguish absent binding mapping from absent successful result context; unbound is error, mapped-but-no-success-context is skipped report.
- Correction: schema plugin reports still existed but did not render because schema validation discarded parsed custom report config, losing Zod defaults like Crystal Tree `endpoint`.
- Rule: when validating MLForm custom field/report configs, use the parsed schema result as runtime config; `safeParse` is normalization, not only validation.
- Correction: mapped schema plugin reports stayed invisible when stale `pluginPolicy.reportKinds` lacked the plugin kind even though `outputMapping` bound the report to a model.
- Rule: schema report execution must use `SchemaModelBinding.outputMapping` as source of truth; plugin policy metadata must not be a second runtime blocker for already-mapped reports.
- Correction: schema custom report prefetch could depend on wrapper-injected meta and miss calls when context was absent from `built.reportContextById`.
- Rule: schema transport prefetch must derive per-report context from `outputMapping + successful result` and send `modelId/backendFieldValues` directly to plugin fetch requests.
- Correction: repeated schema plugin fixes passed synthetic tests while browser still showed no explanation calls.
- Rule: when a plugin bug persists after contract tests pass, add temporary end-to-end browser-path instrumentation with one stable prefix before adding more bypasses.
- Correction: schema plugin context used numeric model ids from real DTOs while custom-report fetch required string ids, causing mapped reports to skip despite valid context.
- Rule: frontend boundaries that consume backend DTO ids must normalize ids at comparison/plugin-call boundaries; tests need numeric-id cases when production DTOs use numbers.
- Correction: plugin reports that fail on unsupported model types should disappear with their questionnaire, not show error/empty review.
- Rule: schema plugin reports are best-effort per model binding; skipped payloads are internal control state and must not produce UI reports, feedback steps, exports, or save blockers.
- Correction: modal/history can persist plugin placeholder payloads that are not explicit skipped sentinels.
- Rule: schema custom reports need a display-level renderability guard; empty payloads must be hidden before reports/feedback/export consume them.
- Correction: schema detail could allow partial feedback save while history required all fields for completed.
- Rule: if completion requires every questionnaire field, the completion-context form must mark every field required; optional/partial behavior belongs only to save-modal draft persistence.
- Correction: schema CSV feedback columns drifted from signature export naming.
- Rule: schema-run export must reuse signature-style column semantics: `output.<reportId>.predicted`, `output.<reportId>.feedback.<reviewer>`, `report.<reportId>.content`, and `report.<reportId>.<fieldId>.<reviewer>`.
- Correction: hiding the save-modal questionnaire footer removed wizard navigation.
- Rule: optional save-modal feedback must keep MLForm wizard navigation visible; disable/ignore questionnaire submit instead of hiding the whole actions footer.
- Correction: schema external review looked like a separate product from signature review.
- Rule: schema and signature external review must share the same shell/tray/accordion structure; schema-specific data should adapt into shared review primitives.
- Correction: schema external review side context showed empty generic content and lost classifier percentages.
- Rule: review side context and output accordions must derive from normalized runtime payload, preserving prediction labels plus flat or nested probability arrays.
- Correction: long schema input names overlapped values in external review.
- Rule: review input rows must be min-width-safe and wrap technical field names; fixed label columns are unsafe for schema/model feature keys.
- Correction: schema external review showed technical one-hot model inputs instead of user-visible schema inputs.
- Rule: schema review/history/detail input displays must use schema visible-input reconstruction, including mapped-category one-hot reverse mapping, never raw `PredictionResult.modelInput`.
- Correction: schema creation implied model selection but product needed signature selection per model.
- Rule: schema creation binds model + signature, not model alone; default may be latest semver, but UI must expose the exact signature because reports/plugins live on signatures.
- Correction: one-hot mapped-category select values regressed because labels and submit values were treated as the same thing.
- Rule: mapped-category display may use option labels, but runtime submit/predict-again prefill must normalize through option value; expansion must accept both label and value.
- Correction: schema bulk upload saved rows but history did not refresh until full browser reload.
- Rule: bulk creation flows must update the exact visible list query cache with returned records, then invalidate for reconciliation; route id and DTO id shapes must be normalized before query-key use.
- Correction: schema one-hot mapped-category still showed `N/A`/`undefined` and predict-again stayed unselected when saved model inputs stored one-hot values as string `0`/`1`.
- Rule: mapped-category reconstruction from hidden one-hot fields must compare backend scalar values by normalized value, not strict JS type identity; display, external review, and predict-again must share that comparator.
- Correction: previous one-hot fix still failed because empty saved visible master values (`null`/`""`) masked valid hidden one-hot model inputs.
- Rule: mapped-category display/prefill must treat empty direct master values as absent and reconstruct from hidden mapping values before showing `N/A`/`undefined`.
- Correction: schema bulk upload used `0` as auto-name base and generated names unrelated to persisted inference ids.
- Rule: every bulk upload path that omits `name` must fetch the authoritative persisted sequence/max id for that same domain before parsing rows; never hardcode `0` as a base.
- Correction: mapped-category reconstruction still missed real one-hot payloads because saved inputs may be boolean or sparse active-only values.
- Rule: one-hot reverse mapping must accept numeric, string, boolean, and sparse active target shapes; tests need all real shapes before declaring display/prefill fixed.
- Correction: schema bulk upload broke after editing schema labels because upload columns followed user-facing MLForm labels.
- Rule: schema labels are UX copy and may change; bulk/model-facing imports must use signature/dataframe feature keys from `inputMapping`, then map back to stable field ids before MLForm/runtime submission.
- Correction: schema bulk upload saved technical CSV keys into `PredictionRun.inputData`, so display and predict-again failed after label edits.
- Rule: bulk upload may parse technical signature columns, but persisted schema-run `inputData` must use the same visible `raw.inputData` shape as manual runs; technical model payload belongs in `PredictionResult.modelInput`.
- Correction: schema bulk upload still rejected technical headers like `rec_uci_hours` when fallback parser columns used edited/display labels like `REC_UCI_HOURS`.
- Rule: schema bulk parser columns must come from explicit model mappings or stable technical field ids before editable labels; labels are display copy and cannot be the only accepted upload key.
- Correction: schema bulk-saved runs with edited labels still displayed `N/A` when the saved/merged payload only had technical model keys.
- Rule: schema display and predict-again prefill must read visible label first, then stable field id/model key fallback from merged `modelInput`; persisted visible `inputData` is preferred but not guaranteed for older/bulk paths.
- Correction: schema bulk mapping fixes lacked broad label mutation coverage.
- Rule: schema bulk tests must cover label case changes, accents, spaces, and symbols across parse, serialization, saved visible input, display, and predict-again prefill in one regression matrix.
- Correction: schema bulk/display still showed `N/A` for edited labels when saved or merged payloads used technical keys.
- Rule: schema display and predict-again prefill must prefer visible label, then fall back to stable field id or mapped model key; do not derive fallback keys by transforming labels.
- Correction: schema bulk transport could run only a subset of mapped reports when edited labels left stale `inputMapping` keys in model bindings.
- Rule: schema transport must build model input from exact field ids and mapped model keys; multi-model bulk regressions must assert every binding succeeds and every mapped report is hydrated.
- Correction: normalized label aliases overcomplicated schema bulk mapping and broke lowercase/special-character cases.
- Rule: schema bulk/model paths must not slug, uppercase, lowercase, or deaccent labels/headers at runtime; CSV uses exact model feature names, MLForm uses exact field ids, labels are display-only.
- Correction: first schema algorithm move missed smaller pure helpers in `src/schemas` after moving the obvious merge/one-hot/display/bulk/export files.
- Rule: before claiming frontend algorithms were moved, audit all non-hook/non-API/non-type exports in the feature folder and classify each as algorithm, wiring, UI, or contract.
- Correction: after moving non-schema algorithms, tests still imported old feature-folder paths because only app source was typechecked first.
- Rule: broad frontend algorithm moves must include `frontend/test` import rewrites and full `vp test`; TypeScript app build alone does not cover test import paths.
- Correction: broad string-based import replacement produced invalid paths during the move.
- Rule: use computed relative-path rewrites from old absolute module location to new location; do not apply broad textual replacements across unrelated specifiers.
- Correction: "all frontend algorithms" also included plugin source runtime, catalog detection/loading helpers, built-in registry helpers, and schema run runtime mapping, not only obvious schema/model helpers.
- Rule: before claiming "all algorithms moved", audit every exported non-UI/non-hook/non-API frontend module and every local pure helper inside runtime files; classify leftovers explicitly as wiring, UI, API, hook, type, atom, or config.
- Correction: moving algorithms to `src/algorithms` was not enough; vague folder names and undocumented exports still left the architecture hard to navigate.
- Rule: every frontend algorithm export and named internal helper needs TSDoc with purpose, params, return, throws, and side cases/effects; vague folders like `run-runtime` must be renamed to a domain action/name such as `runtime-assembly`.
- Correction: schema-review and review were the same frontend domain, but keeping both folders split ownership and made architecture misleading.
- Rule: when two frontend feature names represent one workflow, fuse UI, API, algorithms, routes, and tests under one domain folder; keep old backend endpoint names only when they are real server contracts.
- Correction: notification count was described as a user badge, but intended placement was specifically on the avatar.
- Rule: when placing user-notification counts in navigation, attach the numeric marker to the avatar itself, not a generic user/menu badge.
