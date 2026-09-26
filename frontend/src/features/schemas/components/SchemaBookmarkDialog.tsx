/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Tag } from "lucide-react";
import type { FormEvent } from "react";
import { AppButton } from "@/shared/ui/AppButton";
import { AppDialog } from "@/shared/ui/AppDialog";
import { AppTextField } from "@/shared/ui/AppTextField";
import { AppSpinner } from "@/shared/ui/AppSpinner";

type Props = {
  open: boolean;
  defaultName: string;
  snapshotLabel: string;
  pending: boolean;
  error?: string;
  onClose: () => void;
  onConfirm: (name: string) => void;
};

export function SchemaBookmarkDialog({
  open,
  defaultName,
  snapshotLabel,
  pending,
  error,
  onClose,
  onConfirm,
}: Props) {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const value = form.get("name");
    const name = typeof value === "string" ? value.trim() : "";
    if (name) onConfirm(name);
  };

  return (
    <AppDialog
      open={open}
      busy={pending}
      error={error}
      onClose={onClose}
      title={"Bookmark snapshot"}
      description={snapshotLabel}
      onSubmit={submit}
      footer={
        <>
          <AppButton type="button" variant="secondary" onClick={onClose}>
            Cancel
          </AppButton>
          <AppButton disabled={pending} type="submit">
            {pending ? <AppSpinner size={16} /> : <Tag size={16} />}
            Save bookmark
          </AppButton>
        </>
      }
    >
      <div className="space-y-2">
        <label htmlFor="bookmark-name" className="text-sm font-semibold text-fg">
          Bookmark name
        </label>
        <AppTextField
          id="bookmark-name"
          name="name"
          defaultValue={defaultName}
          placeholder="production"
          required
        />
      </div>
    </AppDialog>
  );
}
