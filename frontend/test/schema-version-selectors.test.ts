import { describe, expect, it } from "vite-plus/test";
import { schemaVersionId } from "@/features/schemas/lib/version-selection";
import type { SchemaVersionDto } from "@/shared/api/openapi.gen";

const version = (id: string | number, versionNumber: number): SchemaVersionDto =>
  ({
    id,
    schemaId: 1,
    version: versionNumber,
    name: `v${versionNumber}`,
    formSchema: {},
    bindings: [],
    createdAt: "2026-06-11T00:00:00Z",
  }) as unknown as SchemaVersionDto;

describe("schema version selectors", () => {
  it("reads a numeric backend version id as a string", () => {
    expect(schemaVersionId(version(101, 1))).toBe("101");
  });

  it("reads a missing version as no id", () => {
    expect(schemaVersionId(null)).toBe("");
  });
});
