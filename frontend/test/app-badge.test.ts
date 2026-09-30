import { describe, expect, it } from "vite-plus/test";
import { badgeLabel } from "@/shared/ui/AppBadge";

describe("badge labels", () => {
  it("reads API enum values as sentence case", () => {
    expect(badgeLabel("PARTIAL_SUCCESS")).toBe("Partial success");
    expect(badgeLabel("OWNER")).toBe("Owner");
    expect(badgeLabel("PARTIAL SUCCESS")).toBe("Partial success");
  });

  it("leaves acronyms, mixed case and non-text content alone", () => {
    expect(badgeLabel("CPU")).toBe("CPU");
    expect(badgeLabel("Maintainer")).toBe("Maintainer");
    expect(badgeLabel("v2 · draft")).toBe("v2 · draft");
    expect(badgeLabel(3)).toBe(3);
  });
});
