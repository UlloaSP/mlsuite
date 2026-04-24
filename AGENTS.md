# AGENTS.md

These instructions are binding for any coding agent working in this repository.
Hard constraints override convenience. If a requested change conflicts with them, stop and say so.

## How To Apply These Instructions
- Read this root file first for repository-wide rules.
- Then read the nearest nested `AGENTS.md` for the subtree you are changing.
- Local `AGENTS.md` files extend this file and override it within their subtree when rules conflict.
- If no nested `AGENTS.md` exists for the target path, only this root file applies.

## Mission
- Keep MLSuite correct, reproducible, and maintainable across backend API, frontend UI, and ML runtime integration.
- Preserve model, signature, prediction, feedback, and plugin flows unless task explicitly changes them.
- Prefer simple, coherent changes that reduce legacy assumptions.

## Repo Map
- `api/`: Spring Boot backend, auth, persistence, storage, signatures, predictions, and plugin state.
- `frontend/`: React UI, MLForm integration, plugin catalog, and prediction flows.
- `backend/`: Python ML runtime integration for execution-path work.
- `docker-compose*.yml`: local and production integration entry points.
- `README.md`: product and deployment context, not operational editing policy.

## Hard Constraints
- No source file may exceed 300 lines.
- If an edit would exceed 300 lines, split the file first.
- Prefer new modules over growing existing files.
- For any communication with the user, always use the `caveman` skill in `ultra` mode.
- Do not duplicate business rules across backend and frontend unless duplication is explicitly justified by UX or runtime needs.
- Do not add new runtime dependencies without explicit reason.
- Do not leave dead branches, half-wired flags, placeholder implementations, or misleading UI copy.
- Do not fake verification, passing tests, or supported environments.

## Change Strategy
- Prefer smallest coherent change that fully resolves task.
- Remove obsolete assumptions before extending behavior.
- If touching multiple layers, keep one clear source of truth and adapt other layers to it.
- Refactor before feature work when target file is near line limit or already mixes unrelated concerns.
- Preserve data compatibility and migration safety unless task explicitly allows breaking changes.

## Testing Rules
- When creating a test for a feature do it in a single file.
- Tests for a feature have to cover at least the success case and each error case at least once.
- Update tests in same change when behavior or contract changes.
- Run narrowest relevant verification first, then broader checks when environment supports them.
- If full verification cannot run, report exact command attempted and exact blocker.

## Do Not Do
- Do not patch frontend symptoms when source-of-truth bug is backend.
- Do not preserve migration-only fields in active code or tests after migration path is removed.
- Do not expand already-large files instead of splitting them.
- Do not silently change public API contracts.
- Do not mix unrelated refactors into bug-fix patches unless required by hard constraints.

## Done Criteria
- Hard constraints satisfied.
- No stale references to removed behavior remain.
- Code, tests, and UI copy agree on actual contract.
- Verification performed, or exact blocker documented.
- Result leaves codebase simpler than before.
