/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Archive, Copy, Pencil, Trash2 } from "lucide-react";
import { AppActionsMenu, type AppMenuAction } from "@/shared/ui/AppActionsMenu";

export type SchemaAction = "archive" | "delete" | "duplicate" | "edit";

const ACTIONS: Array<{ value: SchemaAction; label: string; icon: typeof Pencil }> = [
  { value: "edit", label: "Rename", icon: Pencil },
  { value: "duplicate", label: "Duplicate", icon: Copy },
  { value: "archive", label: "Archive", icon: Archive },
  { value: "delete", label: "Delete", icon: Trash2 },
];

type SchemaActionsMenuProps = {
  archived: boolean;
  canDelete: boolean;
  canEdit: boolean;
  onAction: (action: SchemaAction) => void;
  schemaName: string;
};

export function SchemaActionsMenu({
  archived,
  canDelete,
  canEdit,
  onAction,
  schemaName,
}: SchemaActionsMenuProps) {
  const actions = ACTIONS.filter(
    (action) =>
      !(action.value === "archive" && archived) &&
      (action.value === "delete" ? canDelete : canEdit),
  ).map<AppMenuAction>((action) => ({
    key: action.value,
    label: action.label,
    icon: action.icon,
    onSelect: () => onAction(action.value),
    tone: action.value === "delete" ? "danger" : undefined,
  }));

  return <AppActionsMenu label={`Open actions for ${schemaName}`} actions={actions} />;
}
