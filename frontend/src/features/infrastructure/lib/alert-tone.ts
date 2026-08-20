/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

/**
 * alertTone: performs the exported transformation for this algorithm.
 *
 * Purpose: maps infrastructure alert levels to UI tone tokens for alert rows.
 * @param tone - Input consumed by alertTone; uses the maps infrastructure alert levels to UI tone tokens for alert rows contract.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export function alertTone(tone: "danger" | "warning" | "accent" | "success") {
  if (tone === "danger") return "bg-[var(--danger-quiet)] text-[var(--danger-text)]";
  if (tone === "warning") return "bg-[var(--warning-quiet)] text-[var(--warning-text)]";
  if (tone === "accent") return "bg-[var(--accent-quiet)] text-[var(--accent-primary-strong)]";
  return "bg-[var(--success-quiet)] text-[var(--success-text)]";
}
