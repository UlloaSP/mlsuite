/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useState } from "react";
import { AppButton, AppTextField } from "../../app/components";
import type { SchemaCatalogItemDto } from "../../api/schemas/dtos";
import type { SchemaAction } from "./SchemaActionsMenu";

type Props = {
  action: SchemaAction;
  disabled: boolean;
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
    description: "Delete only works when no prediction runs or review links reference this schema.",
  },
} satisfies Record<SchemaAction, { title: string; submit: string; description: string }>;

export function SchemaActionDialog({ action, disabled, item, onCancel, onConfirm }: Props) {
  const needsName = action === "edit" || action === "duplicate";
  const [name, setName] = useState(action === "duplicate" ? `${item.name} Copy` : item.name);
  const meta = copy[action];

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 p-4">
      <form
        className="w-full max-w-sm rounded border border-[var(--border-soft)] bg-[var(--surface-primary)] p-5 shadow-[var(--shadow-hover)]"
        onSubmit={(event) => {
          event.preventDefault();
          void onConfirm(needsName ? name.trim() : undefined);
        }}
      >
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">{meta.title}</h2>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">{meta.description}</p>
        {needsName ? (
          <AppTextField
            value={name}
            autoFocus
            required
            placeholder="Schema name"
            className="mt-4 w-full"
            onChange={(event) => setName(event.target.value)}
          />
        ) : (
          <p className="mt-4 rounded bg-[var(--surface-muted)] px-3 py-2 text-sm font-semibold text-[var(--text-primary)]">
            {item.name}
          </p>
        )}
        <div className="mt-5 flex justify-end gap-2">
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
        </div>
      </form>
    </div>
  );
}
