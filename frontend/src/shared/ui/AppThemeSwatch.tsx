/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

export function AppThemeSwatch({
  colors: [surface, accent],
  mode,
}: {
  colors: readonly [string, string];
  mode: "light" | "dark";
}) {
  const background = `radial-gradient(circle at 28% 22%, rgba(255,255,255,.72), transparent 28%), radial-gradient(circle at 72% 78%, ${accent}, transparent 58%), ${surface}`;
  const shadow =
    mode === "light"
      ? "inset -10px -12px 18px rgba(0,0,0,.16), 0 8px 18px rgba(0,0,0,.12)"
      : "inset -10px -12px 18px rgba(0,0,0,.36), 0 8px 18px rgba(0,0,0,.18)";
  return (
    <span className="absolute inset-0 rounded-full" style={{ background, boxShadow: shadow }} />
  );
}
