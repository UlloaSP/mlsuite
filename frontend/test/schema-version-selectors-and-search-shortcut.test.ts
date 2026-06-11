import { describe, expect, it } from "vite-plus/test";
import {
  schemaVersionId,
  selectSchemaVersion,
  sortSchemaVersions,
} from "../src/schemas/schema-version-selection";
import type { SchemaVersionDto } from "../src/schemas/types";
import { isGlobalSearchShortcut } from "../src/search/shortcut";

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

describe("schema version selectors and global search shortcut", () => {
  it("matches selected schema version when backend id is numeric and select value is string", () => {
    const versions = [version(101, 1), version(202, 2)];

    expect(selectSchemaVersion(versions, "101")?.version).toBe(1);
    expect(schemaVersionId(versions[0])).toBe("101");
  });

  it("falls back to latest version when selected id is empty or unknown", () => {
    const versions = [version(101, 1), version(202, 2)];

    expect(selectSchemaVersion(versions, "")?.id).toBe(202);
    expect(selectSchemaVersion(versions, "999")?.id).toBe(202);
    expect(sortSchemaVersions(versions).map((item) => item.version)).toEqual([2, 1]);
  });

  it("returns no version when no versions exist", () => {
    expect(selectSchemaVersion([], "")).toBeUndefined();
    expect(schemaVersionId(null)).toBe("");
  });

  it("uses Ctrl/Cmd+K for global search and leaves slash alone", () => {
    expect(isGlobalSearchShortcut({ key: "k", ctrlKey: true })).toBe(true);
    expect(isGlobalSearchShortcut({ key: "K", metaKey: true })).toBe(true);
    expect(isGlobalSearchShortcut({ key: "/", shiftKey: true })).toBe(false);
    expect(isGlobalSearchShortcut({ key: "k" })).toBe(false);
  });
});
