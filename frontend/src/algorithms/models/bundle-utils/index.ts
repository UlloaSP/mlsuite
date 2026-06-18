/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

export const JOBLIB_EXT = ".joblib";
const MODEL_EXTS = [JOBLIB_EXT];
export const DF_EXTS = [JOBLIB_EXT];
export const ALL_EXTS = [...new Set([...MODEL_EXTS, ...DF_EXTS])];
export const MODEL_EXT_LABEL = ".joblib";
export const DF_EXT_LABEL = ".joblib";

function getExt(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot).toLowerCase();
}

export function getStem(name: string): string {
  return name.replace(/\.[^.]+$/, "");
}

export function isModelFile(name: string): boolean {
  return MODEL_EXTS.includes(getExt(name));
}

export function isDfFile(name: string): boolean {
  return DF_EXTS.includes(getExt(name));
}

export function isJoblibFile(name: string): boolean {
  return getExt(name) === JOBLIB_EXT;
}

export function slugToTitle(stem: string): string {
  return stem.replace(/[_-]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes)) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}
