import { describe, expect, test } from "vite-plus/test";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const SRC = join(process.cwd(), "src");
const API = join(SRC, "api");
const EXPECTED_DOMAINS = [
  "admin-users",
  "infrastructure",
  "models",
  "plugins",
  "review",
  "schemas",
  "search",
  "user",
  "workspace",
];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const file = join(dir, entry);
    return statSync(file).isDirectory() ? walk(file) : [file];
  });
}

const tsFiles = (dir: string) => walk(dir).filter((file) => file.endsWith(".ts"));
const source = (file: string) => readFileSync(file, "utf8");
const rel = (file: string) => relative(SRC, file).replaceAll("\\", "/");
const count = (text: string, regex: RegExp) => [...text.matchAll(regex)].length;

describe("frontend API architecture", () => {
  test("keeps API files under src/api by domain", () => {
    const legacyApiFiles = tsFiles(SRC).filter(
      (file) => rel(file).includes("/api/") && !rel(file).startsWith("api/"),
    );

    expect(legacyApiFiles.map(rel)).toEqual([]);
    for (const domain of EXPECTED_DOMAINS) {
      for (const part of ["dtos", "services", "hooks"]) {
        expect(existsSync(join(API, domain, part)), `${domain}/${part}`).toBe(true);
      }
    }
  });

  test("keeps one DTO, service, or hook owner per API file", () => {
    const failures: string[] = [];

    for (const file of tsFiles(API)) {
      const name = file.split(/[\\/]/).at(-1);
      if (name === "index.ts" || name === "query-keys.ts") continue;

      const text = source(file);
      const path = rel(file);
      if (path.includes("/dtos/")) {
        const dtoCount = count(text, /export\s+(?:type|interface|class)\s+\w+/g);
        if (dtoCount > 1) failures.push(`${path}: ${dtoCount} DTO exports`);
      }
      if (path.includes("/services/") && !path.startsWith("api/core/")) {
        const serviceCount = count(text, /export\s+(?:const|function)\s+\w+/g);
        if (serviceCount > 1) failures.push(`${path}: ${serviceCount} service exports`);
      }
      if (path.includes("/hooks/")) {
        const hookCount = count(text, /export\s+(?:const|function)\s+use[A-Z]\w+/g);
        if (hookCount > 1) failures.push(`${path}: ${hookCount} hook exports`);
      }
    }

    expect(failures).toEqual([]);
  });
});
