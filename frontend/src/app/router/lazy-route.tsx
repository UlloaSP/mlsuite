/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ComponentType } from "react";
import { createRoute, lazyRouteComponent, type AnyRoute } from "@tanstack/react-router";

/**
 * A lazily loaded page under `parent`; keep `load` a literal `import()` so each page gets its own
 * chunk. The router loads the chunk before it leaves the current page.
 */
export const page = <TParent extends AnyRoute, const TPath extends string>(
  parent: TParent,
  path: TPath,
  load: () => Promise<ComponentType>,
) =>
  createRoute({
    getParentRoute: () => parent,
    path,
    component: lazyRouteComponent(() => load().then((Component) => ({ default: Component }))),
  });
