# Config Hardcode Removal Plan

## Backend Lessons Audit

### Goal
- [x] Audit backend for patterns already captured in `tasks/lessons.md`.
- [x] Prioritize source-of-truth, hardcoded role/plugin assumptions, review-link auth scope, placeholder data, and legacy compatibility leaks.
- [x] Report findings with file/line refs.

### Plan
- [x] Scan backend for duplicated system-role strings and enum `valueOf` role paths.
- [x] Scan review APIs for current-org vs token-org leaks and generic error handling.
- [x] Scan persisted explanation/feedback metadata paths for legacy fallback or frontend-only source assumptions.
- [x] Scan admin/dashboard/infra contracts for placeholder or misleading metrics.
- [x] Read candidate files and produce review findings.

### Review
- Status: fixed two backend regressions; one residual risk reported.
- Fixed global `ResponseStatusException` handling so review/access errors keep 4xx status instead of falling to generic 500.
- Fixed prediction feedback status source-of-truth: no more plugin source parsing or active-catalog dependency; status uses persisted signature metadata.
- Replaced remaining hardcoded owner role string in workspace auth with `OrganizationRole.OWNER.name()`.
- Residual risk: org/team quota DTO fields still expose `quotaUsed` as hardcoded zero without a usage source.
- Verification:
  - `mvn -q "-Dtest=PredictionFeedbackStatusResolverTest,DomainExceptionHandlerTest,InvitationManagementServiceTest,OrganizationManagementServiceTest,WorkspaceAuthorizationServiceTest,ReviewLinkServiceTest" test` ✅
  - `mvn -q "-Dmaven.test.skip=true" package` ✅
  - touched line cap ✅ all touched Java files <=300.
  - `git diff --check` ✅ no whitespace errors; CRLF warnings only.

## Review Tray Scroll State Matrix

### States to support
- [x] A. Revision collapsed, Pending collapsed: both section headers at top, no list bodies, no internal scroll.
- [x] B. Revision open empty, Pending open empty: both headers only, no blank list area.
- [x] C. One open short, sibling collapsed/empty/short: open section list uses natural item height only, no scroll.
- [x] D. One open long, sibling collapsed/empty/short: long section expands into available sidebar space, scroll only after using freed space.
- [x] E. Both open short: both lists use natural item height, no scroll, remaining space stays below sections.
- [x] F. One open short, other open long: short list natural, long list gets all remaining height, scroll only if still needed.
- [x] G. Both open long: available list space split between both, both may scroll internally.
- [x] H. Items move between pending/revision: layout recomputes after DOM/content change.
- [x] I. Viewport resize: layout recomputes and still obeys same rules.

### Plan
- [x] Phase 1. Remove count heuristic and static half/full max-height guess.
- [x] Phase 2. Add DOM-measured tray layout hook: measure tray body height, section chrome height, list natural scroll heights.
- [x] Phase 3. Allocate list max-heights:
  - collapsed/empty list = 0.
  - if natural heights fit available list space: use natural heights.
  - if one list overflows and sibling fits: sibling natural, overflowing list gets all remaining.
  - if both overflow: split available after required minimums.
- [x] Phase 4. Wire measured heights into section list bodies only; do not change outer sidebar shell.
- [x] Phase 5. Build a visual harness covering states A-I.
- [x] Phase 6. Use Playwright screenshots to verify no blank reserved list space and scroll appears only when needed.
- [x] Phase 7. Run normal build/react-doctor/diff/graph.

### Review
- Status: fixed.
- Replaced count heuristic with DOM measurement.
- `useReviewTrayLayout` measures body height, section chrome, and each list's natural `scrollHeight`.
- Allocation rules now match state matrix:
  - collapsed/empty = no list body.
  - short lists = natural height, no scroll.
  - one long + sibling short/collapsed/empty = long list gets remaining available height.
  - both long = available height split.
- Visual verification:
  - Created temporary harness with scenarios A-I.
  - Ran Playwright desktop screenshots at 1300x980.
  - Reviewed key states: both collapsed/empty, short+long, both long, collapsed+long.
  - Removed harness/screenshots after verification.
  - Attempted Playwright DOM metric test; blocked because temporary `npx playwright` CLI could not resolve `@playwright/test` from repo context.
- Verification:
  - `vp run build` ✅ warnings only: existing runtime-config non-module script and large chunks.
  - `npx react-doctor@latest --verbose` ✅ score 99; existing unused admin exports/AuthHero heading warnings.
  - touched source line-cap check ✅ no touched source file over 300 lines.
  - `git diff --check` ✅ no whitespace errors; existing CRLF warnings only.
  - `graphify update .` ✅ graph updated; `graph.html` skipped because graph has 5154 nodes over viz limit.

## Review Tray Shared Scroll Space

### Goal
- [x] Outer sidebar stays fixed.
- [x] Long section expands when sibling is collapsed, empty, or short.
- [x] Two long sections split scroll space.

### Plan
- [x] Phase 1. Detect whether each open section needs shared scroll space.
- [x] Phase 2. Give full list max-height unless both sections need scroll.
- [x] Phase 3. Verify build/react-doctor/graph.

### Review
- Status: fixed.
- Outer sidebar unchanged.
- If only one list needs scroll, it gets full available list max-height.
- If both lists are long, each gets half max-height.
- Short/collapsed/empty sibling no longer wastes scroll capacity.
- Verification:
  - `vp run build` ✅ warnings only: existing runtime-config non-module script and large chunks.
  - `npx react-doctor@latest --verbose` ✅ score 99; existing unused admin exports/AuthHero heading warnings.
  - touched source line-cap check ✅ no touched source file over 300 lines.
  - `git diff --check` ✅ no whitespace errors; existing CRLF warnings only.
  - `graphify update .` ✅ graph updated; `graph.html` skipped because graph has 5069 nodes over viz limit.

## Review Tray Simple Section Height

### Goal
- [x] Sidebar outer shell unchanged.
- [x] Collapsed section height equals header only.
- [x] Open short section uses natural list height.
- [x] Open long section scrolls after half-tray max.

### Plan
- [x] Phase 1. Restore outer tray fixed height behavior.
- [x] Phase 2. Keep accordion sections non-flex natural height.
- [x] Phase 3. Set list max-height to half available tray height.
- [x] Phase 4. Verify build/react-doctor/graph.

### Review
- Status: fixed.
- Reverted outer tray to fixed sticky height; only section/list behavior changed.
- Sections stay natural height; collapsed section is header only.
- Open section list grows with content until half-tray max, then scrolls internally.
- Verification:
  - `vp run build` ✅ warnings only: existing runtime-config non-module script and large chunks.
  - `npx react-doctor@latest --verbose` ✅ score 99; existing unused admin exports/AuthHero heading warnings.
  - touched source line-cap check ✅ no touched source file over 300 lines.
  - `git diff --check` ✅ no whitespace errors; existing CRLF warnings only.
  - `graphify update .` ✅ graph updated; `graph.html` skipped because graph has 5002 nodes over viz limit.

## Review Tray Natural Height

### Goal
- [x] Empty open accordion does not reserve blank height.
- [x] Short lists use natural content height.
- [x] Long lists still scroll internally.

### Plan
- [x] Phase 1. Replace fixed tray height with max-height.
- [x] Phase 2. Remove flex-fill behavior from accordion groups.
- [x] Phase 3. Render list body only when open and non-empty.
- [x] Phase 4. Verify build/react-doctor/graph.

### Review
- Status: fixed.
- Tray now uses `max-height`, not fixed `height`, so it shrinks to real content when content is short.
- Accordion groups no longer use `flex-1`; empty open groups render no list body.
- Long lists still get internal scroll via list `max-height`.
- Verification:
  - `vp run build` ✅ warnings only: existing runtime-config non-module script and large chunks.
  - `npx react-doctor@latest --verbose` ✅ score 99; existing unused admin exports/AuthHero heading warnings.
  - touched source line-cap check ✅ no touched source file over 300 lines.
  - `git diff --check` ✅ no whitespace errors; existing CRLF warnings only.
  - `graphify update .` ✅

## Review Tray Pending Active Color

### Goal
- [x] Pending selected row uses light orange.
- [x] Revision selected row keeps light green.

### Plan
- [x] Phase 1. Derive active row background from row tone.
- [x] Phase 2. Verify build/react-doctor/graph.

### Review
- Status: fixed.
- Pending active row now uses light orange `#fff7ed`.
- Revision active row keeps light green `#eaf8ef`.
- Verification:
  - `vp run build` ✅ warnings only: existing runtime-config non-module script and large chunks.
  - `npx react-doctor@latest --verbose` ✅ score 99; existing unused admin exports/AuthHero heading warnings.
  - touched source line-cap check ✅ row file 39 lines.
  - `git diff --check` ✅ no whitespace errors; existing CRLF warnings only.
  - `graphify update .` ✅

## Review Tray Compact Scale

### Goal
- [x] Keep current tray layout.
- [x] Reduce text/button/icon/pill scale.
- [x] Preserve readability and reference hierarchy.

### Plan
- [x] Phase 1. Compact tray header, CTA, icon, section controls.
- [x] Phase 2. Compact row typography and padding.
- [x] Phase 3. Verify build/react-doctor/line caps/graph.

### Review
- Status: fixed.
- Reduced tray padding, header, helper copy, send button, icon box, section titles, count pills, chevrons, row text, row padding, and status dots.
- Layout/accordion behavior unchanged.
- Verification:
  - `vp run build` ✅ warnings only: existing runtime-config non-module script and large chunks.
  - `npx react-doctor@latest --verbose` ✅ score 99; existing unused admin exports/AuthHero heading warnings.
  - touched source line-cap check ✅ no touched source file over 300 lines.
  - `git diff --check` ✅ no whitespace errors; existing CRLF warnings only.
  - `graphify update .` ✅

## Review Tray Accordion Height

### Goal
- [x] Closed accordion does not reserve list height.
- [x] Open accordion uses remaining tray space.
- [x] Internal scroll appears only when open list content exceeds available space.

### Plan
- [x] Phase 1. Make tray body a flex column with fixed shell height.
- [x] Phase 2. Make open groups flex and closed groups shrink to header height.
- [x] Phase 3. Remove static half-height max from list body.
- [x] Phase 4. Verify build/react-doctor/line caps/graph.

### Review
- Status: fixed.
- Removed static per-accordion max height.
- Tray body now uses flex layout; open groups fill available height, closed groups shrink to header only.
- List scroll stays inside the open list body and only appears when content overflows that allocated space.
- Verification:
  - `vp run build` ✅ warnings only: existing runtime-config non-module script and large chunks.
  - `npx react-doctor@latest --verbose` ✅ score 99; existing unused admin exports/AuthHero heading warnings.
  - touched source line-cap check ✅ no touched source file over 300 lines.
  - `git diff --check` ✅ no whitespace errors; existing CRLF warnings only.
  - `graphify update .` ✅

## Review Tray Selection Flicker

### Goal
- [x] Sidebar click keeps selected prediction in center panel.
- [x] Route validation handles backend numeric ids and URL string params.
- [x] Regression test locks id normalization.

### Plan
- [x] Phase 1. Add review id normalization helper.
- [x] Phase 2. Use helper in workspace selection, route guard, rail active state, submit ids.
- [x] Phase 3. Add regression test for numeric backend id vs string URL param.
- [x] Phase 4. Verify focused tests/build/graph.

### Review
- Status: fixed.
- Cause: backend serializes prediction ids as numbers, URL params are strings, so route guard rejected clicked id and navigated back to first item.
- Added shared id normalization for review selection, active state, default selection, route guard, row click, and submit ids.
- Verification:
  - `vp test test/review-link-service.test.ts` ✅ 3 tests.
  - `vp run build` ✅ warnings only: existing runtime-config non-module script and large chunks.
  - `npx react-doctor@latest --verbose` ✅ score 99; existing unused admin exports/AuthHero heading warnings.
  - touched source line-cap check ✅ no touched source file over 300 lines.
  - `git diff --check` ✅ no whitespace errors; existing CRLF warnings only.
  - `graphify update .` ✅

## Review Tray Reference Detail

### Goal
- [x] Match reference tray structure: dots, group subtitles, count pills, chevrons, item status dots.
- [x] Show entered revision/pending date per item.
- [x] Keep data backend-sourced.

### Plan
- [x] Phase 1. Add `stateEnteredAt` to review context items.
- [x] Phase 2. Compute pending date from prediction created date and revision date from own feedback timestamps.
- [x] Phase 3. Restyle tray to match reference and add collapsible groups.
- [x] Phase 4. Verify tests/build/react-doctor/graph.

### Review
- Status: fixed.
- Review tray now matches the provided reference structure: header microcopy, send button, colored section dots, count pills, chevrons, item status dots, and active revision highlight.
- Review context now sends `stateEnteredAt`; pending uses prediction creation time, revision uses the first own feedback creation time.
- Tray shell stays sticky/right with hidden outer overflow; each accordion list owns its own scroll.
- Verification:
  - `mvn -q -Dtest=ReviewLinkServiceTest test` ✅ warnings only from Lombok/Unsafe.
  - `vp test test/review-link-service.test.ts` ✅ 1 file / 2 tests.
  - `vp run build` ✅ warnings only: existing runtime-config non-module script, plugin timings, large chunks.
  - `npx react-doctor@latest --verbose` ✅ score 99; existing warnings for unused admin exports and `AuthHero` heading weight.
  - touched source line-cap check ✅ no touched source files over 300 lines.
  - `git diff --check` ✅ no whitespace errors; existing CRLF warnings only.
  - `graphify update .` ✅

## Review Tray Right Sticky Layout

### Goal
- [x] Move review tray to right side.
- [x] Keep tray sticky.
- [x] Remove tray-level scroll.
- [x] Keep scroll only inside Pending/Revision lists.

### Plan
- [x] Phase 1. Swap workspace grid order/columns.
- [x] Phase 2. Change tray CSS: sticky shell, fixed viewport height, internal list scroll.
- [x] Phase 3. Verify build/react-doctor/line caps/graph.

### Review
- Status: fixed.
- Review workspace now renders detail first and review tray as right column.
- Tray is sticky on desktop with fixed viewport height and no tray-level scroll.
- Pending and Revision item lists have their own internal scroll regions.
- Verification:
  - `vp run build` ✅ warnings only: existing runtime-config non-module script, plugin timings, large chunks
  - `npx react-doctor@latest --verbose` ✅ 99/100; existing warnings only
  - line caps ✅ touched files <=300 lines
  - `git diff --check` ✅ CRLF warnings only
  - `graphify update .` ✅

## Review Portal Staging Flow

### Goal
- [x] After feedback save, show saved answers with edit button instead of live questionnaire.
- [x] Show original explanation content in review page.
- [x] Put questionnaire first, then accordions: outputs, explanations, inputs.
- [x] Add pending/revision tray; saved feedback moves prediction to revision; submitted items disappear.
- [x] Avoid nested cards, extra boxes, and heavy rounding.

### Plan
- [x] Phase 1. Add backend submitted state per review link prediction and reviewer.
- [x] Phase 2. Extend review context/detail DTOs and submit endpoint.
- [x] Phase 3. Refactor review UI layout/order and rail/tray state.
- [x] Phase 4. Add saved answer summary + edit mode for questionnaire.
- [x] Phase 5. Update tests, verify backend/frontend, graph, lessons.

### Review
- Status: fixed.
- Added persisted `ReviewLinkPredictionSubmission`, scoped by review link prediction + reviewer.
- Review context now returns only not-submitted items with `PENDING`/`REVISION` state.
- Saved feedback moves item to Revision tray; Send revision persists submitted state and removes items from tray/detail navigation.
- Questionnaire is first. Saved answers render read-only with Edit button; edit reopens MLForm wizard.
- Outputs, explanations, and inputs moved below as flat accordions. Explanations show original explanation text.
- UI removes extra metric box/card nesting and squares review questionnaire chrome.
- Verification:
  - `mvn -q -Dtest=ReviewLinkServiceTest test` ✅
  - `mvn -q "-Dmaven.test.skip=true" package` ✅
  - `vp test test/explanation-feedback.test.ts test/review-link-service.test.ts` ✅ 7 tests
  - `vp run build` ✅ warnings only: existing runtime-config non-module script and large chunks
  - `npx react-doctor@latest --verbose` ✅ 99/100; existing warnings only
  - line caps ✅ touched source/test files <=300 lines
  - `git diff --check` ✅ CRLF warnings only
  - `graphify update .` ✅
  - `vp check` ❌ blocked by existing formatting backlog in 515 files, mostly `dist/`

## Review Portal Router And Wizard Repair

### Goal
- [x] Route review paths directly to workspace page, no wrapper pages.
- [x] Fix combined questionnaire field ids so MLForm schema and layout match.
- [x] Remove card-inside-card around review questionnaire.

### Plan
- [x] Phase 1. Replace review route wrapper page imports with direct `ReviewWorkspacePage`.
- [x] Phase 2. Make combined questionnaire step fields keep source ids; prefix only step id to avoid layout mismatch.
- [x] Phase 3. Remove outer `AppPanel` around embedded MLForm questionnaire.
- [x] Phase 4. Update tests, verify build/checks, update lessons.

### Review
- Status: fixed.
- Removed `ReviewHistoryPage` and `ReviewPredictionDetailPage` wrappers; router now points both review paths directly to `ReviewWorkspacePage`.
- Root cause: combined questionnaire used `__` in field ids, but MLForm normalizes explicit ids through its slugger; schema id became hyphenated while layout still referenced underscore id.
- Combined questionnaire now uses slug-stable hyphen ids, so MLForm schema/layout agree.
- Removed review detail outer card and questionnaire `AppPanel`, avoiding card-inside-card nesting.
- Verification:
  - `vp test test/explanation-feedback.test.ts` ✅ 5 tests
  - `vp run build` ✅ warnings only: existing runtime-config non-module script and large chunks
  - `npx react-doctor@latest --verbose` ✅ 99/100; existing warnings only
  - line caps ✅ touched source/test files <=300 lines
  - `git diff --check` ✅ CRLF warnings only
  - `graphify update .` ✅
  - `vp check` ❌ blocked by existing formatting backlog in 508 files, mostly `dist/`

## Review Portal Combined Questionnaire

### Goal
- [x] Replace separate review output/explanation questionnaires with one wizard.
- [x] Step order: all outputs, then all explanations.
- [x] Each step shows prediction result/explanation context.
- [x] Use MLForm questionnaire controls, not custom save/edit buttons.

### Plan
- [x] Phase 1. Build combined review questionnaire component with MLForm wizard transport saving through review APIs.
- [x] Phase 2. Replace separate review output/explanation cards in detail panel.
- [x] Phase 3. Add focused tests for combined step/value mapping.
- [x] Phase 4. Verify tests/build/line caps/graph and document review.

### Review
- Status: fixed.
- Review prediction detail now renders one MLForm wizard: output steps first, then explanation steps.
- Each step title/description includes the result or explanation being reviewed.
- Save/edit custom cards were removed from the review flow; submit is handled by MLForm's own controls through a review API transport.
- Verification:
  - `vp test test/explanation-feedback.test.ts` ✅ 5 tests
  - `vp run build` ✅ warnings only: existing runtime-config non-module script and large chunks
  - `npx react-doctor@latest --verbose` ✅ 99/100; existing warnings only
  - line caps ✅ touched review/model/test files <=300 lines
  - `git diff --check` ✅ CRLF warnings only
  - `graphify update .` ✅
  - `vp check` ❌ blocked by existing formatting backlog in 508 files, mostly `dist/`

## Review Portal Single Page And Questionnaire Fix

### Goal
- [x] Make review portal one page with prediction sidebar/drawer navigation.
- [x] Remove back-and-forth detail/history flow.
- [x] Make explanation questionnaire editable in review portal when normal prediction detail can detect it.

### Plan
- [x] Phase 1. Split review portal into shared workspace page + sidebar/detail components under line cap.
- [x] Phase 2. Route both `/review/:token` and `/review/:token/predictions/:predictionId` to same workspace page.
- [x] Phase 3. Add questionnaire fallback path for review detail: embedded schema first, active plugin catalog fallback, metadata fallback for old schemas.
- [x] Phase 4. Update/add tests and run build/check/line caps/graph.

### Review
- Status: fixed.
- Review portal now uses `ReviewWorkspacePage` for both `/review/:token` and `/review/:token/predictions/:predictionId`.
- Prediction list is persistent `ReviewPredictionRail`: horizontal drawer on small screens, sticky left rail on desktop.
- Detail no longer shows “Back to review history”; selected prediction changes from rail.
- Review detail now tries embedded questionnaire metadata, active plugin catalog fallback, then old-schema `feedbackEnabled` fallback with editable Clarity/Usefulness/Trust questionnaire.
- Verification:
  - `vp test test/explanation-feedback.test.ts` ✅ 3 tests
  - `vp run build` ✅ warnings only: existing runtime-config non-module script and large chunks
  - `npx react-doctor@latest --verbose` ✅ 99/100; existing warnings only
  - line caps ✅ touched review/explanation files <=300 lines
  - `git diff --check` ✅ CRLF warnings only
  - `graphify update .` ✅
  - `vp check` ❌ blocked by existing formatting backlog in 505 files, mostly `dist/`

## Explanation Feedback Questionnaire Detection Fix

### Goal
- [x] Detect plugin `feedbackQuestionnaire` on prediction detail explanation cards.
- [x] Preserve existing prediction/review feedback behavior.
- [x] Keep touched files <=300 lines.

### Plan
- [x] Phase 1. Reproduce with focused extraction/helper test or harness.
- [x] Phase 2. Trace explanation descriptor creation and plugin definition lookup.
- [x] Phase 3. Apply minimal fix at metadata/lookup boundary.
- [x] Phase 4. Verify focused tests/build/line caps/graph and document review.

### Review
- Status: fixed.
- Root cause: restricted review detail called `extractPredictionExplanationEntries(..., [])` to avoid normal plugin catalog APIs, while saved schema only stored `feedbackEnabled`; no questionnaire schema reached the portal.
- `applyExplanationFeedbackMetadata` now persists `feedbackQuestionnaire` on matching schema explanations when saving schema versions.
- `extractPredictionExplanationEntries` now reads embedded questionnaire metadata from schema and has a raw-schema fallback when plugin catalog validation is unavailable.
- Verification:
  - `vp test test/explanation-feedback.test.ts` ✅ 2 tests
  - `vp run build` ✅ warnings only: existing runtime-config non-module script and large chunks
  - `npx react-doctor@latest --verbose` ✅ 99/100; existing warnings only
  - line caps ✅ `signature-feedback-metadata.ts` 47, `explanation-feedback-utils.ts` 234, `explanation-feedback.test.ts` 76
  - `git diff --check` ✅ CRLF warnings only
  - `graphify update .` ✅
  - `vp check` ❌ blocked by existing formatting backlog in 499 files, mostly `dist/`
- Note: existing schemas saved before this fix only have `feedbackEnabled`; resave schema with plugin active to embed the questionnaire.

## External Review Links For Prediction Feedback

### Goal
- [x] Add encrypted, expiring, revocable review links scoped to selected predictions.
- [x] Add locked `External Reviewer` role and `MANAGE_REVIEW_LINKS` permission.
- [x] Add restricted review portal outside normal app shell.
- [x] Let owner/admin share visible schema history predictions and revoke links.

### Plan
- [x] Phase 1. Backend RBAC/role seed: permission, workspace DTOs, role catalog, legacy mapper, locked reviewer seed.
- [x] Phase 2. Backend review link persistence/token/API/service with selected prediction validation and current-user feedback scope.
- [x] Phase 3. Backend tests for link create/access/revoke/detail/feedback.
- [x] Phase 4. Frontend permission types and review-link API hooks.
- [x] Phase 5. Split schema detail history/share UI before edits; add selection modal and revoke list.
- [x] Phase 6. Add review routes outside app shell with local login and restricted history/detail.
- [x] Phase 7. Frontend tests and required verification commands, line caps, diff check, graph update.

### Acceptance
- [x] Token alone never grants access; auth + org membership + selected prediction scope enforced by backend.
- [x] External reviewer sees no normal app shell/nav/org switcher/create/export/bulk/predict-again controls.
- [x] Review portal feedback lists and writes only current user's feedback.
- [x] Owner/admin preview works through same restricted portal.
- [x] Touched source files stay <=300 lines.

### Review
- Status: implemented.
- Added `MANAGE_REVIEW_LINKS`, workspace permission exposure, role catalog entry, and locked seeded `External Reviewer` role.
- Added review-link persistence, AES-GCM token crypto, token hash lookup, revoke/expiry checks, org-membership checks, selected-prediction checks, and review feedback create/update endpoints scoped to current user.
- Added `/review/:token` and `/review/:token/predictions/:predictionId` outside the normal app shell with local login, compact review shell, restricted prediction history/detail, and review API feedback writes.
- Split schema history UI into `SignatureHistorySection`, `ReviewLinkButton`, and `ReviewLinkDialog`; owners/admins can select visible rows, set expiry, generate a URL, copy it, list links, and revoke.
- Added backend service/RBAC tests for create, validation, token rejection, external reviewer access, unrelated member denial, selected-prediction detail, and current-user feedback writes.
- Added frontend review API tests for link generation body and token-scoped feedback endpoints.
- Verification:
  - `mvn -q "-Dtest=ReviewLinkServiceTest,WorkspaceAuthorizationServiceTest" test` from `api/` ✅
  - `vp test test/review-link-service.test.ts` from `frontend/` ✅
  - `mvn -q "-Dmaven.test.skip=true" package` from `api/` ✅
  - `vp run build` from `frontend/` ✅ warnings only: existing runtime-config non-module script and large chunks
  - `npx react-doctor@latest --verbose` ✅ 99/100; remaining warnings pre-existing infra unused exports and auth hero bold heading
  - `vp check` ❌ blocked by existing formatting backlog in 494 files, mostly `dist/`
  - touched file line caps ✅ all touched/new source files <=300 lines
  - `git diff --check` ✅ CRLF warnings only
  - `graphify update .` ✅
- Remaining test gap: no browser route/component tests for the review portal shell.

## Prediction Export Feedback Columns

### Goal
- [x] Export prediction `name`, not prediction `id`.
- [x] Remove standalone `reviewer` column.
- [x] Put reviewer email in feedback column names, e.g. `output.<key>.feedback.<email>`.

### Plan
- [x] Phase 1. Update export header/row construction.
- [x] Phase 2. Add focused export helper test coverage if helper boundary exists; otherwise cover via narrow build/test.
- [x] Phase 3. Verify frontend build/checks/line caps/graph and document review.

### Acceptance
- [x] CSV first metadata column is `prediction_name`.
- [x] No `prediction_id` or `reviewer` header remains in prediction export.
- [x] Each prediction emits one row with feedback values spread across email-specific columns.

### Review
- Status: fixed.
- Prediction export CSV now starts with `prediction_name`; `prediction_id` is removed.
- Standalone `reviewer` column removed; output feedback headers now include reviewer email, e.g. `output.score.feedback.ana@example.com`.
- Export now emits one row per prediction and spreads feedback into reviewer-specific columns.
- Split export row construction into `buildPredictionExportData` to keep component under line cap and add focused test coverage.
- Verification:
  - `vp test test/export-csv.test.ts` ✅ 1 test
  - `vp run build` from `frontend/` ✅ warnings only: existing `runtime-config.js` non-module script and large chunks
  - `npx react-doctor@latest --verbose` ✅ 99/100; remaining warnings are pre-existing infra unused exports and restored auth hero bold typography
  - `vp check` ❌ blocked by existing formatting backlog in 469 files, mostly `dist/`
  - touched file line caps ✅ all touched source/test files under 300 lines
  - `git diff --check` ✅ CRLF warnings only
  - `graphify update .` ✅

## Bulk Upload Auto Names

### Goal
- [x] Allow prediction bulk upload files without `name` column.
- [x] Assign missing-column names as `bulk-upload-${lastPredictionId+n}` from DB.
- [x] Keep explicit `name` column behavior unchanged.

### Plan
- [x] Phase 1. Add backend last-prediction-id read endpoint from DB.
- [x] Phase 2. Pass DB id base into tabular parser from bulk upload hook.
- [x] Phase 3. Update bulk upload tests for DB-based no-name auto naming.
- [x] Phase 4. Verify focused tests/build/line caps/graph and document review.

### Acceptance
- [x] CSV/XLSX with no `name` header still parse if schema input columns exist.
- [x] Generated names are deterministic from DB base: `bulk-upload-${lastId+1}`, ...
- [x] Existing `name` column still requires non-empty values.

### Review
- Status: fixed.
- Backend adds `GET /api/predictions/last-id`, guarded by current-org operate permission, reading global max `Prediction.id` from DB.
- Bulk upload hook fetches that DB base before parsing CSV/XLSX.
- `parseTabularPredictionRecords` still keeps explicit `name` behavior; no-name files now require an id base and generate `bulk-upload-${lastId+1}`, `bulk-upload-${lastId+2}`, etc.
- Applies to CSV and XLSX because both route through the tabular parser.
- Verification:
  - `vp test test/bulk-upload.test.ts` ✅ 9 tests
  - `mvn -q "-Dtest=PredictionControllerTest,PredictionServiceTest" test` ✅
  - `mvn -q "-Dmaven.test.skip=true" package` from `api/` ✅ warnings only from Lombok/Unsafe
  - `vp run build` from `frontend/` ✅ warnings only: existing `runtime-config.js` non-module script and large chunks
  - `npx react-doctor@latest --verbose` ✅ 99/100; remaining warnings are pre-existing infra unused exports and restored auth hero bold typography
  - touched file line caps ✅ all touched source/test files under 300 lines
  - `git diff --check` ✅ CRLF warnings only
  - `graphify update .` ✅
  - `vp check` ❌ blocked by existing formatting backlog in 459 files, mostly `dist/`

## Admin Reset Password Privacy UI

### Goal
- [x] Replace browser prompt with proper reset-password dialog.
- [x] Hide password by default and add eye icon visibility toggle.
- [x] Keep admin users page under 300 lines by splitting UI.

### Plan
- [x] Phase 1. Add dedicated reset-password dialog component.
- [x] Phase 2. Wire admin users table reset action to dialog state.
- [x] Phase 3. Capture lesson, verify build/checks/line caps/graph.

### Acceptance
- [x] Reset password value is never shown in a browser prompt/plain text UI.
- [x] Eye icon toggles password field between masked/visible.
- [x] Dialog has bounded, polished admin UI and disabled submit until valid length.

### Review
- Status: fixed.
- Replaced `window.prompt("New password")` with `ResetPasswordDialog`.
- Password field defaults to masked `type="password"`; Eye/EyeOff icon toggles visibility.
- Submit disabled until password length >= 10 and reset mutation is idle.
- Admin users page stays under line cap by moving dialog into `frontend/src/admin/components/ResetPasswordDialog.tsx`.
- Verification:
  - `vp run build` from `frontend/` ✅ warnings only: existing `runtime-config.js` non-module script and large chunks
  - stale prompt scan in admin frontend ✅ no `window.prompt`/`prompt()` refs
  - `npx react-doctor@latest --verbose` ✅ 99/100; remaining warnings are pre-existing infra unused exports and restored auth hero bold typography
  - line caps ✅ `admin-users-page.tsx` 214 lines, `ResetPasswordDialog.tsx` 75 lines
  - `git diff --check` ✅ CRLF warnings only
  - `graphify update .` ✅
  - `vp check` ❌ blocked by existing formatting backlog in 458 files, mostly `dist/`

## Invitation Custom Role Assignment

### Goal
- [x] Invite modal lists assignable organization roles from the role catalog, including custom roles.
- [x] Invitation creation persists the chosen role definition so accepted users get the requested custom role.
- [x] Modal layout stays bounded, usable, and consistent with workspace UI.

### Plan
- [x] Phase 1. Add role-definition support to invitation request/entity/DTO and acceptance flow.
- [x] Phase 2. Load role catalog on invitations page and send `roleDefinitionId` from invite form.
- [x] Phase 3. Replace hardcoded role helper tests with role-catalog option tests.
- [x] Phase 4. Verify frontend/backend builds/tests, line caps, graph update, and record review.

### Acceptance
- [x] New custom organization roles appear in invite role selector.
- [x] Legacy `role` request remains tolerated for existing clients.
- [x] Accepted invite creates membership with selected `roleDefinition`.
- [x] Invite dialog content remains inside modal bounds on desktop/mobile.

### Review
- Status: fixed.
- Backend invitation creation now accepts `roleDefinitionId`, stores it on `Invitation`, returns it in `InvitationDto`, and applies it to organization membership on accept.
- Legacy `role` request remains supported by resolving it through seeded system role definitions.
- Invite UI now loads organization role definitions from `/roles`; custom roles appear in selector, owner is hidden unless transfer ownership is allowed.
- Invite modal moved into a dedicated bounded dialog with real close icon and no escaped inline grid/card.
- Verification:
  - `vp test test/rbac-permissions.test.ts` ✅
  - `vp run build` from `frontend/` ✅ warnings only: existing `runtime-config.js` non-module script and large chunks
  - `mvn -q "-Dmaven.test.skip=true" package` from `api/` ✅
  - `npx react-doctor@latest --verbose` ✅ 99/100; remaining warnings are pre-existing infra unused exports and restored auth hero bold typography
  - `vp check` ❌ blocked by existing formatting backlog in 455 files, mostly `dist/`
  - touched file line caps ✅ all under 300 lines
  - `git diff --check` ✅ CRLF warnings only
  - `graphify update .` ✅

## CSV Bulk Prediction Upload

### Goal
- [x] Replace JSONL bulk prediction upload with schema-aware CSV upload.
- [x] Coerce CSV cell values by signature field kind before running the prediction pipeline.
- [x] Keep existing bulk progress/cancel/save behavior and verification rules.

### Plan
- [x] Phase 1. Add `parseCsvPredictionFile` with CSV parsing, header validation, schema field lookup, and kind-based coercion.
- [x] Phase 2. Wire bulk upload hook and button to CSV.
- [x] Phase 3. Replace JSONL bulk tests with CSV success/error coverage.
- [x] Phase 4. Run focused tests/checks, line caps, graph update, and record review.

### Acceptance
- [x] CSV requires `name` and one column per schema input.
- [x] Numeric/boolean/list/series inputs are typed before MLForm submit.
- [x] Invalid rows are skipped with useful reasons.
- [x] No JSONL copy or file accept remains in bulk upload UI.

### Review
- Status: implemented.
- Bulk prediction upload now accepts CSV only and parses `name` plus schema input columns.
- Parser maps CSV headers to `signatureSchema.fields[]` by `ui.backendKey`, then `label`, then `id`; values are coerced by field `kind` before MLForm pipeline submit.
- Invalid headers or rows return skipped records with concrete reasons; valid rows continue.
- Verification:
  - `vp test test/bulk-upload.test.ts` ✅ 6 tests
  - `vp run build` ✅ warnings only: existing `runtime-config.js` non-module script and large chunks
  - `npx react-doctor@latest --verbose` ✅ 99/100; remaining warnings are pre-existing infra unused exports
  - `vp check` ❌ blocked by existing formatting backlog in 447 files, mostly `dist/`
  - line-cap check ✅ touched files under 300 lines
  - stale JSONL scan ✅ no frontend source/test refs
  - `graphify update .` ✅

## XLSX Bulk Prediction Upload

### Goal
- [x] Accept `.xlsx` files in the same bulk prediction upload flow as CSV.
- [x] Reuse the schema-aware column/type contract from CSV.
- [x] Keep CSV behavior unchanged.

### Plan
- [x] Phase 1. Add minimal XLSX runtime parser dependency with explicit reason.
- [x] Phase 2. Split tabular record validation/coercion out of CSV parser.
- [x] Phase 3. Route CSV and XLSX files through a single spreadsheet upload parser.
- [x] Phase 4. Update upload accept/copy and tests.
- [x] Phase 5. Verify focused tests, build, line caps, graph.

### Acceptance
- [x] CSV and XLSX both require first column `name` and schema input columns.
- [x] XLSX numeric/boolean/date/string cells are coerced by schema field `kind`.
- [x] Unsupported file types fail before processing with clear message.
- [x] No `.xls` claim is made; parser supports `.xlsx`, not legacy binary Excel.

### Review
- Status: implemented.
- Added `read-excel-file` dependency because XLSX is zipped XML and cannot be parsed by browser APIs alone.
- Shared schema-aware validation/coercion now lives in `parseTabularPredictionRecords`.
- CSV parser only converts CSV text into tabular rows; XLSX parser reads first worksheet into same row shape.
- Upload button accepts `.csv` and `.xlsx`; title copy says CSV or XLSX.
- Verification:
  - `vp test test/bulk-upload.test.ts` ✅ 7 tests
  - `vp run build` ✅ warnings only: existing `runtime-config.js` non-module script and large chunks
  - line-cap check ✅ touched source/test files under 300 lines
  - `git diff --check` ✅ CRLF warnings only
  - `npx react-doctor@latest --verbose` ✅ ran; remaining warnings include pre-existing infra unused exports and restored AuthLanding `font-bold`
  - `vp check` ❌ blocked by existing formatting backlog in 453 files, mostly `dist/`

## Admin Users Sort Stability Fix

### Goal
- [ ] Stop enabled/disabled changes from reordering users automatically.
- [ ] Add explicit user-controlled sorting so enabled sorting only happens by choice.
- [ ] Keep admin users page under 300 lines and verify build.

### Plan
- [x] Phase 1. Preserve first-seen user order across refetches.
- [x] Phase 2. Add visible sort control with default order, name, newest, oldest, enabled, disabled.
- [x] Phase 3. Render sorted users from local view model, not raw backend order.
- [x] Phase 4. Update lessons, verify line cap/build/graph.

### Acceptance
- [x] Toggling enabled does not move row position in default mode.
- [x] Enabled/disabled grouping only happens after explicit sort selection.
- [x] Verification recorded.

### Review
- Status: implemented.
- Root cause: user list rendered raw refetch order; after an enabled toggle, backend/DB order could change and the UI treated it as desired ordering.
- Fix: admin users page now keeps first-seen order in `Current order` mode, independent of later enabled changes.
- Added explicit `User order` control: `Current order`, `Name`, `Newest`, `Oldest`, `Enabled first`, `Disabled first`.
- Verification:
  - `frontend/src/admin/pages/admin-users-page.tsx` line count ✅ 205 lines
  - `vp run build` from `frontend/` ✅
  - `graphify update .` ✅
  - `git diff --check` ✅ warnings only for existing LF/CRLF normalization
  - `vp check` ❌ blocked by existing formatting backlog in 341 files, mostly `dist/` plus pre-existing tracked files

## Frontend Schema Copy And Modal/User UI Fix

### Goal
- [ ] Rename visible frontend references from "signature" to "schema" where meaning is UI/schema contract, without changing backend API identifiers.
- [ ] Fix create prediction modal so it sits below app header and does not slide underneath it.
- [ ] Fix admin user enabled checkbox so toggling does not shift table layout.

### Plan
- [x] Phase 1. Locate relevant frontend components and line limits.
- [x] Phase 2. Update schema-facing UI copy in model/signature/prediction screens and search placeholder.
- [x] Phase 3. Adjust prediction modal positioning/height/overflow against sticky header.
- [x] Phase 4. Stabilize admin user table enabled checkbox dimensions.
- [x] Phase 5. Run focused verification, line-limit checks, graphify update, record review.

### Acceptance
- [x] User-facing copy says schema for UI schema/version flows.
- [x] Technical/API variable names remain compatible with current backend.
- [x] Prediction modal no longer renders under header.
- [x] Enabled checkbox toggle does not move row content.

### Review
- Status: implemented.
- Copy: model schema/version UI, prediction schema preview, search placeholder, MLForm labels, and schema errors now use "schema" for UI schema concepts. Backend/API identifiers and `/signatures` routes left intact for compatibility.
- Modal: create prediction modal now starts below app header (`top-[88px]`) and clamps internal height.
- Users: enabled checkbox now uses a fixed-width cell and fixed-size custom control, so checked/unchecked state cannot shift row layout.
- Verification:
  - `vp run build` from `frontend/` ✅
  - touched file line-cap check ✅ all touched files under 300 lines
  - `git diff --check` ✅ warnings only for existing LF/CRLF normalization
  - `graphify update .` ✅
  - `vp check` ❌ blocked by existing formatting backlog in 340 files, mostly `dist/` plus pre-existing tracked files
- Existing repo gap: full frontend source line-cap scan still finds pre-existing files over 300 lines: `frontend/src/app/components/ui.tsx`, `frontend/src/app/utils/mlform/primitive-registry.ts`, `frontend/src/models/components/ExportButton.tsx`, `frontend/src/workspace/types.ts`.

## Goal
- [x] Move config source-of-truth to env.
- [x] Keep `.env` and `.env.example` aligned.
- [x] Remove config hardcodes from compose, API, backend runtime, docs.

## Audit Findings
- [ ] `docker-compose.dev.yml` hardcodes `SPRING_PROFILES_ACTIVE=prod`, `ANALYZER_BASE_URL=https://py-analyzer:8000`, `VITE_BACKEND_URL=https://localhost:${SPRING_PORT}`.
- [ ] `docker-compose.prod.yml` repeats same hardcodes.
- [ ] `api/src/main/resources/application.properties` hardcodes DB host/port in JDBC URL, `spring.profiles.active=prod`, `server.port=8443`, `server.ssl.enabled=true`, keystore password/alias/path defaults, storage defaults, log path default.
- [ ] `api/src/main/java/dev/ulloasp/mlsuite/security/SecurityConfig.java` hardcodes allowed origins `https://localhost:5173` and `https://localhost:8443`.
- [ ] `backend/src/mlsuite_backend/config.py` hardcodes fallback CORS origin `https://localhost:8443` and port `8000`.
- [ ] `.env.example` missing vars already used or needed: `DB_TEST`, `LOG_PATH`, `SPRING_PROFILES_ACTIVE`, `SERVER_SSL_ENABLED`, `SERVER_SSL_KEY_STORE`, `SERVER_SSL_KEY_STORE_PASSWORD`, `SERVER_SSL_KEY_STORE_TYPE`, `SERVER_SSL_KEY_ALIAS`, `ANALYZER_BASE_URL`, `VITE_BACKEND_URL`, `CORS_ALLOW_ORIGINS`, maybe runtime host/port vars if backend made env-driven.

## Plan
- [x] Phase 1. Define env contract.
Add single config list in root env files. Keep names already used when possible. Add missing vars to `.env` and `.env.example`. Mark safe placeholders in example, real values only in `.env`.
- [x] Phase 2. Compose stop inventing values.
Change `docker-compose.dev.yml` and `docker-compose.prod.yml` to pass-through env vars, not hardcoded literals. Use `${VAR}` or `${VAR:-safe-default}` only where startup truly needs fallback.
- [x] Phase 3. API config stop hardcoding infra.
Refactor `application.properties` so DB URL uses `${DB_HOST}`, `${DB_PORT}`, `${DB_PROD}`. Move Spring profile, port, SSL flags, keystore path/pass/type/alias, storage endpoint, log path behind env vars. Keep defaults only if needed for boot safety and duplicate them in env files.
- [x] Phase 4. API CORS env-driven.
Extract allowed origins to env-backed property, ex `CORS_ALLOW_ORIGINS`. Parse comma-separated list in dedicated config/properties class. Remove localhost literals from `SecurityConfig.java`.
- [x] Phase 5. Backend runtime env-driven.
Move backend `PORT` and CORS origins to env-backed settings with explicit vars, ex `PYTHON_PORT` and `CORS_ALLOW_ORIGINS`. Keep `HOST=0.0.0.0` only if intentional container bind, else make env too.
- [x] Phase 6. Frontend env contract stable.
Keep frontend reading `VITE_BACKEND_URL` only. Ensure compose and env files provide it. No extra frontend hardcodes.
- [x] Phase 7. Docs sync.
Update `README.md` env snippet so docs match `.env.example`. Remove stale examples that imply hidden defaults.
- [x] Phase 8. Verify narrow, then integrated.
Run grep audit again for forbidden literals in config paths. Then run targeted checks: API tests touching config/CORS, backend tests if config parsing touched, compose config render if available.

## Proposed Env Additions / Normalization
- [ ] DB: `DB_HOST`, `DB_PORT`, `DB_PROD`, `DB_TEST`, `DB_USER`, `DB_PASS`.
- [ ] Spring: `SPRING_PORT`, `SPRING_PROFILES_ACTIVE`, `LOG_PATH`.
- [ ] SSL: `SERVER_SSL_ENABLED`, `SERVER_SSL_KEY_STORE`, `SERVER_SSL_KEY_STORE_PASSWORD`, `SERVER_SSL_KEY_STORE_TYPE`, `SERVER_SSL_KEY_ALIAS`.
- [ ] Backend/API link: `ANALYZER_BASE_URL`.
- [ ] Frontend/API link: `VITE_BACKEND_URL`.
- [ ] CORS: `CORS_ALLOW_ORIGINS`.
- [ ] Runtime ports: `PYTHON_PORT`, `WEB_PORT`, `MINIO_API_PORT`, `MINIO_CONSOLE_PORT`.
- [ ] Storage: `STORAGE_ENABLED`, `STORAGE_ENDPOINT`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`, `STORAGE_BUCKET`, `STORAGE_AUTO_CREATE_BUCKET`, `STORAGE_BACKFILL_ON_STARTUP`.
- [ ] Seed/admin: `MLSUITE_SUPERADMIN_EMAIL`, `MLSUITE_SUPERADMIN_PASSWORD`, `MLSUITE_SUPERADMIN_FULL_NAME`, `MLSUITE_SUPERADMIN_USERNAME`.

## Acceptance
- [x] No config literal for env-specific host, port, URL, origin, credential in compose or app config, except explicit safe fallback justified in code/comment.
- [x] `.env` and `.env.example` expose same contract.
- [x] Docs match env contract.
- [x] Verification commands + blockers documented.

## Review
- Status: implemented.
- Extra fix: frontend now reads `VITE_BACKEND_URL` from runtime-generated `/runtime-config.js`, so prod compose env affects prebuilt static image too.
- Risk: env values are now authoritative; broken or missing env now fails faster instead of silently falling back.
- Rule kept: browser-facing URL (`VITE_BACKEND_URL`) stays separate from container-network URL (`ANALYZER_BASE_URL`).
- Verification:
  - `docker compose -f docker-compose.dev.yml config` ✅
  - `mvn -q -Dtest=AnalyzerServiceTest test` ❌ blocked by unrelated existing API test-compile failures in `OrganizationManagementServiceTest` and `WorkspaceAuthorizationServiceTest`
  - `mvn -q "-Dmaven.test.skip=true" package` ✅
  - `uv run pytest tests/test_runtime_api.py` ❌ blocked because `pytest` is not installed in backend env (`Failed to spawn: pytest`)
  - `uv run python -m compileall src` ✅
  - `uv run python -c "from mlsuite_backend.app import create_app; from mlsuite_backend.__main__ import main; app = create_app(); print(app is not None)"` ✅
  - `vp build` ✅
  - `vp check` ❌ blocked by broad pre-existing formatting issues across repo-generated/tracked files, not by typed build failure

## Infra Dashboard Plan

### Goal
- [x] Add superadmin infrastructure dashboard with live metrics, service control, logs, and xterm terminal.
- [x] Keep source of truth split cleanly: frontend UI, Spring auth/proxy, host-side ops-agent.
- [x] Add real chart and terminal libraries: `recharts`, `react-is`, `@xterm/xterm`, `@xterm/addon-fit`.

### Plan
- [x] Phase 1. Update task lessons and install frontend deps.
- [x] Phase 2. Create `ops-agent/` FastAPI service with metrics, compose control, log streaming, and terminal sessions.
- [x] Phase 3. Add Spring config, REST proxy, and WS bridge under `admin.infrastructure`.
- [x] Phase 4. Add frontend infra feature, route, sidebar entry, charts, logs, and xterm panel.
- [x] Phase 5. Add focused tests for ops-agent, API controller/client, and frontend infra logic.
- [x] Phase 6. Run narrow verification and record blockers/results.

### Acceptance
- [x] `/admin/infrastructure` shows live host metrics with charts.
- [x] Service table shows state and allows start/stop/restart.
- [x] Logs stream for selected service.
- [x] Embedded xterm terminal opens real shell session for selected service.
- [x] Superadmin-only REST and WS paths enforced.

### Review
- Status: implemented.
- Added `ops-agent/` host-side FastAPI service for metrics, compose actions, log follow, and terminal session orchestration.
- Added Spring REST proxy + WebSocket bridge under `admin.infrastructure` with superadmin gate and ops-agent error mapping.
- Added frontend infra feature page with `recharts` telemetry charts, live log panel, and `xterm.js` terminal panel.
- Verification:
  - `uv run --project ops-agent python -m compileall src` ✅
  - `uv run --project ops-agent --extra dev pytest tests/test_ops_api.py` ✅
  - `vp test src/admin/infrastructure/infrastructure.test.tsx` ✅
  - `vp build` ✅
  - `mvn -q "-Dmaven.test.skip=true" package` ✅
  - `mvn -q -Dtest=InfrastructureControllerTest test` ❌ blocked by pre-existing unrelated `testCompile` failures in `OrganizationManagementServiceTest` and `WorkspaceAuthorizationServiceTest`
  - `vp check` ❌ blocked by broad pre-existing formatting issues across tracked/generated frontend files, not by infra feature compile failure
  - `docker build -t mlsuite-ops-agent-test ./ops-agent` ✅
  - `docker run --rm mlsuite-ops-agent-test .venv/bin/python -c "import shutil, subprocess; print(shutil.which('docker')); subprocess.run(['docker','compose','version'], check=True)"` ✅
  - `docker compose -f docker-compose.dev.yml up -d --build ops-agent` ✅
  - `Invoke-WebRequest -Headers @{ 'X-MLSuite-Ops-Secret' = '<redacted>' } http://localhost:8091/internal/overview` ✅ `200`

## Infra Dashboard Redesign

### Goal
- [ ] Turn `/admin/infrastructure` from loose landing layout into dense operational dashboard.
- [ ] Make global health visible in first viewport.
- [ ] Reduce error-badge noise and give services center stage.
- [ ] Keep redesign honest to existing backend contract and under file-size limits.

### Plan
- [x] Phase 1. Add dashboard summary helpers and compact top bar.
- [x] Phase 2. Add KPI cards + alert rail derived from real host/service state.
- [x] Phase 3. Redesign telemetry chart panel into primary chart deck.
- [x] Phase 4. Rebuild service control panel into stronger command table/grid.
- [x] Phase 5. Rework logs/terminal into lower workspace with tabs on small screens.
- [x] Phase 6. Run focused frontend tests/build and record results.

### Review
- Status: implemented.
- Replaced hero-style infra page with compact command header, KPI summary row, chart + signal rail, stronger service control block, and dedicated workspace section.
- Added derived dashboard helpers so alert rail and KPI cards use real host/service/socket state without inventing backend data.
- Kept all infra frontend files under 300 lines.
- Verification:
  - `Get-ChildItem frontend\src\admin\infrastructure -Recurse -File | ...` ✅ all files under 300 lines
  - `vp test src/admin/infrastructure/infrastructure.test.tsx` ✅
  - `vp build` ✅
- Gap:
  - no browser screenshot/interactive visual QA was run in this turn

## Frontend/API Same-Origin Auth Fix

### Goal
- [x] Remove browser cross-origin dependency for auth/API calls.
- [x] Keep frontend as single browser origin in docker and local Vite dev.
- [x] Fix `/api/users/me` load without requiring separate backend cert trust in browser.

### Plan
- [x] Phase 1. Confirm current failure path and direct backend reachability.
- [x] Phase 2. Make frontend runtime config tolerate same-origin fallback.
- [x] Phase 3. Add frontend reverse proxy for `/api` and websocket upgrade in nginx image.
- [x] Phase 4. Add matching Vite dev proxy so local non-docker dev keeps same contract.
- [x] Phase 5. Rebuild frontend, hit app through frontend origin, record results.

### Review
- Status: implemented.
- Root cause: browser called `https://localhost:8443` directly from frontend origin. Backend itself answered `401`, but browser-side TLS/cross-origin path was brittle and surfaced as fake CORS failure.
- Fix: frontend now defaults to same-origin API access, docker nginx proxies `/api` to `spring-app:8443`, and local Vite dev proxies `/api` to `https://localhost:8443` with cert verification disabled for dev.
- Env contract: `VITE_BACKEND_URL=` now means "use frontend origin/proxy".
- Verification:
  - `vp build` ✅
  - `docker compose -f docker-compose.dev.yml up -d --build frontend` ✅
  - `Invoke-WebRequest https://localhost:8443/api/users/me -SkipCertificateCheck` ✅ backend reachable, returns `401`
  - `Invoke-WebRequest https://localhost:5173/runtime-config.js -SkipCertificateCheck` ✅ runtime config now serves `VITE_BACKEND_URL: ""`
  - `Invoke-WebRequest https://localhost:5173/api/users/me -SkipCertificateCheck` ✅ proxy path now reaches backend and returns `401`
  - Note: first proxy hit returned `502` during container startup race; retry after startup returned `401`

## Infra Workspace UX Fix

### Goal
- [x] Stop terminal workspace from stretching page with runaway scroll.
- [x] Restore visible infra data refresh when socket path stalls or query updates.
- [x] Make service selection obvious and clickable across full row, not only first cell.

### Plan
- [x] Phase 1. Inspect infra page state sync, terminal sizing, and row selection handlers.
- [x] Phase 2. Fix overview/log refresh flow with stable selection resolution.
- [x] Phase 3. Fix terminal panel min-height/overflow behavior.
- [x] Phase 4. Make full service row selectable without breaking action buttons.
- [x] Phase 5. Run focused frontend tests/build and record results.

### Review
- Status: implemented.
- Root causes:
  - Infra page only copied initial query snapshot with `current ?? data`, so later query refreshes never reached screen.
  - Service selection click target lived only in first cell, not whole row.
  - Terminal panel missed `min-h-0` / overflow clamps, so xterm container could push page height downward.
- Fix:
  - Added polling fallback for overview + logs queries and synced page state to latest overview while preserving valid selected service.
  - Added `resolveSelectedService` helper so selection stays stable when service still exists and falls back cleanly when missing.
  - Made full service row keyboard/click selectable; action buttons now stop propagation.
  - Clamped terminal panel layout with `min-h-0` and `overflow-hidden` on terminal wrappers.
- Verification:
  - `vp test src/admin/infrastructure/infrastructure.test.tsx` ✅
  - `vp build` ✅
  - Build warning remains: existing `runtime-config.js` script warning + large chunk warnings, unrelated to this fix.

### Follow-up Review
- Status: tightened after browser feedback.
- Added explicit `ServiceFocusBar` above logs/shell with native service selector plus actionable facts: state, health, uptime, CPU, memory, container, ports.
- Logs and shell panels now use fixed 520px grid height with internal scroll only; page no longer grows from log/shell content.
- Rebuilt running frontend container so browser receives current bundle.
- Verification:
  - `vp test src/admin/infrastructure/infrastructure.test.tsx` ✅
  - `vp build` ✅
  - `docker compose -f docker-compose.dev.yml up -d --build frontend` ✅
  - `Invoke-WebRequest https://localhost:5173 -SkipCertificateCheck` ✅ `200`

### Terminal Session Loop Fix
- Status: fixed.
- Root cause: `ServiceTerminalPanel` opened terminal sessions automatically when mounted and depended on the full React Query mutation object, so status/render changes could recreate sessions repeatedly.
- Fix: terminal now waits for explicit `Open shell` click, uses stable `mutateAsync`, and does not retry automatically after a session error.
- Cleanup: restarted ops-agent to clear leaked in-memory sessions and rebuilt frontend container.
- Verification:
  - `vp test src/admin/infrastructure/infrastructure.test.tsx` ✅
  - `vp build` ✅
  - `docker compose -f docker-compose.dev.yml restart ops-agent` ✅
  - `docker compose -f docker-compose.dev.yml up -d --build frontend` ✅
  - `Invoke-WebRequest http://localhost:8091/health` ✅
  - `Invoke-WebRequest http://localhost:8091/internal/overview` ✅ services running

### Realtime/Health/Shell Fix
- Status: fixed.
- WS sample interval changed to 1 second in env and ops-agent default.
- Metrics broadcast split from Docker service refresh, so host telemetry emits every second while heavier Docker service snapshots refresh in background.
- Health bug fixed: Docker Compose reports services without healthcheck as empty string; ops-agent now normalizes empty health to `null`, so `running + unknown health` counts stable instead of alerting.
- Shell access bug analyzed/fixed: ops-agent hardcoded `terminalEnabled=true` for every running service. Shell is now gated by explicit `OPS_AGENT_TERMINAL_SERVICES`; default dev/prod env is empty, so no service shell opens unless allowlisted.
- Live verification:
  - `/internal/overview` ✅ `sample=1`, `healthy=5/5`, `shell=0/5`
  - direct ops-agent WS ✅ `overview.delta` intervals about `1.0s`
  - frontend proxy WS after login ✅ snapshot received through `wss://localhost:5173/api/admin/infrastructure/stream`
  - `uv run --extra dev pytest tests/test_ops_api.py` ✅ 7 tests
  - `vp test src/admin/infrastructure/infrastructure.test.tsx` ✅
  - `vp build` ✅

## Infra Implementation Audit

### Goal
- [x] Verify described `/admin/infrastructure` implementation against repo code.
- [x] Identify gaps in frontend, Spring proxy/WS, ops-agent, tests, and runtime wiring.
- [x] Run focused verification where useful.

### Plan
- [x] Phase 1. Inspect frontend module files and route/auth behavior.
- [x] Phase 2. Inspect Spring REST proxy, superadmin guard, and WS bridge.
- [x] Phase 3. Inspect ops-agent config/API/logs/terminal behavior.
- [x] Phase 4. Compare tests and line-limit constraints.
- [x] Phase 5. Run narrow verification and document findings.

### Review
- Status: partially implemented, with gaps.
- Major gap: `/admin/infrastructure` route uses `RequireSuperadmin`, which returns `NotFoundError`; non-superadmin users do not reach page-level `/workspace` redirect.
- Major gap: terminal backend uses `docker compose exec -T` with pipe stdio, not a PTY; resize only stores cols/rows and cannot resize shell process.
- Risk: terminal React effect depends on full `useMutation()` result object, so renders may restart/close shell sessions unexpectedly.
- Test gap: frontend tests cover helper functions only, not route redirect, logs/terminal panels, xterm session lifecycle, or WS behavior.
- Test gap: Spring controller test instantiates controller directly; no security/filter/WS authorization coverage.
- Verification:
  - `vp test src/admin/infrastructure/infrastructure.test.tsx` ✅
  - `vp build` ✅ warning only: runtime-config non-module script + large chunks
  - `uv run --extra dev pytest tests/test_ops_api.py` from `ops-agent/` ✅
  - `uv run python -m compileall src` from `ops-agent/` ✅
  - `docker compose -f docker-compose.dev.yml config` ✅
  - `mvn -q "-Dmaven.test.skip=true" package` ✅
  - `mvn -q -Dtest=InfrastructureControllerTest test` ❌ blocked by unrelated existing `testCompile` failures in `OrganizationManagementServiceTest` and `WorkspaceAuthorizationServiceTest`

### Follow-up Fix
- Root cause: ops-agent ran compose from `/app` with no compose project override, so `docker compose -f /workspace/docker-compose.dev.yml ps` saw no MLSuite containers and returned every managed service as `missing`.
- Added `OPS_AGENT_COMPOSE_PROJECT=mlsuite` to env contract and passed it into dev/prod compose.
- Secondary root cause: current Docker Compose accepts only one service for `docker compose stats`; ops-agent passed all services at once and `/internal/overview` failed after project fix.
- Changed stats collection to query one service at a time and merge JSON rows.
- Added ops-agent WS snapshot test that verifies `overview.snapshot.payload.services[]` includes status, health, container name, CPU, memory, and ports.
- Added WS disconnect handling so stream/terminal sockets close cleanly in tests and runtime.
- Live verification:
  - `http://localhost:8091/internal/overview` ✅ services now `running`; postgres `healthy`; cpu/memory/container/ports populated
  - `ws://127.0.0.1:8091/internal/stream` from inside ops-agent ✅ `overview.snapshot` includes same service status fields
  - `uv run --extra dev pytest tests/test_ops_api.py` ✅ 5 tests
  - `uv run python -m compileall src` ✅
  - `docker compose -f docker-compose.dev.yml up -d --build ops-agent` ✅

## Infra Sidebar Subtabs And PTY Terminal

### Goal
- [x] Remove in-page Infra chrome/top tabs.
- [x] Move Infra views to sidebar subtabs under `Infra`.
- [x] Make embedded shell use real PTY-backed docker compose exec.
- [x] Verify frontend and ops-agent paths.

### Plan
- [x] Phase 1. Wire Infra view from URL state so sidebar subtabs own navigation.
- [x] Phase 2. Add sidebar child nav under `Infra` with counts where local data supports it later if needed.
- [x] Phase 3. Remove Infra top bar/tab bar and keep page content stable.
- [x] Phase 4. Replace piped `exec -T` terminal with PTY-backed compose exec, including resize.
- [x] Phase 5. Run focused tests/builds and document review.

### Review
- Status: fixed.
- Infra page now uses `?tab=` as source of truth, so sidebar child links own Overview, Services, Logs, Terminal, and Alerts.
- In-page MLSuite top bar and horizontal tab strip removed.
- Ops-agent terminal now starts `docker compose exec` through a POSIX PTY, removes `-T`, reads/writes via PTY fd, and applies resize to terminal winsize.
- Runtime note: shell UI still honors `OPS_AGENT_TERMINAL_SERVICES`; empty allowlist means no service exposes shell.
- Verification:
  - `vp test src/admin/infrastructure/infrastructure.test.tsx` ✅
  - `vp build` ✅ warnings only: runtime-config non-module script and large chunks
  - `uv run --extra dev pytest tests/test_ops_api.py` ✅ 8 tests
  - `uv run python -m compileall src` ✅
  - one-off ops-agent PTY smoke against `spring-app` ✅ printed `PTY_OK`
  - `docker compose -f docker-compose.dev.yml up -d --build ops-agent frontend` ✅
  - `Invoke-WebRequest https://localhost:5173 -SkipCertificateCheck` ✅ `200`
  - `Invoke-WebRequest http://localhost:8091/health` ✅ `{"status":"ok"}`

## Ops-Agent CI Registration Fix

### Plan
- [x] Compare prod compose images against GHCR publish matrix.
- [x] Register missing `ops-agent` image in CI.
- [x] Record correction lesson and verify workflow syntax shape.

### Review
- Status: fixed.
- Root cause: `docker-compose.prod.yml` referenced `mlsuite-ops-agent`, but `.github/workflows/publish-ghcr.yml` only built frontend, api, and backend images.
- Fix: added `ops-agent` matrix entry using `./ops-agent/Dockerfile`, context `./ops-agent`, image `mlsuite-ops-agent`.
- Verification:
  - `git diff --check` ✅ only existing CRLF warning for workflow file
  - `docker build --file ./ops-agent/Dockerfile --tag mlsuite-ops-agent:ci-check ./ops-agent` ✅
  - YAML parser check blocked: local Python missing `PyYAML`

## Ops-Agent Service Aggregate Metrics

### Plan
- [x] Replace host probes with managed-service metric aggregation.
- [x] Preserve existing overview shape while changing values to service totals.
- [x] Drop unused host metric dependency.
- [x] Verify tests, compile, and Docker build.

### Review
- Status: fixed.
- Root cause: ops-agent sampled host CPU/RAM/disk/VRAM via `psutil`/`nvidia-smi`, but dashboard scope is managed compose services.
- Fix: `collect_metrics` now sums `cpuPercent` across services, computes RAM percent from summed service memory used/limit, disables disk/VRAM host probes, and emits service aggregate points.
- Fix: Docker stats parsing now stores `memoryLimitBytes` from `MemUsage`.
- Fix: removed `psutil` from ops-agent project dependencies and lockfile.
- Verification:
  - `uv lock` ✅ removed `psutil`
  - `uv run --extra dev pytest tests/test_ops_api.py` ✅ 9 tests
  - `uv run python -m compileall src` ✅
  - `docker build --file ./ops-agent/Dockerfile --tag mlsuite-ops-agent:service-aggregate-check ./ops-agent` ✅

## Ops-Agent Legacy Contract Removal

### Plan
- [x] Remove legacy `host` overview payload and replace it with `aggregate`.
- [x] Drop disk/VRAM metric fields and unused panels from infra UI.
- [x] Keep files under 300 lines by splitting overview/services helpers.
- [x] Verify backend, frontend, Docker build, and stale references.

### Review
- Status: fixed.
- Contract now emits `aggregate.cpu` and `aggregate.ram`; no `host`, `diskPercent`, `vramPercent`, or `vramSupported` telemetry remains in active infra payload/types/tests/UI.
- Deleted unused legacy panels: `InfrastructureSummaryGrid`, `InfrastructureTopBar`, `SystemHealthChartPanel`.
- Split `OverviewView` and `ServicesView` support helpers to satisfy line cap in touched infra files.
- Verification:
  - `uv run --extra dev pytest tests/test_ops_api.py` ✅ 9 tests
  - `uv run python -m compileall src` ✅
  - `vp test src/admin/infrastructure/infrastructure.test.tsx` ✅ 6 tests
  - `vp build` ✅ warnings only: runtime-config non-module script and large chunks
  - `docker build --file ./ops-agent/Dockerfile --tag mlsuite-ops-agent:no-legacy-check ./ops-agent` ✅
  - `git diff --check` ✅ only CRLF warnings

### Visual Preservation Follow-up
- Status: fixed.
- Restored overview shape to match previous dashboard density: KPI row, main chart + signals, services glance, memory panel.
- Main chart now has service filter backed by backend history points: `history.points[].services[]`.
- Verification:
  - `uv run --extra dev pytest tests/test_ops_api.py` ✅ 9 tests
  - `uv run python -m compileall src` ✅
  - `vp test src/admin/infrastructure/infrastructure.test.tsx` ✅ 6 tests
  - `vp build` ✅ warnings only: runtime-config non-module script and large chunks
  - `docker build --file ./ops-agent/Dockerfile --tag mlsuite-ops-agent:service-chart-filter-check ./ops-agent` ✅
  - `git diff --check` ✅ only CRLF warnings

### Docker IO Metrics Follow-up

### Plan
- [x] Parse Docker `BlockIO` and `NetIO` in ops-agent service snapshots.
- [x] Carry disk read/write and network rx/tx through aggregate/history/service contracts.
- [x] Keep overview visuals, replacing stale KPI labels with Docker IO metrics.
- [x] Update focused backend/frontend tests and verify.

### Review
- Status: fixed.
- Ops-agent now parses Docker `BlockIO` as disk read/write and `NetIO` as network rx/tx.
- Aggregate, history points, and per-service chart points now carry CPU, RAM, disk IO, and network IO.
- Overview KPI row keeps same dashboard shape, with Disk R/W and Network I/O replacing stale non-Docker cards.
- Main chart keeps service filter and adds Docker IO layers.
- Verification:
  - `uv run --extra dev pytest tests/test_ops_api.py` ✅ 9 tests
  - `uv run python -m compileall src` ✅
  - `vp test src/admin/infrastructure/infrastructure.test.tsx` ✅ 6 tests
  - `vp build` ✅ warnings only: runtime-config non-module script and large chunks
  - `docker build --file ./ops-agent/Dockerfile --tag mlsuite-ops-agent:docker-io-check ./ops-agent` ✅
  - `git diff --check` ✅ only CRLF warnings
  - line cap check ✅ no touched source/test file over 300 lines
## MLForm 0.1.8 API Adaptation

### Goal
- [x] Adapt all MLSuite MLForm imports/usages to MLForm 0.1.8 public exports.
- [x] Preserve prediction creation, bulk prediction, feedback questionnaire, plugin catalog, and custom renderer flows.
- [x] Keep touched files under 300 lines and update graph after code changes.

### Plan
- [x] Phase 1. Inspect MLForm 0.1.8 package declarations and compare old import paths to new exports.
- [x] Phase 2. Update MLSuite MLForm integration modules to use 0.1.8 paths/types/functions.
- [x] Phase 3. Remove stale import paths and adjust local wrappers if API shapes changed.
- [x] Phase 4. Run focused frontend build/tests, line-cap checks, stale import scan, and graphify update.

### Review
- Status: fixed.
- Updated `mlform` dependency, lockfile, and workspace override from 0.1.7 to 0.1.8 only.
- Replaced removed `mlform/engine` and `mlform/questionnaire` subpath imports with MLSuite adapters over 0.1.8 public exports.
- Added local builtin registry and questionnaire schema/mount adapters to preserve prediction and feedback behavior after the public export split.
- Split `primitive-registry.ts` custom renderers into separate files so touched files stay under 300 lines.
- Verification:
  - `vp build` ✅ warnings only: runtime-config non-module script, plugin timing, and large chunks.
  - `vp test` ✅ 3 files / 12 tests.
  - stale import scan for `mlform/engine` and `mlform/questionnaire` ✅ no matches.
  - touched frontend source line-cap check ✅ no touched source file over 300 lines.
  - `git diff --check` ✅ no whitespace errors; existing CRLF warnings only.
  - `graphify update .` ✅
  - `vp check` ❌ blocked by existing formatting backlog in 378 files, mostly `dist/` plus pre-existing tracked files.
  - `vp check` ❌ blocked by existing formatting backlog in 365 files, mostly `dist/` plus pre-existing tracked files.

## React Doctor 100 Frontend Cleanup

### Goal
- [x] Reach `npx react-doctor@latest --verbose` score 100/100.
- [x] Preserve existing visual layout and behavior.
- [x] Keep all touched source files under 300 lines.

### Plan
- [x] Phase 1. Fix error diagnostics: conditional hook in plugin catalog and reduced-motion support.
- [x] Phase 2. Fix dead-code diagnostics: unused exports, unused types, unused files, misplaced files.
- [x] Phase 3. Fix performance/state diagnostics: motion imports, heavy imports, iteration chains, async sequencing, effect chains, derived state, query invalidation.
- [x] Phase 4. Fix accessibility/design diagnostics without visual regression.
- [x] Phase 5. Re-run React Doctor until 100, then build/tests/line caps/graph update.

### Review
- Status: fixed.
- Baseline: React Doctor 67/100, 2 errors, 314 warnings, 143 affected files.
- Final: React Doctor 100/100, no issues.
- Removed dead frontend files/exports and stale custom explanation runtime/template paths.
- Optimized safe logic without visual changes: stable defaults, shared timestamp formatting, combined iteration passes, direct imports, lazy Monaco editor load, and query invalidation for mutations.
- Split shared UI controls into `ui-controls.tsx`; all frontend source files are now <=300 lines.
- Verification:
  - `npx react-doctor@latest --verbose --offline --fail-on none` ✅ 100/100, no issues.
  - `vp run build` ✅ warnings only: runtime-config non-module script and large chunks.
  - `vp test` ✅ 4 files / 15 tests.
  - source line-cap check ✅ no `frontend/src` `.ts`/`.tsx` file over 300 lines.
  - `git diff --check` ✅ no whitespace errors; CRLF warnings only.
  - `graphify update .` ✅

## Auth Landing Current User Request Fix

### Plan
- [x] Reproduce source by tracing `/api/users/me` callers around auth landing.
- [x] Remove public index route profile query.
- [x] Verify no auth landing path calls `useUser`, build, graph update.

### Review
- Status: fixed.
- Root cause: `AuthLandingPage` no longer called `useUser`, but `IndexRoute` in `frontend/src/router/routes.tsx` still called `useUser()` before rendering it.
- Fix: root public index route now renders `AuthLandingPage` directly. Current-user query remains only in `ProtectedRoute`.
- Verification:
  - `rg "IndexRoute|element: <AuthLandingPage|useUser\\(" frontend/src/router/routes.tsx frontend/src/app/pages/AuthLandingPage.tsx frontend/src/app/pages/auth-landing` ✅ only protected route uses `useUser`.
  - touched line-cap check ✅ `routes.tsx` 229 lines, `AuthLandingPage.tsx` 72 lines.
  - `vp run build` ✅ warnings only: runtime-config non-module script and large chunks.
  - `vp test` ✅ 4 files / 15 tests.
  - `git diff --check` ✅ CRLF warnings only.
  - `graphify update .` ✅

## Auth Landing Page Visual Match

### Plan
- [x] Split auth landing UI into small files under line cap.
- [x] Match supplied visual/copy structure and keep real login/register calls wired.
- [x] Verify build/typecheck, line caps, graph update.

### Review
- Status: fixed.
- Rebuilt `AuthLandingPage` around supplied visual structure, copy, mark, rules, hero, option buttons, sentence form, tabs, and back button.
- Login/register submit now reads real form data and calls existing `useLogin` / `useRegister` mutations.
- Split auth landing pieces into `frontend/src/app/pages/auth-landing/`; all touched auth files are 73 lines or less.
- Verification:
  - `vp run build` ✅ warnings only: runtime-config non-module script, plugin timing, and large chunks.
  - `vp test` ✅ 4 files / 15 tests.
  - touched auth line-cap check ✅ no file over 300 lines.
  - `git diff --check` ✅ no whitespace errors; CRLF warnings only.
  - `graphify update .` ✅
  - `vp check` ❌ blocked by existing formatting backlog in 411 files, mostly `dist/`.

## MLForm Wizard Questionnaire Cleanup

### Goal
- [x] Remove MLSuite local questionnaire legacy shim.
- [x] Use MLForm 0.1.8 `mountWizardForm` kit API for feedback questionnaires.
- [x] Keep feedback values/field ids compatible and verify build/tests.

### Plan
- [x] Phase 1. Inspect MLForm 0.1.8 wizard mount types and current feedback callsites.
- [x] Phase 2. Replace local questionnaire schema/mount adapter with direct wizard schema builder + `mountWizardForm`.
- [x] Phase 3. Delete stale shim exports/imports and update task docs.
- [x] Phase 4. Verify build/tests, stale scans, line caps, graph update.

### Review
- Status: fixed.
- Removed local `mountQuestionnaire`/`MountedQuestionnaire` adapter path.
- Feedback questionnaire UI now calls MLForm 0.1.8 `mountWizardForm` from `mlform/kit` directly.
- `questionnaire-schema.ts` only builds MLForm `FormSchema` + `WizardLayoutConfig`; it no longer wraps MLForm mounting.
- Removed local `runtime.ts` MLForm facade; code imports 0.1.8 public subpaths directly (`mlform/runtime`, `mlform/builtins-ml`, `mlform/kit`).
- Field id derivation remains stable for stored feedback values.
- Captured correction in `tasks/lessons.md`.
- Verification:
  - `vp build` ✅ warnings only: runtime-config non-module script, plugin timing, and large chunks.
  - `vp test` ✅ 3 files / 12 tests.
  - stale scan for local MLForm facades, `mountQuestionnaire`, `normalizeQuestionnaireSchema`, `MountedQuestionnaire`, `mlform/questionnaire`, `mlform/engine` ✅ no matches.
  - `mountWizardForm` usage scan ✅ direct usage in `ExplanationQuestionnaireMount`.
  - touched source line-cap check ✅ no touched source file over 300 lines.
  - `git diff --check` ✅ no whitespace errors; existing CRLF warnings only.
  - `graphify update .` ✅

## MLForm 0.1.8 Frontend Build Fix

### Plan
- [x] Fix strict TypeScript callback inference failures from MLForm 0.1.8 declarations.
- [x] Split oversized touched component so all touched files stay under 300 lines.
- [x] Verify exact Docker build command path with `vp run build`, tests, stale scans, diff check, and graph update.

### Review
- Status: fixed.
- Added explicit public `mlform/runtime` types for schema filters, builtin definition registries, custom explanation adapters, headless prediction wrappers, export helpers, and explanation feedback extraction.
- Split CSV/export helper logic out of `ExportButton.tsx`; component is now under line cap.
- Captured the verification lesson in `tasks/lessons.md`.
- Verification:
  - `vp run build` ✅ runs `tsc -b` then Vite build; warnings only: runtime-config non-module script and large chunks.
  - `vp test` ✅ 3 files / 12 tests.
  - stale scan for MLForm legacy facades/subpaths ✅ no matches.
  - touched source line-cap check ✅ no touched source file over 300 lines.
  - `git diff --check` ✅ no whitespace errors; existing CRLF warnings only.
  - `graphify update .` ✅

## MLForm Builtin Registry Fix

### Plan
- [x] Compose MLSuite builtin registry from MLForm pack API.
- [x] Route prediction/questionnaire mounts through same builtin registry helper.
- [x] Verify builtin field kinds, build, tests, line caps, stale scans, diff check, graph update.

### Review
- Status: fixed.
- `builtin-registry.ts` now uses `createMlRegistryPack()` from `mlform/builtins-ml`; fields/reports come from MLForm pack source of truth.
- Prediction runtime and wizard feedback mount use `createMlSuiteBuiltinRegistry()`, so builtin fields no longer depend on plugin catalog.
- Added regression test for builtin field/report registration, builtin-only schema validation, and unknown custom kind behavior.
- Verification:
  - `vp test src/app/utils/mlform/builtin-registry.test.ts` ✅ 3 tests.
  - `vp run build` ✅ warnings only: runtime-config non-module script and large chunks.
  - `vp test` ✅ 4 files / 15 tests.
  - stale scan for `createBuiltinMlRegistry`, old MLForm subpaths/facades ✅ no matches.
  - touched source/test line-cap check ✅ no touched file over 300 lines.
  - `git diff --check` ✅ no whitespace errors; existing CRLF warnings only.
  - `graphify update .` ✅
## External Review Auth + Dark Mode

### Goal
- [ ] Use main `AuthLandingPage` for unauthenticated `/review/:token` login.
- [ ] Keep review login local: successful login stays on `/review/:token`.
- [ ] Add dark mode support to external review shell, detail, tray, and review auth landing.
- [ ] Verify build, line cap, diff, graph.

### Plan
- [ ] Add injectable login/register behavior to `AuthLandingPage` without changing normal route behavior.
- [ ] Replace `ReviewLoginPanel` usage with review-flavored `AuthLandingPage`.
- [ ] Make auth landing components theme-aware with existing `html.dark` class.
- [ ] Make review portal components use theme tokens instead of hardcoded light colors.
- [ ] Run verification.

### Review
- Status: fixed.
- `/review/:token` unauthenticated state now renders `AuthLandingPage` directly with login-only mode.
- Review login uses local mutation and updates `['user']`; no `/workspace` redirect.
- Removed obsolete `ReviewLoginPanel`.
- Auth landing and review portal now respect dark theme via existing `themeWithHtmlAtom` + dark variants/theme tokens.
- Review tray/detail/accordion/read-only feedback sections no longer force light-only surfaces.
- Visual check: `npx -y playwright screenshot --color-scheme dark http://127.0.0.1:5181/review/fake-token ...` showed dark review login page after auth probe resolved.
- Verification:
  - `vp run build` ✅ warnings only: runtime-config non-module script and large chunks.
  - `npx react-doctor@latest --verbose` ✅ score 99; existing warnings: unused admin infra exports, AuthHero bold heading.
  - touched line cap ✅ key files 126 lines or less.
  - `git diff --check` ✅ no whitespace errors; CRLF warnings only.
  - `graphify update .` ✅ graph updated; graph.html skipped because graph exceeds viz limit.

## Share Review Link Modal Cleanup

### Goal
- [ ] Modal selects predictions by name + creation date only.
- [ ] Remove feedback status, view action, prediction id, nested cards, heavy radius.
- [ ] Add select all / deselect all controls.
- [ ] Existing created links expose copyable review URL.
- [ ] Keep backend source of truth for link/token access.

### Plan
- [ ] Store encrypted review token on `ReviewLink` so management list can return copyable links.
- [ ] Extend summary DTO/API/frontend DTO with token.
- [ ] Replace modal table with purpose-built simple selection list.
- [ ] Replace links panel with flat list: URL, created/expires, revoke/copy.
- [ ] Verify backend/frontend builds, line caps, diff, graph.

### Review
- Status: fixed.
- Modal now uses a flat two-column layout: prediction selector + link management.
- Prediction selector shows only name and creation date; no feedback status, no view action, no prediction id.
- Added Select all / Deselect all controls.
- Existing link rows now show copyable URL, created/expires dates, copy, revoke.
- Backend now persists encrypted review token and returns it in management summaries so URLs remain available after creation.
- Verification:
  - `vp run build` ✅ warnings only: runtime-config non-module script and large chunks.
  - `mvn -q -Dtest=ReviewLinkServiceTest test` ✅
  - `mvn -q "-Dmaven.test.skip=true" package` ✅
  - `npx react-doctor@latest --verbose` ✅ score 99; existing warnings: admin infra unused exports, AuthHero bold heading.
  - line cap ✅ touched files <=300.
  - `git diff --check` ✅ no whitespace errors; CRLF warnings only.

### Review update
- Removed `New link` block; generate now only refreshes active links and shows toast.
- Links list now filters revoked and expired links out.
- Link URL text hidden; active links expose only Copy/Revoke actions plus metadata.
- Verification:
  - `vp run build` ✅ warnings only: runtime-config non-module script and large chunks.
  - `npx react-doctor@latest --verbose` ✅ score 99; existing warnings only.
  - line cap ✅ `ReviewLinkDialog.tsx` 166 lines.
  - `git diff --check` ✅ no whitespace errors; CRLF warnings only.

## Export Reviews Modal

### Goal
- [ ] Export button opens modal instead direct CSV.
- [ ] Modal shows predictions as accordion: closed = prediction name, created date, review count.
- [ ] Expanded = reviewers + output/explanation feedback detail.
- [ ] Selection supports: all reviews, remove whole prediction, remove reviewer globally, remove reviewer only for one prediction.
- [ ] Export CSV honors selected predictions/reviewers/review items.
- [ ] Keep UI calm: flat rows, no sensory overload, no nested cards.

### Plan
- [ ] Add export selection model/helpers near export feature.
- [ ] Extend CSV builder to accept filtered feedback arrays.
- [ ] Split `ExportButton` into button + modal + rows if line cap needs it.
- [ ] Verify build, react-doctor, line cap, diff, graph.

### Review
- Status: fixed.
- Export button now opens a modal instead of immediate CSV download.
- Modal is calm/flat: reviewer filter on left, prediction accordion on right.
- Closed prediction row shows name, creation date, selected/total review count.
- Expanded row shows each reviewer and their output/explanation feedback values.
- Selection supports whole prediction exclusion, global reviewer exclusion, and per-prediction reviewer exclusion.
- CSV export rebuilds from selected feedback only.
- Added regression test for prediction/global reviewer/per-prediction reviewer filtering.
- Verification:
  - `vp run build` ✅ warnings only: runtime-config non-module script and large chunks.
  - `vp test test/export-csv.test.ts` ✅ 2 tests.
  - `npx react-doctor@latest --verbose` ✅ score 99; warnings: existing admin infra exports/AuthHero bold heading plus helper export warning for new selection helper.
  - touched line cap ✅ all touched source files <=300.
  - `git diff --check` ✅ no whitespace errors; CRLF warnings only.

## External Reviewer Access Bugs

### Goal
- [x] Shared review URL from wrong/non-member user must not return 500.
- [x] Inviting user as `External Reviewer` must work.
- [x] Changing existing member to `External Reviewer` must work.

### Plan
- [x] Guard review-link preview/external checks from membership-denied exceptions.
- [x] Map locked `EXTERNAL_REVIEWER` role definition to legacy `VIEWER`.
- [x] Add regression tests for invite + role change + review-link access checks.
- [x] Verify backend tests/package, line caps, diff, graph.

### Review
- Status: fixed.
- Review link auth checks now return false for users outside token org instead of bubbling access exceptions.
- Invitation and member-role update now preserve `roleDefinition.systemKey=EXTERNAL_REVIEWER` while storing legacy `OrganizationRole.VIEWER`.
- Verification:
  - `mvn -q "-Dtest=InvitationManagementServiceTest,OrganizationManagementServiceTest,WorkspaceAuthorizationServiceTest,ReviewLinkServiceTest" test` ✅
  - `mvn -q "-Dmaven.test.skip=true" package` ✅
  - touched line cap ✅ all touched Java files <=300.
  - `git diff --check` ✅ no whitespace errors; CRLF warnings only.

### Review update
- Removed duplicated hardcoded external-reviewer metadata from seed/auth/invite/change-role/test paths.
- Added `OrganizationSystemRole` as single source for system key, label, slug, and legacy role mapping.
- Invite and member-role update now call same legacy-role resolver instead of duplicating switch/string logic.
- Verification:
  - `mvn -q "-Dtest=InvitationManagementServiceTest,OrganizationManagementServiceTest,WorkspaceAuthorizationServiceTest,ReviewLinkServiceTest" test` ✅
  - `mvn -q "-Dmaven.test.skip=true" package` ✅
  - touched line cap ✅ all touched Java files <=300.
  - `git diff --check` ✅ no whitespace errors; CRLF warnings only.
