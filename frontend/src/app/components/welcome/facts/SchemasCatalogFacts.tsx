/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useCurrentOrganizationId } from "@/capabilities/workspace-context/workspace-context";
import { useSchemaCatalogPageQuery } from "@/features/schemas/api/schema-queries";
import { LiveRelativeTime } from "@/shared/ui/LiveRelativeTime";
import { FactList } from "@/app/components/welcome/FactList";

/** The schema catalog: how many are active and which changed last. */
export function SchemasCatalogFacts() {
  const page = useSchemaCatalogPageQuery(
    useCurrentOrganizationId(),
    0,
    "",
    "updated",
    "active",
  ).data;
  if (!page) return null;
  const latest = page.items[0];
  return (
    <FactList
      facts={[
        { label: "Active schemas", value: page.totalItems },
        {
          label: "Last updated",
          value: latest ? (
            <>
              {latest.name}
              {latest.updatedAt ? (
                <>
                  {" "}
                  · <LiveRelativeTime value={latest.updatedAt} /> ago
                </>
              ) : null}
            </>
          ) : (
            "—"
          ),
        },
        ...(latest
          ? [
              {
                label: "Its contents",
                value: `${latest.modelCount} models · ${latest.fieldCount} inputs · ${latest.reportCount} reports`,
              },
            ]
          : []),
      ]}
    />
  );
}
