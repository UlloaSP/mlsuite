"""Scan committed files and bounded new history without reading local credentials."""

import argparse
import hashlib
import io
import json
import os
from pathlib import Path, PurePosixPath
import platform
import re
import subprocess
import sys
import tarfile
import tempfile
import urllib.request
import zipfile

VERSION = "8.30.1"
# First commit with private configuration removed; never inspect older history.
HISTORY_FLOOR = "4ade4f783a3b8c121cac9d623e4f162e5260e0e5"
ARCHIVES = {
    "Linux": ("linux_x64.tar.gz", "551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb"),
    "Windows": ("windows_x64.zip", "d29144deff3a68aa93ced33dddf84b7fdc26070add4aa0f4513094c8332afc4e"),
}


class ScanError(Exception):
    """A controlled error safe to write to public CI logs."""


def run(command, cwd):
    return subprocess.run(command, cwd=cwd, capture_output=True, check=False)


def git(repo, *args):
    result = run(["git", *args], repo)
    if result.returncode:
        raise ScanError("Git command failed; ensure checkout includes required commits.")
    return result.stdout


def commit(repo, ref):
    if ref != "HEAD" and not re.fullmatch(r"[0-9a-fA-F]{40}", ref):
        raise ScanError("Commit references must be full SHA-1 IDs or HEAD.")
    return git(repo, "rev-parse", "--verify", f"{ref}^{{commit}}").decode().strip()


def ancestor(repo, older, newer):
    result = run(["git", "merge-base", "--is-ancestor", older, newer], repo)
    if result.returncode not in (0, 1):
        raise ScanError("Cannot validate the secret-scan history boundary.")
    return result.returncode == 0


def bounds(repo, base, head):
    head = commit(repo, head)
    floor = commit(repo, HISTORY_FLOOR)
    if not ancestor(repo, floor, head):
        raise ScanError("Head must descend from the private-configuration cleanup commit.")
    base = floor if not base or base == "0" * 40 else commit(repo, base)
    if not ancestor(repo, floor, base):
        base = floor
    return base, head


def install(destination):
    system = platform.system()
    if system not in ARCHIVES or platform.machine().lower() not in ("x86_64", "amd64"):
        raise ScanError("Pinned Gitleaks supports Linux and Windows x64 only.")
    archive, expected = ARCHIVES[system]
    url = f"https://github.com/gitleaks/gitleaks/releases/download/v{VERSION}/gitleaks_{VERSION}_{archive}"
    with urllib.request.urlopen(url, timeout=60) as response:
        payload = response.read()
    if hashlib.sha256(payload).hexdigest() != expected:
        raise ScanError("Gitleaks archive checksum mismatch.")
    binary = "gitleaks.exe" if system == "Windows" else "gitleaks"
    if system == "Windows":
        with zipfile.ZipFile(io.BytesIO(payload)) as package:
            content = package.read(binary)
    else:
        with tarfile.open(fileobj=io.BytesIO(payload), mode="r:gz") as package:
            member = package.getmember(binary)
            if not member.isfile():
                raise ScanError("Gitleaks archive has no regular executable.")
            content = package.extractfile(member).read()
    executable = destination / binary
    executable.write_bytes(content)
    executable.chmod(0o700)
    return executable


def export_tree(repo, head, destination):
    """Copy Git blobs, including symlink text, without following worktree paths."""
    entries = git(repo, "ls-tree", "-rz", "--full-tree", head).split(b"\0")
    with subprocess.Popen(["git", "cat-file", "--batch"], cwd=repo, stdin=subprocess.PIPE,
                          stdout=subprocess.PIPE, stderr=subprocess.DEVNULL) as reader:
        try:
            for entry in filter(None, entries):
                metadata, name = entry.split(b"\t", 1)
                _, kind, object_id = metadata.split()
                path = PurePosixPath(os.fsdecode(name))
                if kind != b"blob" or path.is_absolute() or ".." in path.parts:
                    raise ScanError("Tracked tree contains an unsupported Git entry.")
                output = destination.joinpath(*path.parts)
                if not output.resolve().is_relative_to(destination.resolve()):
                    raise ScanError("Tracked path escapes the scan directory.")
                reader.stdin.write(object_id + b"\n")
                reader.stdin.flush()
                header = reader.stdout.readline().split()
                if len(header) != 3 or header[1] != b"blob":
                    raise ScanError("Cannot read a tracked Git blob.")
                size = int(header[2])
                content = reader.stdout.read(size)
                if len(content) != size or reader.stdout.read(1) != b"\n":
                    raise ScanError("Incomplete tracked Git blob.")
                output.parent.mkdir(parents=True, exist_ok=True)
                output.write_bytes(content)
        finally:
            reader.stdin.close()
            reader.wait()
        if reader.returncode:
            raise ScanError("Git tree export failed.")


def scan(executable, mode, source, temporary, log_opts=None):
    report = temporary / f"{mode}.json"
    config = temporary / "rules.toml"
    config.write_text("[extend]\nuseDefault = true\n", encoding="utf-8")
    command = [str(executable), mode, str(source), "--config", str(config),
               "--gitleaks-ignore-path", str(temporary), "--ignore-gitleaks-allow",
               "--redact=100", "--no-banner", "--no-color", "--log-level=error",
               "--exit-code=10", "--report-format=json", "--report-path", str(report)]
    if log_opts:
        command.append(f"--log-opts={log_opts}")
    result = run(command, temporary)
    if result.returncode not in (0, 10):
        raise ScanError(f"Gitleaks {mode} scan failed; raw scanner output withheld.")
    if not report.is_file():
        raise ScanError("Gitleaks did not produce a scan report.")
    findings = json.loads(report.read_text(encoding="utf-8"))
    if not isinstance(findings, list) or bool(findings) != (result.returncode == 10):
        raise ScanError("Gitleaks returned an inconsistent scan report.")
    for finding in findings:
        metadata = {key: finding.get(key) for key in ("File", "StartLine", "RuleID", "Commit")}
        if mode == "dir" and Path(metadata["File"]).is_absolute():
            metadata["File"] = Path(metadata["File"]).relative_to(source).as_posix()
        print("Secret finding " + json.dumps(metadata, ensure_ascii=True))
    return len(findings)


def check(repo, base, head, temporary, executable):
    base, head = bounds(repo, base, head)
    tree = temporary / "tree"
    tree.mkdir()
    export_tree(repo, head, tree)
    findings = scan(executable, "dir", tree, temporary)
    if base != head:
        findings += scan(executable, "git", repo, temporary,
                         f"--full-history -m --no-renames {base}..{head}")
    print(f"Secret scan complete: {findings} finding(s); history {base}..{head}.")
    return 1 if findings else 0


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", type=Path, default=Path.cwd())
    parser.add_argument("--base", default="")
    parser.add_argument("--head", default="HEAD")
    args = parser.parse_args()
    try:
        with tempfile.TemporaryDirectory(prefix="mlsuite-secret-scan-") as directory:
            temporary = Path(directory)
            return check(args.repo.resolve(), args.base, args.head, temporary, install(temporary))
    except ScanError as error:
        print(f"Secret scan failed: {error}", file=sys.stderr)
    except Exception as error:
        print(f"Secret scan failed ({type(error).__name__}); details withheld.", file=sys.stderr)
    return 2


if __name__ == "__main__":
    sys.exit(main())
