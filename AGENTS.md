# AGENTS.md

These instructions are binding for any coding agent working in this repository.
Hard constraints override convenience. If a requested change conflicts with them, stop and say so.

## Mission
- Keep MLSuite correct, reproducible, and maintainable across backend API, frontend UI, and ML runtime integration.
- Preserve model, signature, prediction, feedback, and plugin flows unless task explicitly changes them.
- Prefer simple, coherent changes that reduce legacy assumptions.

## Repo Map
- `api/`: Spring Boot backend, Java 25, auth, persistence, storage, signatures, predictions, plugin state.
- `frontend/`: React 19 + TypeScript + Vite+, MLForm integration, plugin catalog, prediction UI.
- `backend/`: Python service/runtime integration when task touches ML execution path.
- `docker-compose*.yml`: local/prod integration entry points.
- `README.md`: product and deploy context, not operational editing policy.

## Hard Constraints
- No source file may exceed 300 lines.
- If an edit would exceed 300 lines, split the file first.
- Prefer new modules over growing existing files.
- For any visual frontend change, always use the `frontend-design` skill and review `DESIGN.md` before editing.
- For any communication with the user, always use the `caveman` skill in `ultra` mode.
- Do not duplicate business rules across backend and frontend unless duplication is explicitly justified by UX/runtime needs.
- Do not add new runtime dependencies without explicit reason.
- Do not leave dead branches, half-wired flags, placeholder implementations, or misleading UI copy.
- Do not fake verification, passing tests, or supported environments.

## Change Strategy
- Prefer smallest coherent change that fully resolves task.
- Remove obsolete assumptions before extending behavior.
- If touching multiple layers, keep one clear source of truth and adapt other layers to it.
- Refactor before feature work when target file is near line limit or already mixes unrelated concerns.
- Preserve data compatibility and migration safety unless task explicitly allows breaking changes.

## API Rules
- Controllers stay thin; service layer owns business logic and state transitions.
- Persisted storage/state is source of truth for custom fields, reports, and explanations.
- If plugin state is empty, prefer deleting persisted state object/file instead of storing empty payload, unless contract says otherwise.
- Tests must reflect current persisted contract, not historical implementation details.
- Do not reintroduce legacy built-in plugin behavior through convenience code, fallback code, or test fixtures.
- If local environment cannot run Java 25 build/test, state exact blocker in final report.

## Frontend Rules
- UI must reflect backend contract, not historical assumptions.
- Do not label items as `system`, `builtin`, or special unless backend model explicitly supports it.
- MLForm engine built-ins are not the same thing as MLSuite app plugin catalog items. Do not conflate them.
- Search, filter, sort, badges, empty states, and copy must operate on real fetched data only.
- Prefer removing legacy UI branches over preserving compatibility with deleted backend behavior.
- Keep pages/components composable; split before crossing line limit.

## Testing Rules
- When creating a test for a feature do it in a single file.
- Tests for a feature has to cover at least the success case and all the error case at least once.
- Update tests in same change when behavior or contract changes.
- Prefer service tests for state transitions, controller tests for HTTP contract, and frontend tests for visible behavior.
- When removing legacy assumptions, remove legacy test expectations in same patch.
- Run narrowest relevant verification first, then broader checks when environment supports them.
- If full verification cannot run, report exact command attempted and exact blocker.

## Do Not Do
- Do not patch frontend symptoms when source-of-truth bug is backend.
- Do not preserve migration-only fields in active code/tests after migration path is removed.
- Do not expand already-large files instead of splitting them.
- Do not silently change public API contracts.
- Do not mix unrelated refactors into bug-fix patches unless required by hard constraints.

## Done Criteria
- Hard constraints satisfied.
- No stale references to removed behavior remain.
- Code, tests, and UI copy agree on actual contract.
- Verification performed, or exact blocker documented.
- Result leaves codebase simpler than before.
