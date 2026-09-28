/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useOrganizationCatalogPageQuery } from "@/features/workspace/api/workspace.queries";
import { LiveRelativeTime } from "@/shared/ui/LiveRelativeTime";
import { FactList } from "@/app/components/welcome/FactList";

/** Every organization on the platform, and the one changed last. */
export function OrganizationsFacts() {
  const page = useOrganizationCatalogPageQuery(0, "", "updated").data;
  if (!page) return null;
  const latest = page.items[0];
  return (
    <FactList
      facts={[
        { label: "Organizations", value: page.totalItems },
        {
          label: "Last updated",
          value: latest ? (
            <>
              {latest.name} · <LiveRelativeTime value={latest.updatedAt} /> ago
            </>
          ) : (
            "—"
          ),
        },
        ...(latest
          ? [
              {
                label: "Its size",
                value: `${latest.memberCount} members · ${latest.modelCount} models · ${latest.inferenceCount} inferences`,
              },
            ]
          : []),
      ]}
    />
  );
}
