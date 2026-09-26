/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useSyncExternalStore } from "react";

// The design is drawn on a 1280x800 frame. Larger viewports scale the whole composition
// uniformly; smaller ones keep reference size and rely on the responsive rules in CSS.
const readScale = () => Math.max(1, Math.min(window.innerWidth / 1280, window.innerHeight / 800));

const subscribe = (onChange: () => void) => {
  window.addEventListener("resize", onChange);
  return () => window.removeEventListener("resize", onChange);
};

export function useAuthStageScale() {
  return useSyncExternalStore(subscribe, readScale, () => 1);
}
