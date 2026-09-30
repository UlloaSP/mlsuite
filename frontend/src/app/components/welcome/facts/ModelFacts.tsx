/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useModel } from "@/features/models/api/model.queries";
import { LiveRelativeTime } from "@/shared/ui/LiveRelativeTime";
import { AppBadge } from "@/shared/ui/AppBadge";
import { FactList } from "@/app/components/welcome/FactList";

/** One model: what it is, its interface, and who changed it last. */
export function ModelFacts({ modelId }: { modelId: string }) {
  const model = useModel(modelId).data;
  if (!model) return null;
  return (
    <FactList
      facts={[
        {
          label: "Type",
          value: (
            <>
              {model.specificType}
              {model.archivedAt ? (
                <>
                  {" "}
                  <AppBadge tone="warning">Archived</AppBadge>
                </>
              ) : null}
            </>
          ),
        },
        { label: "File", value: model.fileName },
        { label: "Inputs", value: model.fieldCount },
        { label: "Reports", value: model.reportCount },
        {
          label: "Updated",
          value: (
            <>
              <LiveRelativeTime value={model.updatedAt} /> ago
              {model.updatedByName ? ` by ${model.updatedByName}` : ""}
            </>
          ),
        },
      ]}
    />
  );
}
