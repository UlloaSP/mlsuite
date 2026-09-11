"""Publish or verify one complete, immutable GitHub release. No deployments."""

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess

from release_manifest import canonical_json, compose_override, validate_identity, validate_manifest


ASSETS = {"release.json", "release.json.sha256", "docker-compose.release.yml"}


def command(*args, data=None, timeout=300):
    """Run an argument vector without a shell, failing if the process exceeds its budget."""
    try:
        result = subprocess.run(args, input=data, capture_output=True, timeout=timeout)
    except subprocess.TimeoutExpired as error:
        raise RuntimeError(f"Command timed out after {timeout}s: {args[0]}") from error
    if result.returncode:
        raise RuntimeError(result.stderr.decode(errors="replace").strip())
    return result.stdout


def api(path, method="GET", body=None, binary=False, missing_ok=False):
    args = ["gh", "api", path, "--method", method]
    if binary:
        args += ["-H", "Accept: application/octet-stream"]
    if body is not None:
        args += ["--input", "-"]
    try:
        raw = command(*args, data=None if body is None else json.dumps(body).encode())
    except RuntimeError as error:
        if missing_ok and "HTTP 404" in str(error):
            return None
        raise
    return raw if binary else json.loads(raw)


def release_name(commit):
    if not re.fullmatch(r"[0-9a-f]{40}", commit):
        raise ValueError("Expected a full lowercase commit SHA")
    return f"build-{commit}"


def find_release(repository, tag):
    # The list endpoint includes drafts for authenticated callers.
    for page in range(1, 1001):
        releases = api(f"repos/{repository}/releases?per_page=100&page={page}")
        for release in releases:
            if release["tag_name"] == tag:
                return release
        if len(releases) < 100:
            return None
    raise RuntimeError("Release listing exceeded its safety limit")


def verify_tag(repository, tag, commit, required=False):
    ref = api(f"repos/{repository}/git/ref/tags/{tag}", missing_ok=True)
    if ref is None:
        if required:
            raise ValueError("Release tag is missing")
        return
    obj = ref["object"]
    for _ in range(4):
        if obj["type"] == "commit":
            if obj["sha"] != commit:
                raise ValueError("Release tag points to a different commit")
            return
        if obj["type"] != "tag":
            break
        obj = api(f"repos/{repository}/git/tags/{obj['sha']}")["object"]
    raise ValueError("Release tag does not resolve to the expected commit")


def verify_release(release, repository, commit, immutable=True):
    tag = release_name(commit)
    if release["tag_name"] != tag:
        raise ValueError("Release tag mismatch")
    if immutable and (release.get("draft") or not release.get("immutable")):
        raise ValueError("Published release is not immutable; refusing to accept it")
    entries = release.get("assets", [])
    if len(entries) != len(ASSETS) or {item["name"] for item in entries} != ASSETS:
        raise ValueError("Release assets are incomplete or unexpected")
    files = {}
    for item in entries:
        raw = api(f"repos/{repository}/releases/assets/{int(item['id'])}", binary=True)
        if item.get("digest") != "sha256:" + hashlib.sha256(raw).hexdigest():
            raise ValueError("Uploaded release asset checksum mismatch")
        files[item["name"]] = raw
    manifest = validate_manifest(json.loads(files["release.json"]), repository, commit, tag)
    if files["release.json"] != canonical_json(manifest):
        raise ValueError("Release manifest is not canonical")
    checksum = hashlib.sha256(files["release.json"]).hexdigest()
    if files["release.json.sha256"] != f"{checksum}  release.json\n".encode():
        raise ValueError("Manifest checksum file mismatch")
    if files["docker-compose.release.yml"] != compose_override(manifest):
        raise ValueError("Compose override does not match the release")
    if immutable:
        verify_tag(repository, tag, commit, required=True)
    return files


def verify_images(manifest):
    for image in manifest["images"].values():
        # Resolving the digest also detects missing/deleted GHCR artifacts.
        command("docker", "buildx", "imagetools", "inspect", image)


def prepare(repository, commit, ref):
    tag = release_name(commit)
    validate_identity(repository, commit, tag)
    if ref != "refs/heads/main":
        raise ValueError("Publication is allowed only from main")
    verify_tag(repository, tag, commit)
    existing = find_release(repository, tag)
    if existing and not existing["draft"]:
        files = verify_release(existing, repository, commit)
        verify_images(json.loads(files["release.json"]))
        return True
    # Existing immutable builds remain reusable after main advances.
    head = api(f"repos/{repository}/git/ref/heads/main")["object"]["sha"]
    if head != commit:
        raise ValueError("This run was superseded by a newer main commit")
    if existing and existing.get("target_commitish") != commit:
        raise ValueError("Draft release targets a different commit")
    return False


def publish(repository, commit, directory):
    tag = release_name(commit)
    validate_identity(repository, commit, tag)
    files = {name: (directory / name).read_bytes() for name in ASSETS}
    manifest = validate_manifest(json.loads(files["release.json"]), repository, commit, tag)
    if files["release.json"] != canonical_json(manifest):
        raise ValueError("Local manifest is not canonical")
    checksum = hashlib.sha256(files["release.json"]).hexdigest()
    if files["release.json.sha256"] != f"{checksum}  release.json\n".encode():
        raise ValueError("Local manifest checksum mismatch")
    if files["docker-compose.release.yml"] != compose_override(manifest):
        raise ValueError("Local Compose override mismatch")
    verify_images(manifest)
    verify_tag(repository, tag, commit)
    existing = find_release(repository, tag)
    if existing and not existing["draft"]:
        if verify_release(existing, repository, commit) != files:
            raise ValueError("Published release differs; immutable releases cannot be replaced")
        return
    if existing and existing.get("target_commitish") != commit:
        raise ValueError("Draft release targets a different commit")
    if existing is None:
        existing = api(f"repos/{repository}/releases", "POST", {
            "tag_name": tag, "target_commitish": commit, "name": tag,
            "draft": True, "prerelease": True,
            "body": f"Complete application build for {commit}. Deploy using release.json digests. "
                    "Not a production deployment or a semantic version bump.",
        })
    if {item["name"] for item in existing.get("assets", [])} - ASSETS:
        raise ValueError("Draft contains unexpected assets; refusing to overwrite it")
    command("gh", "release", "upload", tag, *(str(directory / name) for name in sorted(ASSETS)),
            "--repo", repository, "--clobber")
    endpoint = f"repos/{repository}/releases/{existing['id']}"
    uploaded = api(endpoint)
    if verify_release(uploaded, repository, commit, immutable=False) != files:
        raise ValueError("Uploaded assets differ; release remains a draft")
    published = api(endpoint, "PATCH", {"draft": False, "make_latest": "false"})
    verify_release(published, repository, commit)


def download(repository, commit, directory):
    tag = release_name(commit)
    validate_identity(repository, commit, tag)
    release = find_release(repository, tag)
    if release is None:
        raise ValueError("Release does not exist")
    files = verify_release(release, repository, commit)
    verify_images(json.loads(files["release.json"]))
    if directory.exists() and any(directory.iterdir()):
        raise ValueError("Download directory must be empty")
    directory.mkdir(parents=True, exist_ok=True)
    for name, content in files.items():
        (directory / name).write_bytes(content)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("operation", choices=["prepare", "publish", "download"])
    parser.add_argument("--repository", required=True)
    parser.add_argument("--commit", required=True)
    parser.add_argument("--ref", default=os.environ.get("GITHUB_REF", ""))
    parser.add_argument("--directory", type=Path, default=Path("release"))
    args = parser.parse_args()
    try:
        if args.operation == "prepare":
            exists = prepare(args.repository, args.commit, args.ref)
            output = f"exists={str(exists).lower()}\nrelease={release_name(args.commit)}\n"
            if os.environ.get("GITHUB_OUTPUT"):
                with open(os.environ["GITHUB_OUTPUT"], "a", encoding="utf-8") as stream:
                    stream.write(output)
            print(output, end="")
        elif args.operation == "publish":
            publish(args.repository, args.commit, args.directory)
        else:
            download(args.repository, args.commit, args.directory)
    except (ValueError, RuntimeError, KeyError, OSError) as error:
        parser.exit(1, f"Release refused: {error}\n")


if __name__ == "__main__":
    main()
