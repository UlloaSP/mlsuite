/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useInferenceCatalog } from "@/features/inferences/api/inference-api";
import { LiveRelativeTime } from "@/shared/ui/LiveRelativeTime";
import { FactList } from "@/app/components/welcome/FactList";

/** The organization's inferences: how many, how they went, and the latest. */
export function InferencesCatalogFacts() {
  const inferences = useInferenceCatalog().data;
  if (!inferences) return null;
  const by = (status: string) => inferences.filter((item) => item.status === status).length;
  const latest = [...inferences].sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt),
  )[0];
  return (
    <FactList
      facts={[
        { label: "Inferences", value: inferences.length },
        {
          label: "Outcomes",
          value: `${by("SUCCESS")} succeeded · ${by("PARTIAL_SUCCESS")} partial · ${by("FAILED")} failed`,
        },
        {
          label: "Latest",
          value: latest ? (
            <>
              {latest.name} · <LiveRelativeTime value={latest.createdAt} /> ago
            </>
          ) : (
            "None yet"
          ),
        },
      ]}
    />
  );
}
