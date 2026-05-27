# Tile Drop Targets

## Goal
- [x] Allow dragging a model file onto an empty tile model selector.
- [x] Allow dragging a dataframe file onto an empty tile dataframe selector.
- [x] Reuse backend artifact inspection so model/dataframe validation stays consistent.
- [x] Verify targeted frontend tests, line cap, graph update.

## Plan
- [x] Inspect tile selector component and create-model page callbacks.
- [x] Add drop handlers to tile selectors.
- [x] Wire dropped files through existing inspection/attach logic.
- [x] Run focused verification and document results.

## Review
- Tile selectors now accept dropped files and call the same attach/inspect path as click browse.
- Frontend: `vp test model-bundle-files.test.ts artifact-inspection-service.test.ts` -> passed.
- `vp check --fix` formatted touched files; command still exits nonzero because existing `tsconfig.app.json` has removed `baseUrl` option.
- Line cap checked; touched source files remain under 300 lines. `git diff --check` passed with line-ending warnings only.
