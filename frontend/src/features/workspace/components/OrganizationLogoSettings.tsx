/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { ImagePlus, Trash2 } from "lucide-react";
import {
  useRemoveOrganizationLogoMutation,
  useReplaceOrganizationLogoMutation,
} from "@/features/workspace/api/workspace.mutations";
import { AppButton } from "@/shared/ui/AppButton";
import { AppCopy } from "@/shared/ui/AppCopy";
import { AppInlineAlert } from "@/shared/ui/AppInlineAlert";
import { cx } from "@/shared/ui/cx";
import { FOCUS_RING } from "@/shared/ui/focus-ring";
import { OrganizationMark } from "@/shared/ui/OrganizationMark";
import { useFileDrop } from "@/shared/ui/use-file-drop";
import type { OrganizationDto } from "@/shared/api/openapi.gen";

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "The request could not be completed.";

/**
 * The organization's logo, for members who may edit the organization. One picture replaces the
 * last; the API crops it to a square and shrinks it, so what is shown here is what is stored.
 */
export function OrganizationLogoSettings({ organization }: { organization: OrganizationDto }) {
  const replace = useReplaceOrganizationLogoMutation();
  const remove = useRemoveOrganizationLogoMutation();
  const pending = replace.isPending || remove.isPending;
  const { browse, dragOver, dropProps, input } = useFileDrop({
    accept: "image/png,image/jpeg",
    inputLabel: "Choose a logo",
    onFiles: ([file]) => {
      if (file) replace.mutate({ organizationId: organization.id, file });
    },
  });
  const error = replace.isError ? replace.error : remove.isError ? remove.error : null;
  const saved = replace.isSuccess ? "Logo updated." : remove.isSuccess ? "Logo removed." : null;

  return (
    <section className="grid gap-4 border-t border-line pt-6">
      <div>
        <h2 className="text-xl font-semibold text-fg">Logo</h2>
        <AppCopy className="mt-1">
          Shown beside the organization's name in the workspace and on its public pages.
        </AppCopy>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <OrganizationMark
          key={organization.logoUrl ?? "none"}
          className="size-16 rounded-xl border border-line"
          fallbackClassName="bg-surface-subtle text-fg-muted"
          iconSize={24}
          logoUrl={organization.logoUrl}
        />
        <button
          type="button"
          disabled={pending}
          onClick={browse}
          {...dropProps}
          className={cx(
            "flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-lg border border-dashed px-4 py-3 text-left transition disabled:cursor-wait disabled:opacity-60",
            FOCUS_RING,
            dragOver
              ? "border-accent bg-accent-subtle"
              : "border-line-strong bg-surface-subtle hover:border-accent hover:bg-accent-subtle",
          )}
        >
          <ImagePlus size={18} className="shrink-0 text-fg-muted" aria-hidden="true" />
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-fg">
              {pending ? "Saving…" : "Drop a picture here or "}
              {pending ? null : <span className="text-accent">browse</span>}
            </span>
            <span className="block text-xs text-fg-muted">
              PNG or JPG, at least 64 by 64 pixels, up to 2 MB. It is cropped to a square and stored
              at 256 pixels, so a square picture is shown whole.
            </span>
          </span>
        </button>
        {input}
        {organization.logoUrl ? (
          <AppButton
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={() => remove.mutate(organization.id)}
          >
            <Trash2 size={14} />
            Remove logo
          </AppButton>
        ) : null}
      </div>
      {error ? <AppInlineAlert>{errorMessage(error)}</AppInlineAlert> : null}
      {saved ? (
        <p role="status" className="text-sm text-success-fg">
          {saved}
        </p>
      ) : null}
    </section>
  );
}
