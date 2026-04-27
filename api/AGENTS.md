# AGENTS.md

This file extends `../AGENTS.md`.
Read root first, then this file for work inside `api/`.
If this file conflicts with root, this file wins for `api/`.

## Scope
- Applies to all files under `api/`.
- Covers Spring Boot API, persistence, auth, storage, signatures, predictions, and plugin state.

## Stack And Tools
- Java 25.
- Spring Boot 3.5.x.
- Maven via `mvn`.
- Spring Data JPA, Spring Security, OAuth2 client, PostgreSQL/H2, Testcontainers.

## Tooling Commands
- Use Maven commands from `api/` for build and test work.
- Prefer narrow verification first, then broader Maven verification when needed.
- If local environment cannot run Java 25 build or test, state exact command and exact blocker.

## Architecture Rules
- Controllers stay thin.
- Service layer owns business logic and state transitions.
- Persisted storage and state are source of truth for custom fields, reports, and explanations.
- If plugin state is empty, prefer deleting persisted state object or file instead of storing empty payload, unless contract says otherwise.
- Do not reintroduce legacy built-in plugin behavior through convenience code, fallback code, or test fixtures.
- Fix source-of-truth behavior in API instead of patching downstream symptoms when API owns contract.

## Testing Rules
- Prefer service tests for state transitions.
- Prefer controller tests for HTTP contract.
- Tests must reflect current persisted contract, not historical implementation details.
- When removing legacy assumptions, remove legacy test expectations in same patch.
