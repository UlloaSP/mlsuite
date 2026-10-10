/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useState, type ReactNode } from "react";
import {
  BreadcrumbPublishContext,
  BreadcrumbTrailContext,
  type BreadcrumbTrailItem,
} from "./breadcrumb-context";

/** App shell owner of the trail the page on screen publishes. */
export function BreadcrumbProvider({ children }: { children: ReactNode }) {
  const [trail, setTrail] = useState<BreadcrumbTrailItem[] | null>(null);

  return (
    <BreadcrumbPublishContext.Provider value={setTrail}>
      <BreadcrumbTrailContext.Provider value={trail}>{children}</BreadcrumbTrailContext.Provider>
    </BreadcrumbPublishContext.Provider>
  );
}
