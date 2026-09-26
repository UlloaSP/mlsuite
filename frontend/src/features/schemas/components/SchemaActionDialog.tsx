/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useState } from "react";
import { AppButton } from "@/shared/ui/AppButton";
import { AppDialog } from "@/shared/ui/AppDialog";
import { AppTextField } from "@/shared/ui/AppTextField";
import type { SchemaCatalogItemDto } from "@/features/schemas/api/schema-types";
import type { SchemaAction } from "./SchemaActionsMenu";

type Props = {
  action: SchemaAction;
  disabled: boolean;
  error?: string;
  item: SchemaCatalogItemDto;
  onCancel: () => void;
  onConfirm: (value?: string) => Promise<void>;
};

const copy = {
  edit: {
    title: "Rename schema",
    submit: "Save name",
    description: "Change the catalog name. Versions and runs stay attached.",
  },
  duplicate: {
    title: "Duplicate schema",
    submit: "Create copy",
    description: "Copy the latest version and model bindings into a new schema.",
  },
  archive: {
    title: "Archive schema?",
    submit: "Archive",
    description: "Archived schemas stay readable and can be filtered from the catalog.",
  },
  delete: {
    title: "Delete schema?",
    submit: "Delete",
    description: "Delete only works when no prediction runs or reviews reference this schema.",
  },
} satisfies Record<SchemaAction, { title: string; submit: string; description: string }>;

export function SchemaActionDialog({ action, disabled, error, item, onCancel, onConfirm }: Props) {
  const needsName = action === "edit" || action === "duplicate";
  const [name, setName] = useState(action === "duplicate" ? `${item.name} Copy` : item.name);
  const meta = copy[action];

  return (
    <AppDialog
      open
      busy={disabled}
      error={error}
      onClose={onCancel}
      title={meta.title}
      description={meta.description}
      onSubmit={(event) => {
        event.preventDefault();
        void onConfirm(needsName ? name.trim() : undefined);
      }}
      footer={
        <>
          <AppButton type="button" variant="secondary" onClick={onCancel} disabled={disabled}>
            Cancel
          </AppButton>
          <AppButton
            type="submit"
            variant={action === "delete" ? "danger" : "primary"}
            disabled={disabled || (needsName && !name.trim())}
          >
            {meta.submit}
          </AppButton>
        </>
      }
    >
      {needsName ? (
        <AppTextField
          value={name}
          autoFocus
          required
          aria-label="Schema name"
          placeholder="Schema name"
          className="w-full"
          onChange={(event) => setName(event.target.value)}
        />
      ) : (
        <p className="rounded-control bg-surface-muted px-3 py-2 text-sm font-semibold text-fg">
          {item.name}
        </p>
      )}
    </AppDialog>
  );
}
