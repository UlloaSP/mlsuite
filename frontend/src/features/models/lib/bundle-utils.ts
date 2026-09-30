/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

const JOBLIB_EXT = ".joblib";
const ONNX_EXT = ".onnx";
export const MODEL_EXTS = [JOBLIB_EXT, ONNX_EXT];
export const DF_EXTS = [JOBLIB_EXT];
export const ALL_EXTS = [...new Set([...MODEL_EXTS, ...DF_EXTS])];
export const MODEL_EXT_LABEL = ".joblib or .onnx";
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

export function slugToTitle(stem: string): string {
  return stem.replace(/[_-]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}
