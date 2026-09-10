/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Dialog } from "radix-ui";
import { RefreshCcw, Tag } from "lucide-react";
import type { FormEvent } from "react";
import { AppButton } from "@/shared/ui/AppButton";
import { AppCopy } from "@/shared/ui/AppCopy";
import { AppTextField } from "@/shared/ui/AppTextField";

type Props = {
  open: boolean;
  defaultName: string;
  snapshotLabel: string;
  pending: boolean;
  onClose: () => void;
  onConfirm: (name: string) => void;
};

export function SchemaBookmarkDialog({
  open,
  defaultName,
  snapshotLabel,
  pending,
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
            Bookmark snapshot
          </Dialog.Title>
          <Dialog.Description asChild>
            <AppCopy className="mt-1">{snapshotLabel}</AppCopy>
          </Dialog.Description>
          <form className="mt-4 space-y-5" onSubmit={submit}>
            <div className="space-y-2">
              <label
                htmlFor="bookmark-name"
                className="text-sm font-semibold text-[var(--text-primary)]"
              >
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
            <div className="flex justify-end gap-2">
              <Dialog.Close asChild>
                <AppButton variant="secondary">Cancel</AppButton>
              </Dialog.Close>
              <AppButton disabled={pending} type="submit">
                {pending ? <RefreshCcw className="animate-spin" size={16} /> : <Tag size={16} />}
                Save bookmark
              </AppButton>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
