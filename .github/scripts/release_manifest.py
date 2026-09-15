"""Validate one complete MLSuite build and write its digest-pinned release assets."""

import argparse
import hashlib
import json
from pathlib import Path
import re


IMAGES = {
    "api": "mlsuite-api",
    "backend": "mlsuite-sklearn-backend",
    "frontend": "mlsuite-frontend",
    "ops-agent": "mlsuite-ops-agent",
}
COMPOSE_SERVICES = {"api": "spring-app", "backend": "py-analyzer"}
PLATFORM = "linux/amd64"
MANIFEST_KEYS = {"schema_version", "repository", "commit", "release", "platform", "images"}
RECORD_KEYS = {"service", "image", "digest", "commit"}
DIGEST = re.compile(r"sha256:[0-9a-f]{64}")
COMMIT = re.compile(r"[0-9a-f]{40}")
REPOSITORY = re.compile(r"[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?/[A-Za-z0-9._-]{1,100}")
RELEASE = re.compile(r"[A-Za-z0-9][A-Za-z0-9._-]{0,127}")


def validate_identity(repository, commit, release):
    if not isinstance(repository, str) or not REPOSITORY.fullmatch(repository):
        raise ValueError("repository must be a GitHub owner/repository")
    if repository.split("/")[1] in {".", ".."}:
        raise ValueError("repository must be a GitHub owner/repository")
    if not isinstance(commit, str) or not COMMIT.fullmatch(commit):
        raise ValueError("commit must be a full lowercase 40-character Git SHA")
    if (not isinstance(release, str) or not RELEASE.fullmatch(release)
            or ".." in release or release.endswith((".", ".lock"))):
        raise ValueError("release must be a safe Git tag identifier")


def image_name(repository, service):
    return f"ghcr.io/{repository.split('/')[0].lower()}/{IMAGES[service]}"


def validate_manifest(data, repository, commit, release):
    """Reject incomplete or mismatched manifests before publication or reuse."""
    validate_identity(repository, commit, release)
    if not isinstance(data, dict) or set(data) != MANIFEST_KEYS:
        raise ValueError("manifest must contain exactly the supported fields")
    if type(data["schema_version"]) is not int or data["schema_version"] != 1:
        raise ValueError("unsupported manifest schema_version")
    for field, expected in (("repository", repository), ("commit", commit),
                            ("release", release), ("platform", PLATFORM)):
        if data[field] != expected:
            raise ValueError(f"manifest {field} does not match {expected}")
    images = data["images"]
    if not isinstance(images, dict) or set(images) != set(IMAGES):
        raise ValueError("manifest must contain exactly the four application services")
    for service, reference in images.items():
        prefix = image_name(repository, service) + "@"
        if (not isinstance(reference, str) or not reference.startswith(prefix)
                or not DIGEST.fullmatch(reference[len(prefix):])):
            raise ValueError(f"invalid digest-pinned image for {service}")
    return data


def build_manifest(records, repository, commit, release):
    validate_identity(repository, commit, release)
    images = {}
    for record in records:
        if not isinstance(record, dict) or set(record) != RECORD_KEYS:
            raise ValueError("image record must contain service, image, digest and commit")
        service = record["service"]
        if not isinstance(service, str) or service not in IMAGES:
            raise ValueError(f"unknown application service: {service}")
        if service in images:
            raise ValueError(f"duplicate application service: {service}")
        if record["commit"] != commit:
            raise ValueError(f"image commit does not match for {service}")
        if record["image"] != image_name(repository, service):
            raise ValueError(f"unexpected image repository for {service}")
        digest = record["digest"]
        if not isinstance(digest, str) or not DIGEST.fullmatch(digest):
            raise ValueError(f"invalid image digest for {service}")
        images[service] = f"{record['image']}@{digest}"
    manifest = {
        "schema_version": 1,
        "repository": repository,
        "commit": commit,
        "release": release,
        "platform": PLATFORM,
        "images": images,
    }
    return validate_manifest(manifest, repository, commit, release)


def canonical_json(data):
    return (json.dumps(data, sort_keys=True, separators=(",", ":")) + "\n").encode("utf-8")


def compose_override(data):
    lines = ["services:"]
    for service, reference in sorted(data["images"].items()):
        lines.extend((f"  {COMPOSE_SERVICES.get(service, service)}:",
                      f"    image: {reference}", f"    platform: {PLATFORM}"))
    return ("\n".join(lines) + "\n").encode("utf-8")


def write_assets(data, output_dir):
    validate_manifest(data, data["repository"], data["commit"], data["release"])
    output = Path(output_dir)
    output.mkdir(parents=True, exist_ok=True)
    content = canonical_json(data)
    digest = hashlib.sha256(content).hexdigest()
    (output / "release.json").write_bytes(content)
    (output / "release.json.sha256").write_bytes(f"{digest}  release.json\n".encode("ascii"))
    (output / "docker-compose.release.yml").write_bytes(compose_override(data))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--repository", required=True)
    parser.add_argument("--commit", required=True)
    parser.add_argument("--release", required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    try:
        if not args.input.is_dir():
            raise ValueError("input must be a directory of image records")
        records = [json.loads(path.read_text(encoding="utf-8"))
                   for path in sorted(args.input.rglob("*.json"))]
        manifest = build_manifest(records, args.repository, args.commit, args.release)
        write_assets(manifest, args.output)
    except (OSError, ValueError) as error:
        parser.error(str(error))


if __name__ == "__main__":
    main()
