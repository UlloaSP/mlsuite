/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

export function alertTone(tone: "danger" | "warning" | "success") {
  if (tone === "danger") return "bg-danger-subtle text-danger-fg";
  if (tone === "warning") return "bg-warning-subtle text-warning-fg";
  return "bg-success-subtle text-success-fg";
}
