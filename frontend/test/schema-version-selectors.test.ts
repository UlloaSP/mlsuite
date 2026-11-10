import { describe, expect, it } from "vite-plus/test";
import {
  hasOwnVersionName,
  schemaVersionId,
  schemaVersionLabel,
} from "@/features/schemas/lib/version-selection";
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

  it("names a snapshot once when its name is only its number", () => {
    expect(schemaVersionLabel({ name: "v1", version: 1 })).toBe("v1");
    expect(schemaVersionLabel({ name: null, version: 1 })).toBe("v1");
    expect(schemaVersionLabel({ name: "Baseline", version: 3 })).toBe("Baseline · v3");
    expect(hasOwnVersionName({ name: "V1", version: 1 })).toBe(false);
    expect(hasOwnVersionName({ name: "Baseline", version: 3 })).toBe(true);
  });
});
