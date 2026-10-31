/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { ImagePlus, Trash2 } from "lucide-react";
import { useRemoveAvatar, useReplaceAvatar } from "@/features/user/api/profile-api";
import { requestFailure } from "@/features/user/lib/request-failure";
import { AppButton } from "@/shared/ui/AppButton";
import { AppCopy } from "@/shared/ui/AppCopy";
import { AppInlineAlert } from "@/shared/ui/AppInlineAlert";
import { cx } from "@/shared/ui/cx";
import { FOCUS_RING } from "@/shared/ui/focus-ring";
import { PersonAvatar } from "@/shared/ui/PersonAvatar";
import { useFileDrop } from "@/shared/ui/use-file-drop";
import type { UserDto } from "@/shared/api/openapi.gen";

/**
 * Their picture. One replaces the last; the API crops it to a square and shrinks it, so what is
 * shown here is what is stored.
 */
export function ProfileAvatarSettings({ user }: { user: UserDto }) {
  const replace = useReplaceAvatar();
  const remove = useRemoveAvatar();
  const pending = replace.isPending || remove.isPending;
  const { browse, dragOver, dropProps, input } = useFileDrop({
    accept: "image/png,image/jpeg",
    inputLabel: "Choose a picture",
    onFiles: ([file]) => {
      if (file) replace.mutate(file);
    },
  });
  const error = replace.isError ? replace.error : remove.isError ? remove.error : null;
  const saved = replace.isSuccess
    ? "Picture updated."
    : remove.isSuccess
      ? "Picture removed."
      : null;

  return (
    <section className="grid gap-4">
      <div>
        <h2 className="text-xl font-semibold text-fg">Picture</h2>
        <AppCopy className="mt-1">
          Shown beside your name in the workspace and on what you publish, even while your profile
          is private.
        </AppCopy>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <PersonAvatar
          key={user.avatarUrl ?? "none"}
          avatarUrl={user.avatarUrl}
          className="size-16 rounded-full border border-line text-lg"
          name={user.fullName}
        />
        <button
          type="button"
          disabled={pending}
          onClick={browse}
          {...dropProps}
          className={cx(
            "flex min-w-0 flex-1 basis-64 cursor-pointer items-center gap-3 rounded-lg border border-dashed px-4 py-3 text-left transition disabled:cursor-wait disabled:opacity-60",
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
              at 256 pixels.
            </span>
          </span>
        </button>
        {input}
        {user.avatarUrl ? (
          <AppButton
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={() => remove.mutate()}
          >
            <Trash2 size={14} />
            Remove picture
          </AppButton>
        ) : null}
      </div>
      {error ? <AppInlineAlert>{requestFailure(error)}</AppInlineAlert> : null}
      {saved ? (
        <p role="status" className="text-sm text-success-fg">
          {saved}
        </p>
      ) : null}
    </section>
  );
}
