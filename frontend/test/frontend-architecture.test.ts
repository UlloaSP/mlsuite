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
const LEGACY_ROOTS = new Set(
  "admin algorithms api editor layout models plugin review router schemas search user workspace".split(
    " ",
  ),
);
const ALLOWED_ROOTS = new Set([...TARGET_ROOTS, ...LEGACY_ROOTS]);
const ALLOWED_ROOT_FILES = new Set(["main.tsx", "vite-env.d.ts"]);
const FEATURE_PARTS = new Set("api lib components pages routes.tsx index.ts".split(" "));
const SHARED_PARTS = new Set("api config ui lib".split(" "));
const LEGACY_API_IMPORT_EXCEPTIONS = new Set(
  "api/core/services/app-fetch.ts -> app/config/runtimeConfig.ts|api/plugins/hooks/query-keys.ts -> algorithms/plugin/catalog-page-model/index.ts|api/plugins/hooks/use-plugin-catalog-page-query.ts -> algorithms/plugin/catalog-page-model/index.ts|api/schemas/hooks/use-schema-run-bulk-upload.ts -> algorithms/schema/runtime-assembly/index.ts|api/schemas/hooks/use-schema-run-bulk-upload.ts -> algorithms/mlform/shared/index.ts|api/schemas/hooks/use-schema-run-bulk-upload.ts -> algorithms/models/prediction-catalog-definitions/index.ts|api/schemas/hooks/use-schema-run-bulk-upload.ts -> algorithms/models/parse-spreadsheet-prediction-file/index.ts|api/schemas/hooks/use-schema-run-bulk-upload.ts -> algorithms/schema/run-cache/index.ts|api/schemas/hooks/use-schema-run-bulk-upload.ts -> algorithms/schema/bulk-upload/index.ts|api/workspace/hooks/use-workspace-context-sync.ts -> workspace/atoms.ts".split(
    "|",
  ),
);
const LEGACY_APP_BARRELS = new Set(
  "app/components/index.ts app/components/app-sidebar/index.ts app/components/breadcrumb/index.ts app/components/catalog/index.ts app/components/pagination/index.ts app/components/select/index.ts".split(
    " ",
  ),
);
const LEGACY_LINE_LIMITS = new Map([
  ["admin/infrastructure/components/ServicesView.tsx", 302],
  ["app/components/SidebarNavigation.tsx", 306],
  ["editor/components/EditorBody.tsx", 317],
]);

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
  if (LEGACY_APP_BARRELS.has(edge.target)) return false;
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

  test("allows no new app barrels beyond the exact migration baseline", () => {
    const actual = sourceFiles()
      .map(rel)
      .filter((path) => path.startsWith("app/") && /\/index\.tsx?$/.test(path));

    expect(actual.sort((a, b) => a.localeCompare(b))).toEqual(
      [...LEGACY_APP_BARRELS].sort((a, b) => a.localeCompare(b)),
    );
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

  test("does not add inverted dependencies to the legacy API layer", () => {
    const failures = ALL_IMPORTS.filter((edge) => edge.importer.startsWith("api/"))
      .filter((edge) => !["api", "shared"].includes(edge.target.split("/")[0]))
      .map((edge) => `${edge.importer} -> ${edge.target}`)
      .filter((edge) => !LEGACY_API_IMPORT_EXCEPTIONS.has(edge));

    expect(failures).toEqual([]);
  });

  test("keeps legacy algorithms free of React source files", () => {
    const failures = walk(join(SRC, "algorithms"))
      .filter((file) => extname(file) !== ".ts")
      .map(rel);

    expect(failures).toEqual([]);
  });

  test("keeps source modules within the line limit without growing legacy debt", () => {
    const failures = sourceFiles()
      .map((file) => ({ file: rel(file), lines: codeLineCount(file) }))
      .filter(({ file, lines }) => lines > (LEGACY_LINE_LIMITS.get(file) ?? 300))
      .map(({ file, lines }) => `${file}: ${lines}`);
    const stale = [...LEGACY_LINE_LIMITS]
      .filter(([file, ceiling]) => {
        const absolute = join(SRC, file);
        return (
          !existsSync(absolute) ||
          codeLineCount(absolute) <= 300 ||
          codeLineCount(absolute) > ceiling
        );
      })
      .map(([file]) => file);

    expect(failures).toEqual([]);
    expect(stale).toEqual([]);
  });
});
