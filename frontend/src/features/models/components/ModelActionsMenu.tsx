/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Archive, Copy, Pencil, Trash2 } from "lucide-react";
import { AppActionsMenu, type AppMenuAction } from "@/shared/ui/AppActionsMenu";

export type ModelAction = "archive" | "delete" | "duplicate" | "edit";

const ACTIONS: Array<{
  value: ModelAction;
  label: string;
  icon: AppMenuAction["icon"];
}> = [
  { value: "edit", label: "Edit", icon: Pencil },
  { value: "duplicate", label: "Duplicate", icon: Copy },
  { value: "archive", label: "Archive", icon: Archive },
  { value: "delete", label: "Delete", icon: Trash2 },
];

type ModelActionsMenuProps = {
  archived: boolean;
  canDelete: boolean;
  canEdit: boolean;
  modelName: string;
  onAction: (action: ModelAction) => void;
};

export function ModelActionsMenu({
  archived,
  canDelete,
  canEdit,
  modelName,
  onAction,
}: ModelActionsMenuProps) {
  const actions = ACTIONS.filter(
    ({ value }) => !(archived && value === "archive") && (value === "delete" ? canDelete : canEdit),
  ).map<AppMenuAction>(({ value, label, icon }) => ({
    key: value,
    label,
    icon,
    onSelect: () => onAction(value),
    tone: value === "delete" ? "danger" : undefined,
  }));

  return <AppActionsMenu label={`Open actions for ${modelName}`} actions={actions} />;
}
