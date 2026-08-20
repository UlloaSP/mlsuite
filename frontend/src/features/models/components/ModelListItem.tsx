/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { CalendarDays, Database, Rows3, ScrollText, TrendingUp } from "lucide-react";
import { getModelAlgorithmLabel } from "@/capabilities/mlform/model-utils";
import { modifierName } from "@/shared/lib/relative-time";
import type { ModelDto } from "@/features/models/api/model.types";
import { cx } from "@/shared/ui/cx";
import { LiveRelativeTime } from "@/shared/ui/LiveRelativeTime";
import { type ModelAction, ModelActionsMenu } from "./ModelActionsMenu";
import { ModelMetric } from "./ModelMetric";

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
  onOpen: () => void;
  onAction: (action: ModelAction, item: ModelDto) => void;
};

export function ModelListItem({ canDelete, canEdit, item, onOpen, onAction }: ModelListItemProps) {
  const Icon = getModelIcon(item.type);
  const modifier = modifierName(item.updatedByName, item.updatedByEmail);

  return (
    <article
      className={cx(
        "grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-4 rounded border border-[var(--border-soft)] bg-[var(--surface-primary)] p-4 text-left transition lg:grid-cols-[auto_minmax(0,1fr)_minmax(220px,auto)_auto]",
        "hover:border-[var(--text-primary)] hover:bg-[var(--surface-muted)]",
      )}
    >
      <div className="flex size-11 items-center justify-center rounded bg-[var(--surface-muted)] text-[var(--accent-primary)]">
        <Icon size={18} />
      </div>

      <button type="button" onClick={onOpen} className="min-w-0 cursor-pointer space-y-3 text-left">
        <h3 className="truncate text-base font-semibold text-[var(--text-primary)]">{item.name}</h3>

        <p className="text-sm font-medium text-[var(--text-secondary)]">
          {getModelAlgorithmLabel(item)}
        </p>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--text-muted)]">
          <span>By {modifier}</span>
          <span className="inline-flex items-center gap-1">
            <CalendarDays size={14} />
            Updated <LiveRelativeTime value={item.updatedAt} />
          </span>
        </div>
      </button>

      <div className="grid grid-cols-2 gap-2">
        <ModelMetric icon={<Rows3 size={14} />} label="Fields" value={item.fieldCount} />
        <ModelMetric icon={<ScrollText size={14} />} label="Reports" value={item.reportCount} />
      </div>

      {canDelete || canEdit ? (
        <div className="justify-self-end self-start">
          <ModelActionsMenu
            canDelete={canDelete}
            canEdit={canEdit}
            modelName={item.name}
            onAction={(action) => onAction(action, item)}
          />
        </div>
      ) : null}
    </article>
  );
}
