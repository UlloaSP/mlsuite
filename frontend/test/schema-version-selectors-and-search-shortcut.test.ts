import { describe, expect, it } from "vite-plus/test";
import { schemaVersionId } from "@/features/schemas/lib/version-selection";
import { DEFAULT_SHORTCUTS, matchesShortcut } from "@/shared/ui/shortcut-state";
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

describe("schema version selectors and global search shortcut", () => {
  it("reads a numeric backend version id as a string", () => {
    expect(schemaVersionId(version(101, 1))).toBe("101");
  });

  it("reads a missing version as no id", () => {
    expect(schemaVersionId(null)).toBe("");
  });

  it("uses Ctrl/Cmd+K for global search and leaves slash alone", () => {
    const binding = DEFAULT_SHORTCUTS["global-search"];
    expect(matchesShortcut({ key: "k", ctrlKey: true }, binding)).toBe(true);
    expect(matchesShortcut({ key: "K", metaKey: true }, binding)).toBe(true);
    expect(matchesShortcut({ key: "/", shiftKey: true }, binding)).toBe(false);
    expect(matchesShortcut({ key: "k" }, binding)).toBe(false);
  });
});
