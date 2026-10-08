/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useAtomValue } from "jotai";
import { createContext, useContext } from "react";
import { locationDisplayAtom, type LocationDisplay } from "./sidebar-preferences";
import { useMediaQuery } from "./use-media-query";

/** The rail names its levels on hover, so it needs a pointer that hovers and some width. */
export const LOCATION_RAIL_MEDIA = "(min-width: 640px) and (hover: hover)";

/**
 * A frame that draws the trail in one place whatever this device chose. The choice is a
 * member's setting; a frame for visitors without a session provides the place it uses.
 */
export const PinnedLocationDisplayContext = createContext<LocationDisplay | null>(null);

/**
 * The location display actually shown: the frame's when it pins one; otherwise the chosen
 * one, or the top breadcrumb where a rail can't work.
 */
export function useLocationDisplay(): LocationDisplay {
  const pinned = useContext(PinnedLocationDisplayContext);
  const chosen = useAtomValue(locationDisplayAtom);
  const railWorks = useMediaQuery(LOCATION_RAIL_MEDIA);
  if (pinned) return pinned;
  if ((chosen === "rail-left" || chosen === "rail-right") && !railWorks) return "breadcrumb-top";
  return chosen;
}
