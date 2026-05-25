/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

export function alertTone(tone: "danger" | "warning" | "accent" | "success") {
  if (tone === "danger") return "bg-[var(--danger-quiet)] text-[var(--danger-text)]";
  if (tone === "warning") return "bg-[var(--warning-quiet)] text-[var(--warning-text)]";
  if (tone === "accent") return "bg-[var(--accent-quiet)] text-[var(--accent-primary-strong)]";
  return "bg-[var(--success-quiet)] text-[var(--success-text)]";
}
