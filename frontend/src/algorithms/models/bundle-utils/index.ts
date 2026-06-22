/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

/**
 * JOBLIB_EXT: exposes a stable constant used by this algorithm.
 *
 * Purpose: classifies model bundle files and formats bundle metadata.
 * @returns Stable constant value shared by callers.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const JOBLIB_EXT = ".joblib";
/** MODEL_EXTS: internal constant/cache for model prediction, feedback, upload, and export data shaping. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const MODEL_EXTS = [JOBLIB_EXT];
/**
 * DF_EXTS: exposes a stable constant used by this algorithm.
 *
 * Purpose: classifies model bundle files and formats bundle metadata.
 * @returns Stable constant value shared by callers.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const DF_EXTS = [JOBLIB_EXT];
/**
 * ALL_EXTS: exposes a stable constant used by this algorithm.
 *
 * Purpose: classifies model bundle files and formats bundle metadata.
 * @returns Stable constant value shared by callers.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const ALL_EXTS = [...new Set([...MODEL_EXTS, ...DF_EXTS])];
/**
 * MODEL_EXT_LABEL: exposes a stable constant used by this algorithm.
 *
 * Purpose: classifies model bundle files and formats bundle metadata.
 * @returns Stable constant value shared by callers.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const MODEL_EXT_LABEL = ".joblib";
/**
 * DF_EXT_LABEL: exposes a stable constant used by this algorithm.
 *
 * Purpose: classifies model bundle files and formats bundle metadata.
 * @param name - Input consumed by DF_EXT_LABEL; uses the classifies model bundle files and formats bundle metadata contract.
 * @returns Stable constant value shared by callers.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const DF_EXT_LABEL = ".joblib";

/** getExt: internal lookup helper for model prediction, feedback, upload, and export data shaping. @remarks Args: name; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
function getExt(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot).toLowerCase();
}

/**
 * getStem: extracts a derived value without mutating input
 *
 * Purpose: classifies model bundle files and formats bundle metadata.
 * @param name - Input consumed by getStem; uses the classifies model bundle files and formats bundle metadata contract.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export function getStem(name: string): string {
  return name.replace(/\.[^.]+$/, "");
}

/**
 * isModelFile: returns a boolean guard/result for the requested predicate
 *
 * Purpose: classifies model bundle files and formats bundle metadata.
 * @param name - Input consumed by isModelFile; uses the classifies model bundle files and formats bundle metadata contract.
 * @returns Boolean result for the domain predicate.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export function isModelFile(name: string): boolean {
  return MODEL_EXTS.includes(getExt(name));
}

/**
 * isDfFile: returns a boolean guard/result for the requested predicate
 *
 * Purpose: classifies model bundle files and formats bundle metadata.
 * @param name - Input consumed by isDfFile; uses the classifies model bundle files and formats bundle metadata contract.
 * @returns Boolean result for the domain predicate.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export function isDfFile(name: string): boolean {
  return DF_EXTS.includes(getExt(name));
}

/**
 * isJoblibFile: returns a boolean guard/result for the requested predicate
 *
 * Purpose: classifies model bundle files and formats bundle metadata.
 * @param name - Input consumed by isJoblibFile; uses the classifies model bundle files and formats bundle metadata contract.
 * @returns Boolean result for the domain predicate.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export function isJoblibFile(name: string): boolean {
  return getExt(name) === JOBLIB_EXT;
}

/**
 * slugToTitle: performs the exported transformation for this algorithm.
 *
 * Purpose: classifies model bundle files and formats bundle metadata.
 * @param stem - Input consumed by slugToTitle; uses the classifies model bundle files and formats bundle metadata contract.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export function slugToTitle(stem: string): string {
  return stem.replace(/[_-]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

/**
 * formatBytes: converts raw data into a stable human-readable string
 *
 * Purpose: classifies model bundle files and formats bundle metadata.
 * @param bytes - Input consumed by formatBytes; uses the classifies model bundle files and formats bundle metadata contract.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes)) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}
