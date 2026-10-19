// Repository Markdown that the site renders in place; the files stay where the repository links them.
const repository = "https://github.com/UlloaSP/mlsuite";

/** Repository file (relative to the root) and its route on this site. */
export const sourcePages = [
  { file: "docs/RELEASES.md", route: "/self-hosting/releases/", label: "Immutable releases" },
  { file: "SECURITY.md", route: "/security/", label: "Security policy" },
] as const;

const byFile = new Map<string, string>(sourcePages.map(({ file, route }) => [file, route]));

const posix = (path: string) => path.replaceAll("\\", "/");

/** Resolves a relative link written for GitHub to its route here, or to the file on GitHub. */
export function resolveSourceLink(from: string, url: string): string {
  if (/^([a-z]+:|#|\/)/i.test(url)) return url;
  const [path = "", hash] = url.split("#");
  const parts = posix(from).split("/").slice(0, -1);
  for (const part of path.split("/")) {
    if (part === "..") parts.pop();
    else if (part && part !== ".") parts.push(part);
  }
  const target = parts.join("/");
  const route = byFile.get(target);
  const anchor = hash ? `#${hash}` : "";
  return route ? `${route}${anchor}` : `${repository}/blob/main/${target}${anchor}`;
}

/** The file's first-level heading, used as the page title. */
export function sourceTitle(body: string, fallback: string): string {
  return body.match(/^# (.+)$/m)?.[1]?.trim() ?? fallback;
}

/**
 * Prepares a file for rendering without changing it: drops the first-level heading, which
 * Starlight renders as the title, and points repository-relative links at this site or GitHub.
 */
export function sourceMarkdown(file: string, body: string): string {
  return body
    .replace(/^# .+\r?\n/m, "")
    .replace(/\]\(([^)\s]+)\)/g, (_, url: string) => `](${resolveSourceLink(file, url)})`);
}
