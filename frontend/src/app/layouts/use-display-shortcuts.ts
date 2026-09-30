/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useEffect, useEffectEvent } from "react";
import { useFullscreen, useThemeModeCycle } from "@/shared/ui/display-controls";
import { useShortcut } from "@/shared/ui/use-shortcut";

/** App-wide color scheme and fullscreen shortcuts, plus fullscreen state tracking. */
export function useDisplayShortcuts() {
  const { cycleMode } = useThemeModeCycle();
  const { syncFullscreen, toggleFullscreen } = useFullscreen();
  const handleFullscreenChange = useEffectEvent(syncFullscreen);

  useShortcut("toggle-theme", cycleMode);
  useShortcut("toggle-fullscreen", toggleFullscreen);

  useEffect(() => {
    const onFullscreenChange = () => handleFullscreenChange();
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);
}
