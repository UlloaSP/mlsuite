/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useAtom, useSelector } from "@tanstack/react-store";
import { nextThemeMode, setThemeMode, themeModeAtom } from "./appearance-state";
import { fullscreenAtom } from "./ui-state";

/** Cycles System → Light → Dark with the corner reveal used by the theme shortcut. */
export function useThemeModeCycle() {
  const nextMode = nextThemeMode(useSelector(themeModeAtom));

  const cycleMode = () => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (typeof document.startViewTransition !== "function" || reduceMotion) {
      setThemeMode(nextMode);
      return;
    }

    const root = document.documentElement;
    root.classList.add("theme-corner-transition");
    const transition = document.startViewTransition(() => setThemeMode(nextMode));
    // Skipped when another transition starts first; the theme has changed all the same.
    transition.ready.catch(() => undefined);
    void transition.finished.finally(() => {
      window.setTimeout(() => root.classList.remove("theme-corner-transition"), 120);
    });
  };

  return { cycleMode, nextMode };
}

export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useAtom(fullscreenAtom);
  const supported = typeof document !== "undefined" && document.fullscreenEnabled;

  const toggleFullscreen = () => {
    if (!supported) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void document.documentElement.requestFullscreen();
    }
  };

  // Escape and browser UI can leave fullscreen without our toggle, so the event owns the state.
  const syncFullscreen = () => setIsFullscreen(Boolean(document.fullscreenElement));

  return { isFullscreen, supported, syncFullscreen, toggleFullscreen };
}
