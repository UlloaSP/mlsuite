/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Copy, PencilLine, RefreshCcw } from "lucide-react";
import type { FormEvent } from "react";
import { AppButton } from "@/shared/ui/AppButton";
import { AppDialog } from "@/shared/ui/AppDialog";
import { AppTextField } from "@/shared/ui/AppTextField";

type Props = {
  defaultName: string;
  description: string;
  open: boolean;
  pending: boolean;
  submitLabel: string;
  title: string;
  fieldLabel?: string;
  placeholder?: string;
  submitIcon?: "copy" | "edit";
  onClose: () => void;
  onConfirm: (name: string) => void;
};

export function SchemaChangeNameDialog({
  defaultName,
  description,
  open,
  pending,
  submitLabel,
  title,
  fieldLabel = "Change name",
  placeholder = "Update schema",
  submitIcon = "edit",
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
      onClose={onClose}
      title={title}
      description={description}
      onSubmit={submit}
      footer={
        <>
          <AppButton type="button" variant="secondary" onClick={onClose}>
            Cancel
          </AppButton>
          <AppButton disabled={pending} type="submit">
            {pending ? (
              <RefreshCcw className="animate-spin" size={16} />
            ) : submitIcon === "copy" ? (
              <Copy size={16} />
            ) : (
              <PencilLine size={16} />
            )}
            {submitLabel}
          </AppButton>
        </>
      }
    >
      <div className="space-y-2">
        <label htmlFor="change-name" className="text-sm font-semibold text-fg">
          {fieldLabel}
        </label>
        <AppTextField
          id="change-name"
          key={defaultName}
          name="name"
          defaultValue={defaultName}
          placeholder={placeholder}
          required
        />
      </div>
    </AppDialog>
  );
}
