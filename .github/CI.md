# CI and repository protection

GitHub is the canonical source repository. Feature work targets `develop`; promotion to `main` happens through a separate pull request after validation. GitHub mirrors the resulting refs to GitLab, where the deployment pipeline runs.

## Required GitHub checks

`.github/workflows/ci.yml` runs for pull requests and pushes to `develop` and `main`, and is callable by the release workflow. Its stable aggregate check is `CI required`.

The workflow verifies:

- committed-secret history with the repository scanner;
- frontend locked install, tests, TypeScript, and production build;
- Maven tests and API packaging;
- backend and ops-agent locked Python tests;
- Compose resolution and immutable-release contract tests.

CI uses hosted Ubuntu runners, read-only repository permissions, and no deployment secrets. Actions are pinned to full commit SHAs. A skipped, cancelled, or failed dependency does not satisfy the aggregate check.

Full frontend formatting and lint are not required until the existing baseline is clean. Do not add a required gate that the repository cannot pass, and do not hide failures with `continue-on-error`.

## Branch protection

Protect `develop` and `main` with:

- pull requests required;
- `CI required` required and up to date;
- resolved review conversations;
- force-push and deletion disabled.

A pull request to `main` must originate from this repository's `develop` branch. Repository settings enforce protection; workflow YAML alone does not.

`CODEOWNERS` identifies responsibility without requiring an impossible self-review for a sole maintainer.

## Secrets

Keep active configuration in ignored `.env` files. Commit only sanitized names and defaults to `.env.example`.

The secret scanner always checks the current committed tree and incoming commits after cleanup boundary `4ade4f783a3b8c121cac9d623e4f162e5260e0e5`. Historical credentials before that boundary are not accepted for reuse; deleting a secret from Git does not revoke it.

GitHub secret scanning and push protection remain independent safeguards. Pull requests and forked code never receive deployment credentials.

## Releases

`.github/workflows/publish-ghcr.yml` runs CI before publishing four immutable application images and their release manifest. It does not update `latest`.

See [the release contract](../docs/RELEASES.md) for image identity, verification, retry behavior, and consumption limits.

## GitLab

`.github/workflows/mirror-gitlab.yml` mirrors canonical GitHub refs. GitLab CI repeats component and configuration checks before deployment so the target forge verifies the exact mirrored commit it receives.

Keep check commands aligned across both systems. GitLab deployment credentials must remain protected and separate from GitHub CI.
