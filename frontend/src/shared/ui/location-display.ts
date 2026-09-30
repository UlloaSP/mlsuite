/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useAtomValue } from "jotai";
import { locationDisplayAtom, type LocationDisplay } from "./sidebar-preferences";
import { useMediaQuery } from "./use-media-query";

/** The rail names its levels on hover, so it needs a pointer that hovers and some width. */
export const LOCATION_RAIL_MEDIA = "(min-width: 640px) and (hover: hover)";

/** The location display actually shown: the chosen one, or the top breadcrumb where a rail can't work. */
export function useLocationDisplay(): LocationDisplay {
  const chosen = useAtomValue(locationDisplayAtom);
  const railWorks = useMediaQuery(LOCATION_RAIL_MEDIA);
  if ((chosen === "rail-left" || chosen === "rail-right") && !railWorks) return "breadcrumb-top";
  return chosen;
}
