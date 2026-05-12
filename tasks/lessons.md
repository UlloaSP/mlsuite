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
