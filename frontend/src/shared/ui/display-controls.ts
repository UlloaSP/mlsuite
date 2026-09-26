/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useAtom } from "jotai";
import { nextThemeMode, themeModeAtom } from "./appearance-state";
import { fullscreenAtom } from "./ui-state";

type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => { finished: Promise<void> };
};

const restoreRouteTransition = (element: HTMLElement, previousValue: string) => {
  if (previousValue) {
    element.style.viewTransitionName = previousValue;
  } else {
    element.style.removeProperty("view-transition-name");
  }
};

/** Cycles System → Light → Dark with the corner reveal used by the theme shortcut. */
export function useThemeModeCycle() {
  const [mode, setMode] = useAtom(themeModeAtom);
  const nextMode = nextThemeMode(mode);

  const cycleMode = () => {
    const transitionDocument = document as ViewTransitionDocument;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!transitionDocument.startViewTransition || reduceMotion) {
      setMode(nextMode);
      return;
    }

    const root = document.documentElement;
    const content = document.querySelector<HTMLElement>(".app-content-transition");
    const previousContentTransition = content?.style.viewTransitionName ?? "";
    // The route cross-fade would fight the corner reveal, so it sits this one out.
    if (content) content.style.viewTransitionName = "none";

    root.classList.add("theme-corner-transition");
    const transition = transitionDocument.startViewTransition(() => setMode(nextMode));
    void transition.finished.finally(() => {
      window.setTimeout(() => {
        root.classList.remove("theme-corner-transition");
        if (content) restoreRouteTransition(content, previousContentTransition);
      }, 120);
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
