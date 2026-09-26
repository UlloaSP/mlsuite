/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useAtomValue } from "jotai";
import { useEffect, useEffectEvent } from "react";
import { isTypingTarget } from "@/app/utils/keyboard-shortcuts";
import { useFullscreen, useThemeModeCycle } from "@/shared/ui/display-controls";
import { matchesShortcut, shortcutBindingsAtom } from "@/shared/ui/shortcut-state";

/** App-wide color scheme and fullscreen shortcuts, plus fullscreen state tracking. */
export function useDisplayShortcuts() {
  const bindings = useAtomValue(shortcutBindingsAtom);
  const { cycleMode } = useThemeModeCycle();
  const { syncFullscreen, toggleFullscreen } = useFullscreen();

  const handleKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (isTypingTarget(event.target)) return;

    if (matchesShortcut(event, bindings["toggle-theme"])) {
      event.preventDefault();
      cycleMode();
    }

    if (matchesShortcut(event, bindings["toggle-fullscreen"])) {
      event.preventDefault();
      toggleFullscreen();
    }
  });
  const handleFullscreenChange = useEffectEvent(syncFullscreen);

  useEffect(() => {
    const onFullscreenChange = () => handleFullscreenChange();
    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, []);
}
