# Immutable application releases

The application version remains 0.1.0. Each successful publication from `main`
creates a prerelease named `build-<full Git commit SHA>`. This is a build identity,
not a semantic version increment or a production deployment.

## Publication contract

1. A push to `main`, or a manual run on `main`, validates the source reference.
2. An existing complete immutable release is verified and reused without rebuilding.
3. Otherwise CI must pass, including secret scanning, before building candidates.
4. Four Linux AMD64 images are built with SBOM and provenance attestations. Each
   candidate tag includes the commit, run ID and attempt; no moving tag is written.
5. Trivy 0.74.0 scans the exact digests. HIGH/CRITICAL vulnerabilities, including
   unfixed vulnerabilities, block the release. Scanner/download errors also fail.
   Reports are retained in Actions for 30 days. There are no vulnerability exceptions.
6. All four image records must agree on the source commit and expected repositories.
7. A draft receives `release.json`, `release.json.sha256`, and
   `docker-compose.release.yml`. Uploaded bytes/checksums are checked before publishing.
8. Publication succeeds only if GitHub reports the release as immutable and its
   tag points to the expected commit. Missing or mutable releases are not accepted.

GitHub release immutability is enabled for this repository. The workflow token
does not have repository administration permission and cannot toggle that setting.
If an administrator disables it, the final check fails; the download helper also
refuses the resulting mutable release. Restore the setting before publishing again.

The new workflow does **not** update `latest` or publish on `v*` tag pushes.
Existing `latest` images remain unchanged. Semantic release naming/promotion is
separate work; creating a version tag alone does not publish images now.

## Manifest and consumption

`release.json` contains schema version 1, repository, source commit, release ID,
platform, and exactly these images: frontend, api, backend and ops-agent. Image
references use `ghcr.io/owner/image@sha256:...`, never mutable tags.

With Python, GitHub CLI and Docker Buildx installed, authenticate to GitHub and
GHCR as appropriate for repository/package visibility, then download and verify:

```bash
python .github/scripts/release_publish.py download \
  --repository UlloaSP/mlsuite \
  --commit <full-40-character-commit> \
  --directory <new-empty-directory>
```

The helper verifies GitHub immutability, the release tag, asset hashes, canonical
manifest, Compose/image agreement, and registry availability. It does not overwrite
an existing download directory. It uses GitHub's authenticated metadata checks;
it does not perform independent cryptographic verification of attestations.

The Compose asset overrides the four application image references and platform.
It is intended to accompany `docker-compose.prod.yml`; PostgreSQL, MinIO, secrets,
volumes, networking and host requirements are outside this application manifest.
You can inspect the selected images without starting services:

```bash
docker compose --env-file .env -f docker-compose.prod.yml \
  -f <download-directory>/docker-compose.release.yml config --images
```

This step supplies release artifacts, not the deployment procedure. Before using
them for managed dev/production, make the deployment command and ops-agent consume
the same effective configuration. Currently ops-agent reads only the base Compose
file; its START operation can reconcile that configuration without this override.
Multi-environment wiring, migrations, runtime readiness, restore, promotion and
rollback remain the next implementation stages.

## Failure and retry behavior

- A failed build or scan leaves only unpromoted candidate images. It cannot create
  a complete release because publication requires every matrix job to succeed.
- Upload failure leaves a draft. Rerunning can replace only its expected draft
  assets, verify the complete set again, and publish. Unknown draft assets or a
  mismatched target commit require investigation rather than automatic deletion.
- Published release assets are never overwritten. Retry verifies and reuses the
  completed release, including when `main` has subsequently advanced.
- A superseded run that has not passed preparation cannot start another build.
  A build already admitted may finish after `main` advances; it has its own SHA
  identity and cannot replace a newer release or `latest`.
- Publication runs are serialized and are not cancelled mid-publication. GitHub
  concurrency is not a FIFO queue; intermediate pending commits may be superseded.
- Retain every image referenced by a retained release. Candidate-looking tags may
  point to published release digests and must not be deleted by a blanket cleanup.
  Immutability prevents content substitution, not deletion of GHCR packages.

Docker base images and Actions are pinned to reviewed digests/SHAs. Build cache
is scoped by service. Package repositories and build metadata can still change;
this does not claim byte-for-byte reproducible rebuilding. Promotion must reuse
the manifest digests rather than rebuild from the same source commit.

## Verification limits for the introducing PR

Contract/lifecycle tests exercise complete releases, malformed or missing records,
checksum failures, missing images, partial uploads, immutable retries and downloads.
They use mocked GitHub/registry writes. Required PR CI validates these tests and
workflow syntax alongside application tests. The actual GHCR scan and immutable
release publication path first runs after this feature is promoted to `main`.
No production deployment or vulnerability-free image claim follows from PR CI.

References: [GitHub immutable releases](https://docs.github.com/en/code-security/concepts/supply-chain-security/immutable-releases),
[Docker build attestations](https://docs.docker.com/build/metadata/attestations/).
