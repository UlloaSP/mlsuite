/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { AppBreadcrumbs } from "@/shared/ui/AppBreadcrumbs";
import { isTrail, useBreadcrumbTrail } from "@/shared/ui/breadcrumb/breadcrumb-context";

/** The current page's breadcrumb as a status bar along the bottom of the content. */
export function LocationBar() {
  const trail = useBreadcrumbTrail();
  if (!isTrail(trail)) return null;

  return (
    <footer className="shrink-0 border-t border-line bg-surface px-6 py-2.5">
      <AppBreadcrumbs items={trail} />
    </footer>
  );
}
