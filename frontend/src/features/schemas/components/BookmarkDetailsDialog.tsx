/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { LucideIcon } from "lucide-react";
import type { FormEvent } from "react";
import { AppButton } from "@/shared/ui/AppButton";
import { AppDialog } from "@/shared/ui/AppDialog";
import { AppSpinner } from "@/shared/ui/AppSpinner";
import { AppTextArea } from "@/shared/ui/AppTextArea";
import { AppTextField } from "@/shared/ui/AppTextField";

/** The API's limits, so a longer text is stopped while it is typed. */
const NAME_MAX_LENGTH = 180;
const DESCRIPTION_MAX_LENGTH = 800;

export type BookmarkDetails = { name: string; description: string | null };

type Props = {
  title: string;
  /** What is being saved, under the title. */
  summary: string;
  defaultName: string;
  defaultDescription: string;
  open: boolean;
  pending: boolean;
  submitIcon: LucideIcon;
  submitLabel: string;
  /** Why the API refused the last attempt, in its words. */
  error?: string;
  onClose: () => void;
  onConfirm: (details: BookmarkDetails) => void;
};

/** A bookmark's own name and description, asked when it is saved and when it is edited. */
export function BookmarkDetailsDialog({
  title,
  summary,
  defaultName,
  defaultDescription,
  open,
  pending,
  submitIcon: SubmitIcon,
  submitLabel,
  error,
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
    if (name) onConfirm({ name, description: text("description") || null });
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
          <label htmlFor="bookmark-name" className="text-sm font-semibold text-fg">
            Bookmark name
          </label>
          <AppTextField
            id="bookmark-name"
            name="name"
            defaultValue={defaultName}
            placeholder="production"
            maxLength={NAME_MAX_LENGTH}
            required
          />
        </div>
        <div className="grid gap-2">
          <label htmlFor="bookmark-description" className="text-sm font-semibold text-fg">
            Description
          </label>
          <AppTextArea
            id="bookmark-description"
            name="description"
            defaultValue={defaultDescription}
            placeholder="What this bookmark predicts and who it is for"
            maxLength={DESCRIPTION_MAX_LENGTH}
            rows={4}
          />
          <p className="text-xs leading-5 text-fg-muted">
            Optional. Shown with the bookmark here and, once it is published, on its public page.
          </p>
        </div>
      </div>
    </AppDialog>
  );
}
