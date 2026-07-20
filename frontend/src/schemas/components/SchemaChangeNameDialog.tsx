/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Dialog } from "radix-ui";
import { Copy, PencilLine, RefreshCcw } from "lucide-react";
import type { FormEvent } from "react";
import { AppButton } from "@/app/components/AppButton";
import { AppCopy } from "@/app/components/AppCopy";
import { AppTextField } from "@/app/components/AppTextField";

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
    <Dialog.Root open={open} onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[900] bg-black/25 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[901] w-[min(92vw,420px)] -translate-x-1/2 -translate-y-1/2 rounded border border-[var(--border-soft)] bg-[var(--surface-primary)] p-5 shadow-[var(--shadow-card)]">
          <Dialog.Title className="text-lg font-semibold text-[var(--text-primary)]">
            {title}
          </Dialog.Title>
          <Dialog.Description asChild>
            <AppCopy className="mt-1">{description}</AppCopy>
          </Dialog.Description>
          <form className="mt-4 space-y-5" onSubmit={submit}>
            <div className="space-y-2">
              <label
                htmlFor="change-name"
                className="text-sm font-semibold text-[var(--text-primary)]"
              >
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
            <div className="flex justify-end gap-2">
              <Dialog.Close asChild>
                <AppButton variant="secondary">Cancel</AppButton>
              </Dialog.Close>
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
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
