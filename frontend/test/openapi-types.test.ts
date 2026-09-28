/// <reference types="node" />

import { readFileSync } from "node:fs";
import { join } from "node:path";
import openapiTS, { astToString, COMMENT_HEADER } from "openapi-typescript";
import { expect, test } from "vite-plus/test";

const ROOT = process.cwd();
const SPEC = join(ROOT, "..", "api", "openapi.json");
const GENERATED = join(ROOT, "src", "shared", "api", "openapi.gen.ts");

// Mirrors the `api:types` script: `--root-types --root-types-no-schema-prefix`.
async function generate(): Promise<string> {
  const schema = JSON.parse(readFileSync(SPEC, "utf8")) as Parameters<typeof openapiTS>[0];
  const ast = await openapiTS(schema, {
    rootTypes: true,
    rootTypesNoSchemaPrefix: true,
    silent: true,
  });
  return `${COMMENT_HEADER}${astToString(ast)}`;
}

test("generated API types match api/openapi.json", async () => {
  const committed = readFileSync(GENERATED, "utf8").replaceAll("\r\n", "\n");

  expect(committed === (await generate()), "API types are stale; run `vp run api:types`").toBe(
    true,
  );
});
