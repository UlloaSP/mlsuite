# Export Predictions Permission Plan

## Goal
- [x] Add `EXPORT_PREDICTIONS` permission.
- [x] Grant it by default to owner/admin roles.
- [x] Expose it in workspace permission DTO and role catalog.
- [x] Hide export CSV button when missing.
- [x] Verify backend/frontend build and graph.

## Plan
- [x] Update backend permission enum, catalog, seed sync, workspace permissions.
- [x] Update focused backend tests for owner/admin/member/viewer behavior.
- [x] Gate frontend export button from workspace context.
- [x] Run narrow tests, frontend build, line cap, graph update.

## Review
- Status: fixed.
- Backend adds `EXPORT_PREDICTIONS`, exposes `canExportPredictions`, and includes permission in Models catalog.
- Owner/admin get permission from system role mapper; existing system roles sync missing permissions during seed/ensure.
- Frontend export button now renders only with `canExportPredictions`; related export data queries stay disabled without it.
- Split frontend permission DTO/types from `workspace/types.ts`; file now under 300 lines.
- Verification:
  - `mvn -q "-Dtest=WorkspaceAuthorizationServiceTest,InvitationManagementServiceTest" test` ✅
  - `vp run build` ✅ warnings only: existing `runtime-config.js` and chunk size warnings.
  - `npx react-doctor@latest --verbose` ✅ score 98; existing warnings only.
  - touched source line cap ✅ no touched file over 300 lines.
  - `git diff --check` ✅ CRLF warnings only.
  - `graphify update .` ✅ graph updated; graph.html skipped because graph exceeds viz limit.
