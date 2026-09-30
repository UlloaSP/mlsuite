/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useGetModels } from "@/features/models/api/model.queries";
import { LiveRelativeTime } from "@/shared/ui/LiveRelativeTime";
import { FactList } from "@/app/components/welcome/FactList";

/** The model catalog: how many, of which kinds, and the last one touched. */
export function ModelsCatalogFacts() {
  const models = useGetModels().data?.filter((model) => !model.archivedAt);
  if (!models) return null;
  const latest = [...models].sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt),
  )[0];
  return (
    <FactList
      facts={[
        { label: "Models", value: models.length },
        {
          label: "Types",
          value: [...new Set(models.map((model) => model.specificType))].join(", ") || "—",
        },
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
      ]}
    />
  );
}
