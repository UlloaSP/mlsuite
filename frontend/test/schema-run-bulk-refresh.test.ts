import { bulkUploadSummary } from "@/features/schemas/lib/bulk-upload";
import { describe, expect, it } from "vite-plus/test";

describe("schema run bulk refresh", () => {
  it.each([
    [2, 0, 0, 0, false, "2 uploaded, 0 failed, 0 skipped"],
    [1, 0, 2, 0, true, "1 uploaded, 0 failed, 2 skipped"],
    [0, 1, 0, 0, true, "0 uploaded, 1 failed, 0 skipped"],
    [0, 0, 3, 0, true, "0 uploaded, 0 failed, 3 skipped"],
    [0, 0, 0, 0, true, "0 uploaded, 0 failed, 0 skipped"],
    [1, 0, 0, 2, true, "1 uploaded, 0 failed, 0 skipped, 2 not processed"],
  ] as const)(
    "summarizes %i uploaded, %i failed, %i skipped, %i remaining",
    (saved, failed, skipped, remaining, warning, message) => {
      expect(bulkUploadSummary(saved, failed, skipped, remaining)).toEqual({ warning, message });
    },
  );
});
