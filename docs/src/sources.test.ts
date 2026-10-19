// Run with `vp run test`: the rendered repository files must keep resolving every relative link.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { resolveSourceLink, sourceMarkdown, sourcePages, sourceTitle } from "./sources.ts";

const root = new URL("../../", import.meta.url);
const github = "https://github.com/UlloaSP/mlsuite/blob/main/";

test("relative links to rendered files become site routes with anchors", () => {
  assert.equal(resolveSourceLink("SECURITY.md", "docs/RELEASES.md"), "/self-hosting/releases/");
  assert.equal(
    resolveSourceLink(".github/CI.md", "../docs/RELEASES.md#failure-and-retry-behavior"),
    "/self-hosting/releases/#failure-and-retry-behavior",
  );
  assert.equal(resolveSourceLink("docs/RELEASES.md", "../SECURITY.md"), "/security/");
});

test("other repository files link to GitHub, absolute links are untouched", () => {
  assert.equal(resolveSourceLink("docs/RELEASES.md", "../README.md"), `${github}README.md`);
  assert.equal(resolveSourceLink("SECURITY.md", "api/openapi.json"), `${github}api/openapi.json`);
  assert.equal(resolveSourceLink("docs/RELEASES.md", "#manifest-and-consumption"), "#manifest-and-consumption");
  assert.equal(resolveSourceLink("SECURITY.md", "https://example.com/a.md"), "https://example.com/a.md");
});

test("rendering drops only the title heading", () => {
  const body = "# Title\r\n\nSee [x](../SECURITY.md).\n\n## Section\n";
  assert.equal(sourceTitle(body, "fallback"), "Title");
  assert.equal(sourceMarkdown("docs/RELEASES.md", body), "\nSee [x](/security/).\n\n## Section\n");
});

test("every relative link in the rendered files resolves", () => {
  for (const { file } of sourcePages) {
    const body = readFileSync(new URL(file, root), "utf8");
    assert.notEqual(sourceTitle(body, ""), "", `${file} has a title`);
    for (const [, url] of body.matchAll(/\]\(([^)\s]+)\)/g)) {
      const resolved = resolveSourceLink(file, url!);
      if (resolved.startsWith(github)) {
        const path = resolved.slice(github.length).split("#")[0]!;
        assert.ok(existsSync(new URL(path, root)), `${file}: ${url} points to a missing file`);
      } else if (!/^(https?:|#)/.test(resolved)) {
        const route = resolved.split("#")[0];
        assert.ok(sourcePages.some((page) => page.route === route), `${file}: ${url}`);
      }
    }
  }
});
