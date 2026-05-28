# Create Model Rollback

## Goal
- [x] Make create-model all-or-nothing across model row and generated signatures.
- [x] Delete object-storage model artifact when any later schema/signature step fails.
- [x] Keep controller thin; orchestration belongs in API service layer.
- [x] Preserve existing upload buffering/reuse behavior.
- [x] Verify rollback tests, line cap, graph update.

## Plan
- [x] Add `ModelCreationService` with one `@Transactional` create flow.
- [x] Move controller orchestration into service.
- [x] In service catch failures after model creation, delete stored object, rethrow for DB rollback.
- [x] Test failure during signature creation rolls back model/signatures and deletes stored object.
- [x] Run focused API tests and graph update.

## Review
- Focused API tests passed: `mvn "-Dtest=ModelControllerTest,ModelServiceTest,ModelCreationServiceTest" test` (10 tests).
- Line cap passed for `api/src/main/java` and `api/src/test/java`.
- `git diff --check` passed with CRLF warnings only.
- `graphify update .` passed; `graph.html` skipped because graph has 7362 nodes over viz limit.
