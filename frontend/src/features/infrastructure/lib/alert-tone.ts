/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

export function alertTone(tone: "danger" | "warning" | "accent" | "success") {
  if (tone === "danger") return "bg-danger-subtle text-danger-fg";
  if (tone === "warning") return "bg-warning-subtle text-warning-fg";
  if (tone === "accent") return "bg-accent-subtle text-accent-strong";
  return "bg-success-subtle text-success-fg";
}
