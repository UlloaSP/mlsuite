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

Full frontend formatting/lint is not yet a required check. The 2026-09-11 audit
with Vite+ 0.2.5 reports formatting failures in 392 files from `vp check`, and
22 warnings across 13 files from `vp lint --format json`. Adding
`--deny-warnings` makes lint fail. Resolve that debt in a separate change before
adding the gate. This workflow does not suppress those failures or claim that
the repository passes full lint.

## Follow-up quality plan

1. Keep the existing Gitleaks job in `CI required`; do not add a second secret
   scanner to perform the same check. Preserve the private ignored `.env`.
2. Normalize frontend formatting in a dedicated feature PR from updated develop
   using the installed Vite+ formatter. Fix the lint warnings with focused tests
   where promise handling or value conversion changes behavior. Require formatting,
   type-aware lint with no warnings, tests and build before adding these commands
   to required CI. Use the same configuration locally and in Actions.
3. Introduce Python and Java rules in separate, reviewable changes. Neither
   component currently has a configured formatter/linter. Evaluate Ruff for both
   Python components and a Maven-integrated Java checker/formatter; pin versions,
   document the commands and normalize existing files before enforcing them.
   Keep new tooling in development/build dependencies.
4. Reassess MegaLinter only if coordinating those checks becomes useful. Select
   explicit linters/configurations, avoid competing formatters and duplicate
   Gitleaks/actionlint checks, and start without automatic source edits. A failing
   result blocks merges only when included in the protected required gate.
5. Optionally trial Qodo Cover on one component, manually triggered and with a
   bounded generation budget. Supply its coverage report and provider credential
   separately, review the generated tests in a complementary PR, and keep the
   generator non-blocking. A passing generated test or higher coverage alone does
   not prove the intended behavior. No generator or provider secret is configured
   by the release foundation PR.

For CodeRabbit, evaluate comments against the code before changing it. PR #5's
publisher timeout is addressed with real subprocess tests. Its default 80%
docstring-coverage warning is not an adopted project requirement or a test
coverage result. Document contracts and non-obvious decisions instead of adding
redundant docstrings to satisfy that percentage.

References: [MegaLinter](https://megalinter.io/latest/),
[Qodo Cover action and limitations](https://github.com/qodo-ai/qodo-ci#limitations).

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
