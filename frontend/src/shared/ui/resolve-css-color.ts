/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

// Canvas-backed widgets (xterm, Monaco) need concrete colors, while tokens are
// derived with color-mix(). Painting one pixel lets the browser resolve any CSS color.
const resolve = (token: string) => {
  const probe = document.createElement("span");
  probe.style.color = `var(${token})`;
  document.body.append(probe);
  const color = getComputedStyle(probe).color;
  probe.remove();

  const context = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  if (!context) return { color, channels: null };
  context.fillStyle = color;
  context.fillRect(0, 0, 1, 1);
  const [red, green, blue, alpha] = context.getImageData(0, 0, 1, 1).data;
  return { color, channels: [red, green, blue, alpha ?? 255] as const };
};

export function resolveCssColor(token: string): string {
  const { color, channels } = resolve(token);
  if (!channels) return color;
  const [red, green, blue, alpha] = channels;
  return `rgba(${red}, ${green}, ${blue}, ${alpha / 255})`;
}

/** #rrggbbaa, for consumers that only accept hex colors (Monaco themes). */
export function resolveCssColorHex(token: string): string | null {
  const { channels } = resolve(token);
  if (!channels) return null;
  return `#${channels.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}
