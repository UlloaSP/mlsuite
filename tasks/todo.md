# Crystal Tree Visibility Regression

## Goal
- [x] Explanation appears in prediction modal after submit.
- [x] Explanation persists and appears in prediction detail/history.
- [x] Explanation appears in external review detail.

## Plan
- [x] Trace MLForm report payload shape after `defineReportKind` fetch.
- [x] Trace persisted prediction `reports` and explanation extraction.
- [x] Patch source of truth, not display-only fallback.
- [ ] Verify targeted tests, typecheck/build, line cap, React Doctor, graphify.

## Review
- Root cause: plugin `resolve` returned `null` when no submitted report payload existed.
- MLForm 0.1.11 treats `null` as ready payload, so report never stays idle and `fetch.submit` does not run.
- Plugin fix: return `undefined` when no persisted payload exists; MLForm keeps report idle, then fetches after submit.
- Repo code not patched; active plugin source lives outside checked-in frontend source in this case.

# MLForm 0.1.11 Upgrade Plan

## Goal
- [x] Upgrade frontend `mlform` dependency to `0.1.11`.
- [x] Use shipped MLForm declarations; no local `.d.ts` shim.
- [x] Keep prediction, questionnaire, custom field/report/explanation flows working.
- [x] Verify tests/build/react-doctor/graph.

## Plan
- [x] Install `mlform@0.1.11` through Vite+ workflow.
- [x] Inspect 0.1.11 public exports and declaration layout.
- [x] Remove any remaining manual type workaround if 0.1.11 exposes needed types.
- [x] Run TypeScript, tests, build, react-doctor.
- [x] Update graphify and review notes.

## Review
- Status: fixed.
- `mlform` upgraded to `0.1.11`.
- No manual `.d.ts` shim; 0.1.11 exposes needed kit/primitives types through package exports.
- Removed MLForm `tsconfig` path overrides; bundler resolution uses package exports.
- Verification:
  - `vp exec tsc -b --pretty false` passed.
  - `vp test run --run` passed: 9 files, 38 tests.
  - `vp run build` passed; existing `runtime-config.js` and chunk-size warnings remain.
  - `vp install --frozen-lockfile` passed.
  - `git diff --check` passed with CRLF warnings only.
  - `npx react-doctor@latest --verbose` ran, exits nonzero on existing unrelated issues, score 84.
  - touched source line cap passed; only existing unrelated files exceed 300 lines.
  - `graphify update .` passed; graph.html skipped due graph size limit.

# MLForm 0.1.11 Legacy Cleanup Plan

## Goal
- [ ] Remove active MLSuite domain knowledge of "explanation" where MLForm report semantics now apply.
- [ ] Rename frontend files/types/functions/vars from explanation-specific wording to report wording where not DB/API compatibility.
- [ ] Remove unnecessary disable/suppress directives by replacing casts/workarounds with typed boundaries.
- [ ] Preserve persisted compatibility for existing explanation feedback/API/storage where migration cost requires explicit backend change.

## Plan
- [ ] Read nearest `AGENTS.md` for touched subtrees before source edits.
- [ ] Inventory `explanation` references into buckets: public/persisted compat, backend analyzer endpoint, frontend report UI, feedback storage.
- [ ] Inventory suppressions and decide: remove, narrow, or justify if unavoidable.
- [ ] Refactor frontend MLForm-facing code so report is primary concept; explanation becomes only report kind/config detail.
- [ ] Update tests and UI copy to say reports unless legacy API contract forces otherwise.
- [ ] Verify targeted tests/typecheck/build, line cap, `rg` stale terms, `graphify update .`.

## Review
- Pending check-in before implementation.

# MLForm 0.1.11 Report Debt Cleanup Implementation

## Goal
- [x] Make MLSuite active frontend/report code use report terminology instead of explanation terminology.
- [x] Keep `explanation` names only at explicit compatibility boundaries: persisted feedback API/DB, analyzer `/explain`, legacy payload key `explanations`, and existing external contract DTO names.
- [x] Remove avoidable suppression comments introduced around MLForm/report feedback.
- [x] Remove unchecked Java suppressions in analyzer API client.

## Plan
- [x] Rename frontend report extraction/state files and components from `Explanation*` to `Report*`.
- [x] Rename active TS types/fns/vars: `PredictionExplanationDescriptor` -> `PredictionReportDescriptor`, `explanationId` -> `reportId`, `explanations` -> `reports/reportContent`.
- [x] Keep API method names like `createExplanationFeedback` until backend contract migration exists; isolate them behind report-facing UI names.
- [x] Remove obsolete MLForm helper `explanationConfig.ts`; no consumers remained.
- [x] Replace local `react-doctor-disable` clusters in touched report feedback components with source-key state patterns.
- [x] Replace `@SuppressWarnings("unchecked")` in `AnalyzerServiceImpl` with typed response helper.
- [x] Update imports/tests/UI copy and run stale-reference checks.
- [x] Verify frontend typecheck/tests/build, API compile, line cap, `graphify update .`.

## Review
- Renamed report feedback extraction/components/tests to report-first names.
- UI copy now says reports/report feedback where MLSuite presents MLForm artifacts.
- Remaining `explanation` terms are compatibility boundaries: API endpoints/DTOs/hooks, persisted `explanationFeedback`, analyzer `/explain`, legacy report payload `explanations`, and `meta.explainErrors`.
- Removed touched report feedback `react-doctor-disable` clusters and all `@SuppressWarnings("unchecked")` from `AnalyzerServiceImpl`.
- Verification:
  - `vp exec tsc -b --pretty false` passed.
  - `vp test run --run` passed: 8 files, 34 tests.
  - `vp run build` passed; existing `runtime-config.js` and chunk-size warnings remain.
  - `mvn -q -DskipTests compile` passed.
  - `npx react-doctor@latest --verbose` passed with score 98; remaining warnings are existing `dist` unused-file noise, pnpm hardening, and 2 `ReportQuestionnaireMount` effect warnings.
  - touched source line cap passed.
  - stale old names check passed.
  - `graphify update .` passed; graph.html skipped due graph size limit.

# Prediction Detail Feedback Wizard + Classifier Mapping Fix

## Goal
- [x] Fix output feedback classifier mapping so saved values map to real class labels, not numeric/rating artifacts.
- [x] In prediction detail, show feedback questionnaire immediately when no feedback exists; no initial Edit click.
- [x] Replace per-output/per-report feedback cards in prediction history detail with one combined questionnaire, one step per report needing feedback.
- [x] Preserve existing output target display and inputs as context after the questionnaire.

## Plan
- [x] Add regression test for classifier output feedback mapping.
- [x] Inspect `output-feedback-questionnaire`, `output-feedback-values`, target update request, and prediction detail composition.
- [x] Reuse combined questionnaire pattern from review portal for app prediction detail, but with app API mutations.
- [x] Update detail status logic to count one combined report-feedback flow.
- [x] Match external review order: questionnaire first, outputs second, inputs third.
- [x] Verify typecheck/tests/build, stale names, line cap, graphify.

## Review
- Classifier output feedback now serializes schema/prediction mapping values, so `cab` stays `cab` instead of index `2`.
- Target update normalization now resolves raw feedback through classifier mapping, labels, and numeric fallback.
- Prediction detail now has one combined feedback questionnaire. If feedback is missing, it opens immediately; after completion, it shows summaries with each step/report label and one Edit action.
- Prediction detail order now matches external review: feedback questionnaire, outputs, inputs.
- Verification:
  - `vp exec tsc -b --pretty false` passed.
  - `vp test run --run` passed: 8 files, 35 tests.
  - `vp run build` passed; existing `runtime-config.js` and chunk-size warnings remain.
  - `npx react-doctor@latest --verbose` passed with score 98; remaining warnings are existing `dist` unused-file noise, pnpm hardening, and 2 `ReportQuestionnaireMount` effect warnings.
  - `git diff --check` passed with CRLF warnings only.
  - touched source line cap passed.

# Prediction Detail Reports Follow-up

## Goal
- [x] Saved feedback summary shows both classifier option label and mapping value when they differ.
- [x] Rename the output context panel from Output Targets to Reports.
- [x] Reports panel shows output report cards and MLForm report entries such as Crystal Tree.

## Plan
- [x] Extend questionnaire field descriptors with option labels/values for display-only summaries.
- [x] Update report feedback summary formatter to render `label (value)` for mapped category options.
- [x] Update prediction reports panel to include target reports plus extracted report entries.
- [x] Verify focused tests, typecheck, line cap, graphify.

## Review
- Saved feedback summaries now render mapped category feedback as `label (value)` when option label differs from stored mapping.
- `Output Targets` visible panel is now `Reports`.
- `PredictionReportsPanel` renders output target reports first, then extracted MLForm report entries; Crystal Tree appears as the next report when present in prediction report entries.
- Verification:
  - `vp exec tsc -b --pretty false` passed.
  - `vp test run --run` passed: 8 files, 35 tests.
  - `vp run build` passed; existing `runtime-config.js` and chunk-size warnings remain.
  - `npx react-doctor@latest --verbose` passed with score 98; remaining warnings are existing `dist` unused-file noise, pnpm hardening, and 2 `ReportQuestionnaireMount` effect warnings.
  - `git diff --check` passed with CRLF warnings only.
  - touched source line cap passed.

# Prediction Feedback 5xx + Crystal Tree Text Payload

## Goal
- [x] Saving prediction detail feedback no longer trips duplicate/draft feedback 5xx paths.
- [x] Crystal Tree report feedback stores only the formatted text payload for now.
- [x] Keep questionnaire UX unchanged.

## Plan
- [x] Inspect frontend save payloads and backend feedback request/service contracts.
- [x] Add focused regression tests for backend feedback create/upsert behavior.
- [x] Patch backend create feedback paths to upsert same prediction/user/order instead of duplicate insert.
- [x] Patch Crystal Tree report storage to persist formatted text-only value and feedback answers as `realValue`.
- [x] Verify focused tests, typecheck/build, line cap, graphify.

## Review
- Root cause: app detail could miss existing draft/unpublished feedback, then POST create hit the unique `(prediction, order, user)` constraint and surfaced as 500.
- Backend create output/report feedback now upserts existing same prediction/user/order rows.
- App report feedback save now writes formatted Crystal Tree text into `value`; questionnaire answers go into `realValue`.
- Existing legacy report feedback rows are corrected on next save because the app always upserts the report text before updating `realValue`.
- Verification:
  - `mvn -q '-Dtest=OutputFeedbackServiceTest,ExplanationFeedbackServiceTest' test` passed.
  - `mvn -q -DskipTests compile` passed.
  - `vp exec tsc -b --pretty false` passed.
  - `vp test run --run` passed: 8 files, 35 tests.
  - `vp run build` passed; existing `runtime-config.js` and chunk-size warnings remain.
  - `npx react-doctor@latest --verbose` passed with score 98; remaining warnings are existing `dist` unused-file noise, pnpm hardening, and 2 `ReportQuestionnaireMount` effect warnings.
  - `git diff --check` passed with CRLF warnings only.
  - touched source line cap passed.

# Crystal Tree Report Display Fallback

## Goal
- [x] Reports panel shows saved Crystal Tree formatted text even when prediction payload has no report content.

## Plan
- [x] Reuse report content normalization for string feedback values.
- [x] Pass current user's report feedback into `PredictionReportsPanel`.
- [x] Fall back from missing prediction report content to `explanationFeedback.value`.
- [x] Verify focused test/typecheck/line cap/diff check.

## Review
- Root cause: Reports panel rendered only `prediction.prediction.reports`; saved Crystal Tree text lives in report feedback `value` when runtime did not return report content.
- Added `getFormattedReportContent()` and used it as panel fallback.
- Verification:
  - `vp exec tsc -b --pretty false` passed.
  - `vp test run --run test/report-feedback.test.ts` passed: 8 tests.
  - `git diff --check` passed with CRLF warnings only.
  - touched source line cap passed.

# Crystal Tree Explanation Text Priority

## Goal
- [x] Crystal Tree runtime payload uses plugin `explanation` string as canonical display/save text.
- [x] Legacy `explanations[]` stays fallback only.
- [x] Saved/displayed Crystal Tree report never shows raw object/json when `explanation` exists.
- [x] Prediction modal/history persist Crystal Tree report payload after MLForm fetch.

## Plan
- [x] Add regression test with real plugin payload shape: `explanation`, `explanations`, `endpoint`, `modelId`.
- [x] Patch report content normalization to prefer `explanation` before legacy arrays/custom JSON fallback.
- [x] Patch feedback-report detection to recognize MLForm report controllers via `report.config`.
- [x] Verify focused frontend tests, typecheck/build, line cap, graphify.

## Review
- Root cause 1: Crystal Tree plugin returns canonical formatted text in `explanation`, but MLSuite preferred legacy raw `explanations[]`.
- Root cause 2: create-prediction flow checked `isFeedbackReportConfig(report)` on MLForm `ReportController`; metadata lives in `report.config`, so reports were not tracked as pending or persisted.
- Fixed normalization so `explanation` is canonical and `explanations[]` fallback only.
- Fixed report detection for both raw schema reports and MLForm report controllers.
- Verification:
  - `vp test run --run test/report-feedback.test.ts` passed: 10 tests.
  - `vp exec tsc -b --pretty false` passed.
  - `vp run build` passed; existing `runtime-config.js` and chunk-size warnings remain.
  - `npx react-doctor@latest --verbose` passed with score 98; existing `dist` unused-file noise, pnpm hardening, and `ReportQuestionnaireMount` effect warnings remain.
  - `git diff --check` passed with CRLF warnings only.
  - touched source line cap passed.
  - `graphify update .` passed; graph.html skipped due graph size limit.

# External Review Outputs Context Fix

## Goal
- [x] External review shows one context section named Outputs.
- [x] Generated reports appear inside Outputs, not separate Reports section.
- [x] Current output side card follows questionnaire step changes, including report steps.
- [x] Saved external review classifier feedback shows mapping only, not numeric raw value.
- [x] Prediction history feedback closes to saved summary after successful save.
- [x] Prediction history saved classifier summary shows only mapping label, without raw value suffix.

## Plan
- [x] Inspect review combined questionnaire step state wiring and context sections.
- [x] Reuse existing output/report descriptors but present both as output artifacts in review UI.
- [x] Fix active-step publication so MLForm wizard navigation updates side context.
- [x] Resolve saved classifier summary through questionnaire options before display.
- [x] Keep last submitted prediction-history feedback values locally so UI closes immediately after save.
- [x] Make option-based feedback summaries render the selected option label only.
- [x] Verify focused tests/typecheck/build/react-doctor/line cap/graphify.

## Review
- External review detail now has one Outputs section; generated reports are rendered there as output artifacts.
- Combined review questionnaire report steps are titled as outputs, while persistence still routes report answers through report feedback.
- Current output side card subscribes to MLForm view wizard state, so it changes when the wizard step changes.
- Saved classifier feedback summary resolves numeric legacy/raw values through the field options and displays only the mapping.
- Prediction history feedback stores submitted values locally after save, so the questionnaire closes even if refetch data is not visible in the same render.
- Shared feedback summary formatter now omits raw option values, so `b (1)` becomes `b`.

# Prediction History Direct Feedback Completion

## Goal
- [x] Feedback saved from prediction history updates prediction feedback status directly.
- [x] External review keeps PENDING -> REVISION -> SUBMITTED workflow.

## Plan
- [x] Trace app feedback save services and review-link feedback services separately.
- [x] Patch app feedback create/update path to publish direct app feedback.
- [x] Keep review-link draft save path unchanged.
- [x] Add focused backend regression tests for app direct completion.
- [x] Verify backend tests, compile, line cap, graphify.

## Review
- App feedback endpoints now create review submission markers for any selected review link predictions owned by the same user/prediction. That makes history feedback published immediately.
- Review portal endpoints still only save draft feedback; they do not create submission markers until `submit`.
- Prediction status still recomputes after app output/report feedback save.
