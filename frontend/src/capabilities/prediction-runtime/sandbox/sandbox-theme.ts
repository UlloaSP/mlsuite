/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { PREDICTION_THEME_VARIABLES } from "@/capabilities/prediction-runtime/mlform/headless-prediction";
import type { SandboxTheme } from "./sandbox-protocol";

/** What a sandboxed form reads: the design system's tokens and the interface's text size. */
const THEME_VARIABLES = [...PREDICTION_THEME_VARIABLES, "--ui-font-size"];

const FONTS_STYLESHEET = 'link[rel="stylesheet"][href^="https://fonts.googleapis.com/"]';

/** The app's current mode, the resolved values of the tokens a sandboxed form reads, and fonts. */
export const readAppTheme = (root: HTMLElement = document.documentElement): SandboxTheme => {
  const style = getComputedStyle(root);
  const tokens: Record<string, string> = {};
  for (const name of THEME_VARIABLES) {
    const value = style.getPropertyValue(name).trim();
    if (value) tokens[name] = value;
  }
  const fonts = document.querySelector<HTMLLinkElement>(FONTS_STYLESHEET)?.href;
  return { mode: root.classList.contains("dark") ? "dark" : "light", tokens, fonts };
};

/**
 * Calls back on every appearance change: mode, palette, contrast and fonts are all applied as
 * attributes of the document element.
 */
export const observeAppAppearance = (onChange: () => void): (() => void) => {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true });
  return () => observer.disconnect();
};

/** Gives the sandbox document the app's tokens, color scheme and font stylesheet. */
export const applySandboxTheme = (theme: SandboxTheme, root: HTMLElement) => {
  for (const [name, value] of Object.entries(theme.tokens)) root.style.setProperty(name, value);
  root.style.colorScheme = theme.mode;
  root.classList.toggle("dark", theme.mode === "dark");
  if (theme.fonts && !document.querySelector(FONTS_STYLESHEET)) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = theme.fonts;
    document.head.append(link);
  }
};
