# Lessons

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
- Rule: externally shared or portal URLs must use opaque selection tokens and resolve ids server-side after token validation.
- Correction: review prediction selection looked like full page reload because global route view transitions animated the whole route.
- Rule: local record switching inside a portal/workspace must opt out of page-level transitions when only detail content changes.
- Correction: feedback questionnaire lacked nearby context for the active output/explanation step.
- Rule: multi-step review forms must keep the artifact under review visible beside the active step, not only in accordions below.
