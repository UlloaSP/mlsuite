/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Archive, ArchiveRestore, Copy, Eraser, Pencil, Trash2 } from "lucide-react";
import { AppActionsMenu, type AppMenuAction } from "@/shared/ui/AppActionsMenu";

export type ModelAction = "archive" | "delete" | "duplicate" | "edit" | "purge" | "restore";

const ACTIONS: Array<{
  value: ModelAction;
  label: string;
  icon: AppMenuAction["icon"];
}> = [
  { value: "edit", label: "Edit", icon: Pencil },
  { value: "duplicate", label: "Duplicate", icon: Copy },
  { value: "archive", label: "Archive", icon: Archive },
  { value: "restore", label: "Restore", icon: ArchiveRestore },
  { value: "delete", label: "Delete", icon: Trash2 },
  { value: "purge", label: "Purge", icon: Eraser },
];

type ModelActionsMenuProps = {
  archived: boolean;
  canDelete: boolean;
  /** Duplicating creates a model, so it follows the create-models permission. */
  canDuplicate: boolean;
  canEdit: boolean;
  /** Superadmins only: a purge overrides what keeps a model from being deleted. */
  canPurge?: boolean;
  modelName: string;
  onAction: (action: ModelAction) => void;
};

export function ModelActionsMenu({
  archived,
  canDelete,
  canDuplicate,
  canEdit,
  canPurge = false,
  modelName,
  onAction,
}: ModelActionsMenuProps) {
  const permitted: Record<ModelAction, boolean> = {
    archive: canEdit && !archived,
    restore: canEdit && archived,
    delete: canDelete,
    duplicate: canDuplicate,
    edit: canEdit,
    purge: canPurge,
  };
  const actions = ACTIONS.filter(({ value }) => permitted[value]).map<AppMenuAction>(
    ({ value, label, icon }) => ({
      key: value,
      label,
      icon,
      onSelect: () => onAction(value),
      tone: value === "delete" || value === "purge" ? "danger" : undefined,
    }),
  );

  return <AppActionsMenu label={`Open actions for ${modelName}`} actions={actions} />;
}
