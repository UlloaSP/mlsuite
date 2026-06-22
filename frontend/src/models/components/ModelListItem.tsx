/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { ArrowRight, Database, TrendingUp } from "lucide-react";
import { cx } from "../../app/components";
import type { ModelDto } from "../../api/models/services";
import { type ModelAction, ModelActionsMenu } from "./ModelActionsMenu";
import { formatTimestamp, getModelAlgorithmLabel } from "../../algorithms/models/utils";

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

export function ModelListItem({
  canDelete,
  canEdit,
  item,
  onOpen,
  onAction,
}: ModelListItemProps) {
  const Icon = getModelIcon(item.type);

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cx(
        "grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-4 rounded border border-[var(--border-soft)] bg-[var(--surface-primary)] p-4 text-left transition",
        "hover:border-[var(--text-primary)] hover:bg-[var(--surface-muted)]",
      )}
    >
      <div className="flex size-11 items-center justify-center rounded bg-[var(--surface-muted)] text-[var(--accent-primary)]">
        <Icon size={18} />
      </div>

      <div className="min-w-0 space-y-3">
        <h3 className="truncate text-base font-semibold text-[var(--text-primary)]">{item.name}</h3>

        <p className="text-sm font-medium text-[var(--text-secondary)]">
          {getModelAlgorithmLabel(item)}
        </p>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--text-muted)]">
          <span>Created {formatTimestamp(item.createdAt)}</span>
          <span>Updated {formatTimestamp(item.updatedAt)}</span>
          <span>{item.fileName}</span>
        </div>
      </div>

      <div className="flex items-start gap-2">
        {canDelete || canEdit ? (
          <ModelActionsMenu
            canDelete={canDelete}
            canEdit={canEdit}
            modelName={item.name}
            onAction={(action) => onAction(action, item)}
          />
        ) : null}
        <div className="flex size-10 items-center justify-center rounded text-[var(--text-muted)]">
          <ArrowRight size={16} />
        </div>
      </div>
    </button>
  );
}
