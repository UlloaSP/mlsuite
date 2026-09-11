# CI and repository protection

`ci.yml` validates PRs targeting main/develop and pushes to those branches. It is
also callable by image publication, which cannot start until CI succeeds.
The stable required check is `CI required`; it succeeds only when secret scanning,
frontend, API, both Python components, and configuration checks succeed. Failed, skipped, and
cancelled dependencies do not satisfy it.

CI uses hosted Ubuntu runners and read-only repository permissions. It receives
no deployment secrets. Actions are pinned to complete commit SHAs. Python and
Java test reports are retained for seven days; frontend results appear in logs.

## Checks

Branch flow is feature branch -> PR to develop -> PR from develop to main.
Fetch/pull the relevant branches before branching or integrating changes. Feature
PRs must not target main; CI rejects main PRs unless their source is this
repository's develop branch. Integrate and validate in develop before opening
the promotion PR. Opening a PR does not authorize its automatic merge.

- Frontend: locked install, all tests, TypeScript and production build.
  Tests disable Node 25's native Web Storage so jsdom supplies browser storage.
- API: Maven verify, including architecture tests and packaging.
- Backend/ops-agent: locked dependency validation and all pytest tests.
- Configuration: no tracked private `.env` files, both Compose definitions
  resolved with the public template, release contract/lifecycle tests, and checksum-verified actionlint.
- Secrets: checksum-pinned Gitleaks 8.30.1 scans the committed tree and incoming
  commits. Logs expose only finding metadata, never secret values. Download,
  scan, or history-boundary errors fail the required gate.

Full frontend formatting/lint is not yet a required check: the initial
`vp check` baseline reported formatting failures in 315 files. Resolve that debt
in a separate change before adding the gate. This workflow does not suppress its
failures or claim that the repository passes full lint.

## Develop and main protection

Both branches require a PR, `CI required` from GitHub Actions, an up-to-date branch, resolved
review conversations, and no force-pushes or branch deletion. Apply protection
to administrators too. The sole current maintainer can merge their own PR after
checks pass: no independent approval is required until another reviewer exists.
CODEOWNERS identifies responsibility without creating an impossible self-review.

Keep GitHub secret scanning and push protection enabled. Status-check protection
must be configured in GitHub repository settings; the YAML alone does not enforce
merges. Verify the check has actually run before making it required.

## Private configuration

Copy `.env.example` to `.env` and fill blank secrets locally. Never commit an
active `.env` or copy its values to CI. Compose validation uses only the example;
it is not a runtime test and does not establish that its blank credentials work.

The maintainer confirmed on 2026-09-11 that credentials from the old `.env` were
used only in local Docker. That private file is preserved; no deployed-service
credential rotation is outstanding based on that confirmation. Never reuse those
historically published values for deployed environments. If external reuse is
later discovered, rotate it at the issuing service and update its consumers.
No history rewrite or local credential change was performed.

The obsolete, unreferenced local TLS keystore was removed from the current tree.
It also remains in history and must never be reused for deployed TLS.

Secret scanning has an explicit history boundary at cleanup commit
`4ade4f783a3b8c121cac9d623e4f162e5260e0e5`. Historical credentials before that boundary
are not re-scanned by this gate. The complete current committed tree is always
scanned, plus the incoming commit range after that boundary, including secrets
added and later removed within a PR. Ignored local files are never read. The
scanner does not honor repository allowlists or inline suppression comments.
GitHub secret scanning and push protection remain enabled independently.

Image publication now creates complete immutable build releases. See
[release contract and limitations](../docs/RELEASES.md). Deployments, migrations,
runtime secret validation and production promotion are subsequent work.
