/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

const validateCustomFieldSource = vi.fn();
const validateCustomReportSource = vi.fn();

vi.mock("@/capabilities/prediction-runtime/plugins/custom-field-source-runtime", () => ({
  validateCustomFieldSource,
}));
vi.mock("@/capabilities/prediction-runtime/plugins/custom-report-source-runtime", () => ({
  validateCustomReportSource,
}));

describe("plugin catalog loader", () => {
  beforeEach(() => {
    validateCustomFieldSource.mockReset();
    validateCustomReportSource.mockReset();
  });

  test("routes a generic report declaration directly to report validation", async () => {
    validateCustomReportSource.mockResolvedValue({ kind: "Crystal Tree" });
    const { detectPluginType } =
      await import("@/capabilities/prediction-runtime/plugins/plugin-catalog-loader");

    const result = await detectPluginType(
      41,
      "export default defineReportKind<CrystalTreeConfig, CrystalTreePayload>({});",
    );

    expect(result).toEqual({ pluginType: "report", kind: "Crystal Tree" });
    expect(validateCustomReportSource).toHaveBeenCalledOnce();
    expect(validateCustomFieldSource).not.toHaveBeenCalled();
  });

  test("reports failure from a declared generic report without trying field validation", async () => {
    validateCustomReportSource.mockRejectedValue(new Error("bad report"));
    const { detectPluginType } =
      await import("@/capabilities/prediction-runtime/plugins/plugin-catalog-loader");

    await expect(
      detectPluginType(41, "export default defineReportKind<Config, Payload>({});"),
    ).rejects.toThrow("Plugin validation failed for report: bad report");
    expect(validateCustomFieldSource).not.toHaveBeenCalled();
  });

  test("reports both failures when source has no declaration", async () => {
    validateCustomFieldSource.mockRejectedValue(new Error("bad field"));
    validateCustomReportSource.mockRejectedValue(new Error("bad report"));
    const { detectPluginType } =
      await import("@/capabilities/prediction-runtime/plugins/plugin-catalog-loader");

    await expect(detectPluginType(41, "not a plugin")).rejects.toThrow(
      "Plugin validation failed for field/report: bad field | bad report",
    );
  });
});
