/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { getActivePlugins, getPlugins, type PluginDto } from "../../api/pluginService";
import { validateCustomFieldSource } from "./custom-field-runtime";
import { validateCustomReportSource } from "./custom-report-runtime";

export type DetectedPluginType = "field" | "report";

type DetectionResult = {
  pluginType: DetectedPluginType;
  kind: string;
};

let allPluginsPromise: Promise<PluginDto[]> | null = null;
let activePluginsPromise: Promise<PluginDto[]> | null = null;
const detectionCache = new Map<string, Promise<DetectionResult>>();

const detectDeclaredPluginType = (source: string): DetectedPluginType | null => {
  if (source.includes("defineFieldKind(")) {
    return "field";
  }
  if (source.includes("defineReportKind(")) {
    return "report";
  }
  return null;
};

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const validateByType = async (
  source: string,
  pluginType: DetectedPluginType,
): Promise<DetectionResult> => {
  if (pluginType === "field") {
    const definition = await validateCustomFieldSource(source);
    return { pluginType, kind: definition.kind };
  }
  if (pluginType === "report") {
    const definition = await validateCustomReportSource(source);
    return { pluginType, kind: definition.kind };
  }
  throw new Error(`Unsupported plugin type: ${pluginType satisfies never}`);
};

export const invalidatePluginCatalog = (): void => {
  allPluginsPromise = null;
  activePluginsPromise = null;
  detectionCache.clear();
};

export const loadPlugins = async (): Promise<readonly PluginDto[]> => {
  allPluginsPromise ??= getPlugins();
  return allPluginsPromise;
};

export const loadActivePlugins = async (): Promise<readonly PluginDto[]> => {
  activePluginsPromise ??= getActivePlugins();
  return activePluginsPromise;
};

export const detectPluginType = async (source: string): Promise<DetectionResult> => {
  const cacheKey = source;
  let detection = detectionCache.get(cacheKey);
  if (!detection) {
    detection = (async () => {
      const declaredType = detectDeclaredPluginType(source);
      if (declaredType) {
        try {
          return await validateByType(source, declaredType);
        } catch (error: unknown) {
          throw new Error(
            `Plugin validation failed for ${declaredType}: ${getErrorMessage(error)}`,
          );
        }
      }

      const attempts = await Promise.allSettled([
        validateCustomFieldSource(source),
        validateCustomReportSource(source),
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
    })();
    detectionCache.set(cacheKey, detection);
  }
  return detection;
};
