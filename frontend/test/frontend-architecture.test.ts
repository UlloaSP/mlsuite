/// <reference types="node" />

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, normalize, relative, resolve } from "node:path";
import ts from "typescript";
import { describe, expect, test } from "vite-plus/test";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");
const CONTRACT = join(ROOT, "ARCHITECTURE.md");
const AGENTS = join(ROOT, "AGENTS.md");
const TARGET_ROOTS = new Set(["app", "shared", "capabilities", "features"]);
const ALLOWED_ROOTS = TARGET_ROOTS;
const ALLOWED_ROOT_FILES = new Set(["vite-env.d.ts"]);
const FEATURE_PARTS = new Set("api lib components pages routes.tsx index.ts".split(" "));
const SHARED_PARTS = new Set("api config ui lib".split(" "));

type SourceImport = {
  importer: string;
  specifier: string;
  target: string;
};

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const typedFiles = (dir: string) =>
  walk(dir).filter((file) => [".ts", ".tsx"].includes(extname(file)));
const sourceFiles = () => typedFiles(SRC);
const testFiles = typedFiles(join(ROOT, "test"));
const source = (file: string) => readFileSync(file, "utf8");
const rel = (file: string) => relative(SRC, file).replaceAll("\\", "/");

function moduleSpecifiers(file: string): string[] {
  const text = source(file);
  const kind = file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const parsed = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, kind);
  const found: string[] = [];

  function visit(node: ts.Node) {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      found.push(node.moduleSpecifier.text);
    }
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length === 1 &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      found.push(node.arguments[0].text);
    }
    ts.forEachChild(node, visit);
  }

  visit(parsed);
  return found;
}

function resolveSourceImport(file: string, specifier: string): string | null {
  if (!specifier.startsWith(".") && !specifier.startsWith("@/")) return null;
  const base = normalize(
    resolve(specifier.startsWith("@/") ? SRC : dirname(file), specifier.replace(/^@\//, "")),
  );
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    join(base, "index.ts"),
    join(base, "index.tsx"),
  ];
  return (
    candidates.find((candidate) => existsSync(candidate) && statSync(candidate).isFile()) ?? null
  );
}

function imports(): SourceImport[] {
  return [...sourceFiles(), ...testFiles].flatMap((file) =>
    moduleSpecifiers(file).flatMap((specifier) => {
      const target = resolveSourceImport(file, specifier);
      return target ? [{ importer: rel(file), specifier, target: rel(target) }] : [];
    }),
  );
}
const ALL_IMPORTS = imports();

function dependencyFailure(edge: SourceImport): string | null {
  if (edge.specifier.split("/").includes("..")) return `${edge.importer} -> ${edge.specifier}`;
  const from = edge.importer.split("/");
  const to = edge.target.split("/");
  if (!TARGET_ROOTS.has(from[0])) return null;
  if (from[0] === "app") return null;
  if (from[0] === "shared" && to[0] !== "shared") return `${edge.importer} -> ${edge.target}`;
  if (from[0] === "capabilities") {
    const allowed = to[0] === "shared" || (to[0] === "capabilities" && to[1] === from[1]);
    return allowed ? null : `${edge.importer} -> ${edge.target}`;
  }
  if (from[0] === "features") {
    const allowed =
      to[0] === "shared" || to[0] === "capabilities" || (to[0] === "features" && to[1] === from[1]);
    return allowed ? null : `${edge.importer} -> ${edge.target}`;
  }
  return null;
}

function isForbiddenTargetBarrel(edge: SourceImport): boolean {
  const importer = edge.importer.split("/");
  const target = edge.target.split("/");
  const isIndex = target.at(-1) === "index.ts" || target.at(-1) === "index.tsx";
  if (!isIndex || !TARGET_ROOTS.has(importer[0]) || !TARGET_ROOTS.has(target[0])) return false;
  const isPublic =
    target.length === 3 && ["features", "capabilities", "shared"].includes(target[0]);
  const importsOwnPublicInterface = importer[0] === target[0] && importer[1] === target[1];
  return !isPublic || importsOwnPublicInterface;
}

function codeLineCount(file: string): number {
  const text = source(file);
  const scanner = ts.createScanner(
    ts.ScriptTarget.Latest,
    false,
    file.endsWith(".tsx") ? ts.LanguageVariant.JSX : ts.LanguageVariant.Standard,
    text,
  );
  const lines = new Set<number>();
  const lineStarts = [0];
  for (const match of text.matchAll(/\r?\n/g))
    lineStarts.push((match.index ?? 0) + match[0].length);
  let line = 0;
  const ignored = new Set([
    ts.SyntaxKind.WhitespaceTrivia,
    ts.SyntaxKind.NewLineTrivia,
    ts.SyntaxKind.SingleLineCommentTrivia,
    ts.SyntaxKind.MultiLineCommentTrivia,
    ts.SyntaxKind.ShebangTrivia,
  ]);

  for (let token = scanner.scan(); token !== ts.SyntaxKind.EndOfFileToken; token = scanner.scan()) {
    const position = scanner.getTokenPos();
    while (line + 1 < lineStarts.length && lineStarts[line + 1] <= position) line += 1;
    if (!ignored.has(token)) {
      const end = scanner.getTextPos();
      let endLine = line;
      while (endLine + 1 < lineStarts.length && lineStarts[endLine + 1] < end) endLine += 1;
      for (let tokenLine = line; tokenLine <= endLine; tokenLine += 1) lines.add(tokenLine);
    }
  }
  return lines.size;
}

describe("frontend architecture contract", () => {
  test("keeps the contract present and mandatory for agents", () => {
    const contract = source(CONTRACT);
    const agents = source(AGENTS);
    const configuration =
      source(join(ROOT, "tsconfig.app.json")) + source(join(ROOT, "vite.config.ts"));

    expect(agents).toContain("[`ARCHITECTURE.md`](./ARCHITECTURE.md)");
    expect(contract).toContain("Use `@/`");
    expect(configuration).toMatch(/"@\/\*".*alias: \{ "@"/s);
  });

  test("keeps source files inside known roots and target subfolders", () => {
    const unknown = walk(SRC)
      .map(rel)
      .filter((path) => {
        if (!path.includes("/")) return !ALLOWED_ROOT_FILES.has(path);
        const [root, module, part] = path.split("/");
        if (!ALLOWED_ROOTS.has(root)) return true;
        if (root === "shared") return !SHARED_PARTS.has(module);
        return root === "features" && !FEATURE_PARTS.has(part);
      });

    expect([...new Set(unknown)]).toEqual([]);
  });

  test("enforces target dependency direction and feature isolation", () => {
    const failures = ALL_IMPORTS.map(dependencyFailure).filter((value) => value !== null);

    expect(failures).toEqual([]);
  });

  test("defines non-vacuous direction rules for every target layer", () => {
    const edge = (importer: string, target: string): SourceImport => ({
      importer,
      target,
      specifier: "./fixture",
    });

    expect(dependencyFailure(edge("shared/ui/button.ts", "features/user/page.tsx"))).not.toBeNull();
    expect(
      dependencyFailure(edge("capabilities/editor/a.ts", "capabilities/mlform/b.ts")),
    ).not.toBeNull();
    expect(dependencyFailure(edge("features/schemas/a.ts", "features/models/b.ts"))).not.toBeNull();
    expect(dependencyFailure(edge("features/schemas/a.ts", "capabilities/mlform/b.ts"))).toBeNull();
    expect(
      dependencyFailure(edge("app/router/routes.ts", "features/schemas/routes.tsx")),
    ).toBeNull();
  });

  test("prevents target modules from importing internal barrels", () => {
    const failures = ALL_IMPORTS.filter((edge) => TARGET_ROOTS.has(edge.importer.split("/")[0]))
      .filter(isForbiddenTargetBarrel)
      .map((edge) => `${edge.importer} -> ${edge.target}`);

    expect(failures).toEqual([]);
  });

  test("keeps app composition free of barrels", () => {
    const actual = sourceFiles()
      .map(rel)
      .filter((path) => path.startsWith("app/") && /\/index\.tsx?$/.test(path));

    expect(actual).toEqual([]);
  });

  test("allows only external use of narrow target public barrels", () => {
    const edge = (importer: string, target: string): SourceImport => ({
      importer,
      target,
      specifier: "./fixture",
    });

    expect(isForbiddenTargetBarrel(edge("app/router/routes.ts", "features/schemas/index.ts"))).toBe(
      false,
    );
    expect(
      isForbiddenTargetBarrel(edge("features/schemas/page.ts", "features/schemas/index.ts")),
    ).toBe(true);
    expect(
      isForbiddenTargetBarrel(edge("app/router/routes.ts", "features/schemas/api/index.ts")),
    ).toBe(true);
  });

  test("does not recreate removed legacy source roots", () => {
    const removedRoots = [
      "admin",
      "algorithms",
      "api",
      "editor",
      "models",
      "plugin",
      "review",
      "schemas",
      "user",
      "workspace",
    ];

    expect(removedRoots.filter((root) => existsSync(join(SRC, root)))).toEqual([]);
  });

  test("keeps source modules within the line limit", () => {
    const failures = sourceFiles()
      .map((file) => ({ file: rel(file), lines: codeLineCount(file) }))
      .filter(({ lines }) => lines > 300)
      .map(({ file, lines }) => `${file}: ${lines}`);

    expect(failures).toEqual([]);
  });
});
