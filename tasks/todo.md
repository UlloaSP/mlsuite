# GitHub-canonical GitLab mirror

- [x] Keep GitHub as the only merge authority and remove the local multi-push configuration.
- [x] Mirror GitHub `main` and `develop` to GitLab with a dedicated least-privilege credential.
- [x] Preserve GitLab CI deployment on mirrored pushes to `main`.
- [x] Reconcile divergent branch histories without losing unique documentation.
- [x] Verify identical refs, pipeline trigger, and Shelob deployment.

## Review

- GitHub Actions mirror run 34973385481 updated GitLab `develop` to exact SHA `23fd2e50bb8c550cb3a1d62361ecb6394eae85a6`.
- GitLab pipeline 16447 started from the mirrored push; its first secret scan exposed an unreachable pre-force base and prompted a full-tree fallback.
- Previous deploy evidence retained: pipeline 16443 deployed GitLab main SHA `7d878edfea2c47747e40e5ae4df2e9ffe588be41`; all six services were up and readiness returned `ready: true`.
- Corrected mirrored `develop` pipeline 16449 passed, including secret scanning, frontend, API, Python, and configuration jobs.
- GitHub Actions mirror run 34974526588 made GitHub and GitLab `main` identical at `6bae2aa27caca32c67eb75307f4d4b7bfa6050e7`.
- GitLab pipeline 16450 passed; retried deploy job 39603 rebuilt Shelob successfully. All six services are running and readiness returns `ready: true`.

# GitLab runner connectivity probe

- [x] Verify `develop` matches on GitHub and GitLab.
- [x] Add an untagged, read-only runner probe for Shelob DNS and TCP/22.
- [x] Confirm the instance runner accepts untagged Docker jobs; DNS lookup failed.
- [x] Validate the GitLab pipeline result before adding SSH credentials or deployment.

## Review

- Pipeline 16430 passed on `balrog-docker-runner` using its Docker executor.
- Runner has no tags and accepts untagged jobs.
- Shelob FQDN is not resolvable there; direct TCP/22 to `10.56.35.200` succeeds.
- No SSH credentials were loaded and no remote command or deployment ran.

# GitLab CI/CD and Shelob deployment

- [x] Confirm automatic deployment target: push to `main` only.
- [x] Mirror existing frontend, API, Python, secret, configuration, and release checks.
- [x] Gate and serialize SSH deployment after all checks pass.
- [x] Require exact GitLab commit identity and a clean remote checkout.
- [x] Run detached development Compose and require readiness JSON `ready: true`.
- [x] Install a dedicated CI deploy key and protected GitLab file variables.
- [x] Validate merge-request pipeline; document exact results.

## Review

- Dedicated ED25519 key fingerprint: `SHA256:0j47BGjmqa9CVeYPtwWxUT5SX5etkLp0QA/UBo4dh7I`.
- GitLab stores private key and verified host key as protected File variables.
- Shelob fetches GitLab through a separate read-only deploy key on SSH port 7022.
- Temporary local private-key copy was removed after upload and authentication check.
- Pipeline 16434 passed frontend, API, both Python components, secret scanning, and configuration validation.
- Deploy job was absent from the merge-request pipeline, as required; first execution remains gated on a push to `main`.


## Recover deleted local environment (2026-09-16)

- [x] Confirm `.env` is absent and ignored.
- [x] Locate newest exact Git object predating removal from tracking.
- [x] Restore `.env` without exposing secrets or changing index.
- [x] Verify restored file byte-for-byte by Git blob hash.

Review: restored 3,632-byte `.env` with 54 keys from the last tracked copy. Blob hash matches exactly; file remains ignored.
