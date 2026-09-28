/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { CalendarDays, Database, Rows3, ScrollText, TrendingUp } from "lucide-react";
import { getModelAlgorithmLabel } from "@/capabilities/prediction-runtime/data/model-utils";
import { modifierName } from "@/shared/lib/relative-time";
import { CatalogEntry } from "@/shared/ui/catalog/CatalogEntry";
import { LiveRelativeTime } from "@/shared/ui/LiveRelativeTime";
import { type ModelAction, ModelActionsMenu } from "./ModelActionsMenu";
import { ModelMetric } from "./ModelMetric";
import type { ModelDto } from "@/shared/api/openapi.gen";

const getModelIcon = (type: string) => {
  switch (type) {
    case "classifier":
      return Database;
    case "regressor":
      return TrendingUp;
    default:
      return Database;
  }
};

type ModelListItemProps = {
  canDelete: boolean;
  canEdit: boolean;
  item: ModelDto;
  schemaCount: number;
  /** The detail page this row opens. */
  to: string;
  onAction: (action: ModelAction, item: ModelDto) => void;
};

export function ModelListItem({ canDelete, canEdit, item, to, onAction }: ModelListItemProps) {
  const Icon = getModelIcon(item.type);
  const modifier = modifierName(item.updatedByName, item.updatedByEmail);

  return (
    <CatalogEntry
      title={item.name}
      icon={
        <div className="flex size-10 items-center justify-center rounded-control bg-surface-muted text-accent">
          <Icon size={18} />
        </div>
      }
      description={getModelAlgorithmLabel(item)}
      metadata={
        <>
          <span>By {modifier}</span>
          <span className="inline-flex items-center gap-1">
            <CalendarDays size={14} />
            Updated <LiveRelativeTime value={item.updatedAt} />
          </span>
        </>
      }
      details={
        <div className="grid w-full grid-cols-2 gap-2 lg:w-55">
          <ModelMetric icon={<Rows3 size={14} />} label="Fields" value={item.fieldCount} />
          <ModelMetric icon={<ScrollText size={14} />} label="Reports" value={item.reportCount} />
        </div>
      }
      to={to}
      actions={
        canDelete || canEdit ? (
          <ModelActionsMenu
            archived={Boolean(item.archivedAt)}
            canDelete={canDelete}
            canEdit={canEdit}
            modelName={item.name}
            onAction={(action) => onAction(action, item)}
          />
        ) : undefined
      }
    />
  );
}
