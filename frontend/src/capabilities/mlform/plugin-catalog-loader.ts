/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { validateCustomFieldSource } from "@/capabilities/mlform/custom-field-source-runtime";
import { validateCustomReportSource } from "@/capabilities/mlform/custom-report-source-runtime";

/**
 * DetectedPluginType: describes the public data contract consumed or returned by this algorithm.
 *
 * Purpose: loads plugin catalog rows and detects field/report plugin source type.
 * @returns Type-only export; no runtime value is emitted.
 * @throws Propagates browser/API/runtime failures from the called platform APIs.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export type DetectedPluginType = "field" | "report";

type DetectionResult = {
  pluginType: DetectedPluginType;
  kind: string;
};

/** detectDeclaredPluginType: internal helper for plugin catalog/runtime source handling. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const detectDeclaredPluginType = (source: string): DetectedPluginType | null => {
  if (source.includes("defineFieldKind(")) {
    return "field";
  }
  if (source.includes("defineReportKind(")) {
    return "report";
  }
  return null;
};

/** getErrorMessage: internal lookup helper for plugin catalog/runtime source handling. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/** validateByType: internal helper for plugin catalog/runtime source handling. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const validateByType = async (
  organizationId: number | string,
  source: string,
  pluginType: DetectedPluginType,
): Promise<DetectionResult> => {
  if (pluginType === "field") {
    const definition = await validateCustomFieldSource(organizationId, source);
    return { pluginType, kind: definition.kind };
  }
  if (pluginType === "report") {
    const definition = await validateCustomReportSource(organizationId, source);
    return { pluginType, kind: definition.kind };
  }
  throw new Error("Unsupported plugin type.");
};

/**
 * detectPluginType: performs the exported transformation for this algorithm.
 *
 * Purpose: loads plugin catalog rows and detects field/report plugin source type.
 * @param async ( - Input consumed by detectPluginType; uses the loads plugin catalog rows and detects field/report plugin source type contract.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Propagates browser/API/runtime failures from the called platform APIs.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const detectPluginType = async (
  organizationId: number | string,
  source: string,
): Promise<DetectionResult> => {
  const declaredType = detectDeclaredPluginType(source);
  if (declaredType) {
    try {
      return await validateByType(organizationId, source, declaredType);
    } catch (error: unknown) {
      throw new Error(`Plugin validation failed for ${declaredType}: ${getErrorMessage(error)}`);
    }
  }

  const attempts = await Promise.allSettled([
    validateCustomFieldSource(organizationId, source),
    validateCustomReportSource(organizationId, source),
  ]);
  if (attempts[0].status === "fulfilled") {
    return { pluginType: "field", kind: attempts[0].value.kind };
  }
  if (attempts[1].status === "fulfilled") {
    return { pluginType: "report", kind: attempts[1].value.kind };
  }
  const reasons = attempts.reduce<string[]>((messages, attempt) => {
    if (attempt.status === "rejected") {
      messages.push(getErrorMessage(attempt.reason));
    }
    return messages;
  }, []);
  throw new Error(
    reasons.length > 0
      ? `Plugin validation failed for field/report: ${reasons.join(" | ")}`
      : "Plugin validation failed. The file is not a valid field or report plugin.",
  );
};
