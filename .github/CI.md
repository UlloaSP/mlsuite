# CI and repository protection

`ci.yml` validates PRs targeting main/develop and pushes to those branches. It is
also callable by image publication, which cannot start until CI succeeds.
The stable required check is `CI required`; it succeeds only when frontend, API,
both Python components, and configuration checks succeed. Failed, skipped, and
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
  resolved with the public template, and checksum-verified actionlint.

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

The old `.env` remains in repository history and older branches. Determine where
its credentials were reused, rotate them at each service, update private
configuration, and verify clients before retiring the old values. No credentials
were rotated by this change because active usage is unknown. Coordinate any
history rewrite separately; it does not replace rotation.

Image immutability, deployment environments, migrations, runtime secret
validation, and production deployment are subsequent work. Existing `latest`
publication semantics have not been changed by this CI foundation.
