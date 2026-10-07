/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { PropsWithChildren } from "react";
import { LocationBar } from "@/app/components/LocationBar";
import { LocationRail } from "@/app/components/LocationRail";
import { useLocationDisplay } from "@/shared/ui/location-display";
import { useScrollMemory } from "./use-scroll-memory";

/**
 * The box a page is drawn in, the same in the app shell and in the public frame: the page
 * fills it and scrolls inside it, and its breadcrumb trail is drawn where the user chose
 * (the rail and the bottom bar here; above the title by the page header). Render it inside a
 * column that gives it the height left by the frame's own chrome.
 */
export function FrameContent({ children }: PropsWithChildren) {
  const location = useLocationDisplay();
  useScrollMemory();

  return (
    <>
      <div className="app-content-transition relative min-h-0 min-w-0 flex-1 overflow-clip [view-transition-name:app-content]">
        {children}
        {location === "rail-left" ? <LocationRail side="left" /> : null}
        {location === "rail-right" ? <LocationRail side="right" /> : null}
      </div>
      {location === "breadcrumb-bottom" ? <LocationBar /> : null}
    </>
  );
}
