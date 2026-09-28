/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { validateCustomFieldSource } from "@/capabilities/prediction-runtime/plugins/custom-field-source-runtime";
import { validateCustomReportSource } from "@/capabilities/prediction-runtime/plugins/custom-report-source-runtime";

export type DetectedPluginType = "field" | "report";

type DetectionResult = {
  pluginType: DetectedPluginType;
  kind: string;
};

const detectDeclaredPluginType = (source: string): DetectedPluginType | null => {
  if (source.includes("defineFieldKind(")) {
    return "field";
  }
  if (/defineReportKind\s*(?:<[^>]+>\s*)?\(/.test(source)) {
    return "report";
  }
  return null;
};

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

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
