/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Archive, ArchiveRestore, Copy, Eraser, Pencil, Trash2 } from "lucide-react";
import { AppActionsMenu, type AppMenuAction } from "@/shared/ui/AppActionsMenu";

export type SchemaAction = "archive" | "delete" | "duplicate" | "edit" | "purge" | "restore";

/** A purge has a dialog of its own, for every kind of target. */
export type SchemaDialogAction = Exclude<SchemaAction, "purge">;

const ACTIONS: Array<{ value: SchemaAction; label: string; icon: typeof Pencil }> = [
  { value: "edit", label: "Rename", icon: Pencil },
  { value: "duplicate", label: "Duplicate", icon: Copy },
  { value: "archive", label: "Archive", icon: Archive },
  { value: "restore", label: "Restore", icon: ArchiveRestore },
  { value: "delete", label: "Delete", icon: Trash2 },
  { value: "purge", label: "Purge", icon: Eraser },
];

type SchemaActionsMenuProps = {
  archived: boolean;
  canDelete: boolean;
  canEdit: boolean;
  /** Superadmins only: a purge overrides what keeps a schema from being deleted. */
  canPurge?: boolean;
  onAction: (action: SchemaAction) => void;
  schemaName: string;
};

export function SchemaActionsMenu({
  archived,
  canDelete,
  canEdit,
  canPurge = false,
  onAction,
  schemaName,
}: SchemaActionsMenuProps) {
  const actions = ACTIONS.filter(
    (action) =>
      !(action.value === "archive" && archived) &&
      !(action.value === "restore" && !archived) &&
      (action.value === "purge" ? canPurge : action.value === "delete" ? canDelete : canEdit),
  ).map<AppMenuAction>((action) => ({
    key: action.value,
    label: action.label,
    icon: action.icon,
    onSelect: () => onAction(action.value),
    tone: action.value === "delete" || action.value === "purge" ? "danger" : undefined,
  }));

  return <AppActionsMenu label={`Open actions for ${schemaName}`} actions={actions} />;
}
