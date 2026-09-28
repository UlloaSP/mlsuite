/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { AppBreadcrumbs } from "@/shared/ui/AppBreadcrumbs";
import { useBreadcrumbTrail } from "@/shared/ui/breadcrumb/breadcrumb-context";

/** The current page's breadcrumb as a status bar along the bottom of the content. */
export function LocationBar() {
  const published = useBreadcrumbTrail();
  if (!published?.items.length) return null;

  return (
    <footer className="shrink-0 border-t border-line bg-surface px-6 py-2.5">
      <AppBreadcrumbs items={published.items} root={published.root} />
    </footer>
  );
}
