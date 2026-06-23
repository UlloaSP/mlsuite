/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { getAllPlugins, type PluginDto } from "../../../api/plugins/services";
import { validateCustomFieldSource } from "../custom-field-source-runtime";
import { validateCustomReportSource } from "../custom-report-source-runtime";

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

let allPluginsPromise: Promise<PluginDto[]> | null = null;
/** detectionCache: internal constant/cache for plugin catalog/runtime source handling. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const detectionCache = new Map<string, Promise<DetectionResult>>();

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

/**
 * invalidatePluginCatalog: clears cached state so next read reloads source data
 *
 * Purpose: loads plugin catalog rows and detects field/report plugin source type.
 * @returns void after cache invalidation.
 * @throws Error when required schema/plugin/model mapping data is missing, malformed, or unsupported.
 * @remarks Side cases/effects: Mutates in-memory cache only; next read recomputes from source data.
 */
export const invalidatePluginCatalog = (): void => {
  allPluginsPromise = null;
  detectionCache.clear();
};

/**
 * loadPlugins: loads and caches async catalog data
 *
 * Purpose: loads plugin catalog rows and detects field/report plugin source type.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Propagates browser/API/runtime failures from the called platform APIs.
 * @remarks Side cases/effects: Performs async catalog/report work and preserves existing cache semantics for repeat calls.
 */
export const loadPlugins = async (): Promise<readonly PluginDto[]> => {
  allPluginsPromise ??= getAllPlugins();
  return allPluginsPromise;
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
