/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useState, type ComponentProps, type ReactNode } from "react";
import {
  BreadcrumbPublishContext,
  BreadcrumbRootsContext,
  BreadcrumbTrailContext,
  type PublishedTrail,
} from "./breadcrumb-context";

/** App shell owner of breadcrumb roots and of the trail pages publish. */
export function BreadcrumbProvider({
  children,
  roots,
}: {
  children: ReactNode;
  roots: ComponentProps<typeof BreadcrumbRootsContext.Provider>["value"];
}) {
  const [trail, setTrail] = useState<PublishedTrail | null>(null);

  return (
    <BreadcrumbRootsContext.Provider value={roots}>
      <BreadcrumbPublishContext.Provider value={setTrail}>
        <BreadcrumbTrailContext.Provider value={trail}>{children}</BreadcrumbTrailContext.Provider>
      </BreadcrumbPublishContext.Provider>
    </BreadcrumbRootsContext.Provider>
  );
}
