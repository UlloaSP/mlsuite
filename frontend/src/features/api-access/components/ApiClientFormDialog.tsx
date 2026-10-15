/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { FormEvent } from "react";
import type { LucideIcon } from "lucide-react";
import { AppButton } from "@/shared/ui/AppButton";
import { AppDialog } from "@/shared/ui/AppDialog";
import { AppSpinner } from "@/shared/ui/AppSpinner";
import { AppTextArea } from "@/shared/ui/AppTextArea";
import { AppTextField } from "@/shared/ui/AppTextField";

const NAME_MAX_LENGTH = 80;
const DESCRIPTION_MAX_LENGTH = 400;

export type ApiClientDetails = { name: string; description: string | null };

type Props = {
  title: string;
  summary: string;
  defaults: ApiClientDetails;
  open: boolean;
  pending: boolean;
  /** Why the API refused the last attempt, in its words. */
  error?: string;
  submitIcon: LucideIcon;
  submitLabel: string;
  onClose: () => void;
  onConfirm: (details: ApiClientDetails) => void;
};

/** A client's name, unique in the organization, and an optional note on what it is. */
export function ApiClientFormDialog({
  title,
  summary,
  defaults,
  open,
  pending,
  error,
  submitIcon: SubmitIcon,
  submitLabel,
  onClose,
  onConfirm,
}: Props) {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = (field: string) => {
      const value = form.get(field);
      return typeof value === "string" ? value.trim() : "";
    };
    const name = text("name");
    if (!name) return;
    onConfirm({ name, description: text("description") || null });
  };

  return (
    <AppDialog
      open={open}
      busy={pending}
      error={error}
      onClose={onClose}
      title={title}
      description={summary}
      onSubmit={submit}
      footer={
        <>
          <AppButton type="button" variant="secondary" onClick={onClose}>
            Cancel
          </AppButton>
          <AppButton disabled={pending} type="submit">
            {pending ? <AppSpinner size={16} /> : <SubmitIcon size={16} />}
            {submitLabel}
          </AppButton>
        </>
      }
    >
      <div className="grid gap-4">
        <div className="grid gap-2">
          <label htmlFor="api-client-name" className="text-sm font-semibold text-fg">
            Client name
          </label>
          <AppTextField
            id="api-client-name"
            name="name"
            defaultValue={defaults.name}
            placeholder="Lab2Pressure"
            maxLength={NAME_MAX_LENGTH}
            required
          />
        </div>
        <div className="grid gap-2">
          <label htmlFor="api-client-description" className="text-sm font-semibold text-fg">
            Description
          </label>
          <AppTextArea
            id="api-client-description"
            name="description"
            defaultValue={defaults.description ?? ""}
            placeholder="Who runs this software and what it uses the models for"
            maxLength={DESCRIPTION_MAX_LENGTH}
            rows={3}
          />
          <p className="text-xs leading-5 text-fg-muted">Optional. Only members see it.</p>
        </div>
      </div>
    </AppDialog>
  );
}
