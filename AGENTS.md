# MLSuite

MLSuite is an open-source platform for turning trained machine-learning models into reproducible, reviewable applications. It manages model artifacts, generates typed input experiences from schemas, runs predictions, records feedback, and exports the resulting data.

The product spans a React client, a Spring Boot API, and a Python ML runtime. Treat them as one system.

## What makes MLSuite special?

### 1. Reproducibility end to end

A prediction is useful only when we can trace it to the exact model, schema, inputs, outputs, and feedback that produced it. Preserve those identities across storage, API payloads, runtime calls, UI state, and exports.

### 2. Schemas are product contracts

Schemas do more than validate JSON. They drive forms, runtime mappings, report rendering, review workflows, and export columns. A schema change is a cross-product contract change, not a local editor feature.

### 3. Feedback closes the ML loop

Predictions are not terminal output. Reviews, corrections, questionnaires, and exports turn runtime results into useful evaluation and retraining data. Keep that path complete and honest.

### 4. Three runtimes, one product

Spring owns durable business state and authorization. Python owns artifact inspection and model execution. React presents those contracts. Complexity belongs at the boundary that owns it; consumers should stay unsurprising.

## A note from the maintainer

I like ambitious ML workflows and simple systems. Do not preserve complexity because it already exists. Do not add machinery because it looks architecturally impressive. Find the real owner of a rule, implement it once, and make the resulting behavior obvious.

Channel both “measure twice, cut once” and YAGNI. Fight scope creep. The smallest complete fix is usually the best one.

These are strong defaults, not ritual. The developer directing the work can override them. If a request conflicts with data integrity, security, or a public contract, explain the conflict before proceeding.

## A small glossary

- **model** — a stored ML artifact and the metadata required to manage and execute it.
- **schema** or **signature** — the versioned contract for inputs, outputs, forms, mappings, and reports.
- **prediction** or **inference** — one execution tied to exact model and schema state.
- **feedback** — a human review, answer, validation, or correction attached to prediction results.
- **plugin** — an extension with catalog metadata, persisted state, runtime behavior, or custom rendering.
- **workspace** — the authorization boundary that owns models, schemas, predictions, reviews, and members.
- **runtime** — the Python service that inspects artifacts and executes models.

## The three ways to hurt yourself

1. **Fixing the visible symptom.** A broken React state may come from an API contract; an API failure may come from runtime mapping. Trace the whole path and fix the owner.
2. **Losing identity between layers.** Model ids, schema versions, report identities, runtime targets, and persisted results are related but not interchangeable. Preserve meaning at every handoff.
3. **Reviving deleted behavior.** Convenience fallbacks, compatibility shims, and old fixtures can quietly restore contracts the product no longer supports. Delete obsolete assumptions instead.

## Hit every affected layer

The most common defect is a change that works in one path and disagrees everywhere else. Before calling cross-cutting work done, decide which entries apply:

- **Contracts.** Requests, responses, persisted fields, schema mappings, runtime payloads, and exports must evolve together.
- **API.** Authentication, workspace authorization, business transitions, persistence, and storage belong to Spring.
- **Frontend.** Forms, catalogs, prediction flows, review flows, filters, badges, empty states, and copy must reflect real API data.
- **Runtime.** Artifact loading, coercion, schema analysis, prediction, and explanation must remain aligned with the API contract.
- **Plugins.** Catalog entries, activation state, persisted configuration, runtime reports, and custom renderers form one lifecycle.
- **Reverse states.** If a workflow gains a way in, include the authorized way out, recovery path, and visible state where the domain requires them.
- **Deployment.** Development and production Compose configurations must agree on service names, ports, storage, and environment contracts.

## Guardrails

- No source file may exceed 300 lines, excluding comments. Split by responsibility before crossing the limit.
- Prefer a focused module over growing a large or mixed-responsibility file.
- Add no runtime dependency without a concrete reason.
- Preserve data compatibility and migration safety unless the task explicitly permits a breaking change.
- Never change a public API contract silently.
- Leave no dead branches, stale migration fields, placeholders, half-wired flags, or misleading UI copy.
- Keep unrelated refactors out of focused fixes.
- Never claim a test, environment, or behavior was verified when it was not.
- Perform browser or visual verification only when the developer asks.

## Development

### API

- Work from `api/` using Maven.
- Keep controllers thin. Services own business rules and state transitions.
- Persisted state is the source of truth for custom fields, reports, explanations, and plugin configuration.
- Delete empty plugin state instead of storing empty payloads unless the contract requires them.
- Use service tests for state transitions and controller tests for HTTP contracts.

### Frontend

- Work from `frontend/` using Vite+ through `vp`. Do not use npm, pnpm, Yarn, npx, or direct Vite/Vitest commands.
- Read `frontend/ARCHITECTURE.md` before moving modules or changing dependency direction, ownership, state, or routing.
- Read `DESIGN.md` before requested visual changes.
- Keep one React component per file and organize by feature first.
- MLForm engine built-ins and MLSuite catalog plugins are different concepts.
- Search, filters, sorting, badges, empty states, and copy operate on fetched data, not invented categories.
- Keep `frontend/test/frontend-architecture.test.ts` passing without adding exceptions.

### Python runtime

- Work from `backend/` using `uv`.
- Keep routers thin. Services own load, schema, prediction, and explanation behavior.
- Share parsing and coercion instead of implementing format rules per endpoint.
- Do not add compatibility shims unless a supported API contract needs them.

## Verifying

- Start with the smallest proof that exercises the changed behavior, then broaden when risk warrants it.
- Update tests whenever behavior or a contract changes.
- Keep one feature’s tests in one file. Cover its success path and every error path at least once.
- Test observable behavior and current persisted contracts, not implementation trivia or removed history.
- For runtime behavior, inspect the relevant logs and outputs.
- If a check cannot run, report the exact command and blocker.

Do not perform a visual pass by default. When the developer requests one, verify the integrated behavior after the code-level checks.

## Documentation

Most changes do not need new prose. Code and tests should explain implementation.

- `README.md` owns product and deployment guidance.
- `frontend/ARCHITECTURE.md` owns durable frontend boundaries and dependency rules.
- `DESIGN.md` owns visual language and interface direction.
- Use a nearby code comment for a local trap whose reason is not obvious from the code.
- Rewrite stale guidance instead of appending a second account of the new behavior.

Keep agent policy in this root file. Do not add nested `AGENTS.md` files.

## Plans and work artifacts

Do not create or maintain repository files for agent plans, lessons, scratch notes, or debt ledgers. The conversation, issue, code, tests, and final diff are the work record.

## How it works

The React client gathers inputs from a versioned schema and sends them to the Spring API. Spring authenticates the user, enforces workspace permissions, resolves persisted model and schema state, and delegates artifact analysis or prediction to Python. The runtime loads the artifact and returns results. Spring persists traceable outputs and feedback; React renders the same contract for review and export.

Changes to this flow must preserve identity and meaning at every handoff.

## Where code lives

- `api/` — Spring Boot API, auth, persistence, storage, schemas, predictions, feedback, and plugin state.
- `frontend/` — React UI, MLForm integration, plugin catalog, prediction, review, and administration.
- `backend/` — FastAPI runtime, artifact inspection, schema analysis, and model execution.
- `docker-compose*.yml` — local and production integration.
- `README.md` — product and deployment context.

## Taste

- Boring ownership beats clever indirection.
- One source of truth beats synchronized copies.
- Deletion beats fallback code for unsupported behavior.
- Complete workflows beat speculative extension points.
- A root-cause fix beats repeated guards at every caller.
- Simplicity never excuses weak validation, error handling, authorization, accessibility, or data safety.
