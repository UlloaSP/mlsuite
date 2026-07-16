/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { OrganizationCatalogItemDto } from "../../api/workspace/dtos";
import { cx } from "../../app/components";

export type OrganizationPatch = {
  description?: string | null;
  name?: string;
  slug?: string;
};

export function EditableText({
  as = "text",
  disabled,
  editing,
  onCancel,
  onEdit,
  onSubmit,
  value,
}: {
  as?: "description" | "text" | "title";
  disabled: boolean;
  editing: boolean;
  onCancel: () => void;
  onEdit: () => void;
  onSubmit: (value: string) => Promise<void> | void;
  value: string;
}) {
  const [draft, setDraft] = useState(value);
  const submit = async () => {
    const next = draft.trim();
    onCancel();
    if (!next || next === value) {
      setDraft(value);
      return;
    }
    try {
      await onSubmit(next);
    } catch {
      setDraft(value);
    }
  };

  useEffect(() => setDraft(value), [value]);

  if (editing) {
    return as === "description" ? (
      <textarea
        value={draft}
        autoFocus
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => void submit()}
        className="max-h-32 min-h-20 w-full resize-y rounded border border-[var(--border-soft)] bg-transparent px-2 py-1 text-sm text-[var(--text-primary)] outline-none"
      />
    ) : (
      <input
        value={draft}
        autoFocus
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => void submit()}
        onKeyDown={(event) => {
          if (event.key === "Enter") void submit();
          if (event.key === "Escape") {
            setDraft(value);
            onCancel();
          }
        }}
        className={cx(
          "min-w-0 rounded border border-[var(--border-soft)] bg-transparent px-2 py-1 text-[var(--text-primary)] outline-none",
          as === "title" ? "text-lg font-semibold" : "text-sm font-semibold",
        )}
      />
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onEdit}
      className={cx(
        "block max-w-full truncate text-left hover:underline",
        as === "title"
          ? "text-lg font-semibold text-[var(--text-primary)]"
          : as === "description"
            ? "text-sm leading-6 text-[var(--text-secondary)]"
            : "text-xs font-semibold text-[var(--text-secondary)]",
      )}
    >
      {value}
    </button>
  );
}

export function OwnerButton({ item }: { item: OrganizationCatalogItemDto }) {
  const owner = item.ownerName || item.ownerEmail || "No owner";
  return (
    <button
      type="button"
      onClick={() => toast.info("Not available yet.")}
      className="flex w-fit max-w-full items-center gap-2 rounded px-1 py-1 text-left hover:bg-[var(--surface-muted)]"
    >
      {item.ownerAvatarUrl ? (
        <img src={item.ownerAvatarUrl} alt="" className="size-7 shrink-0 rounded object-cover" />
      ) : (
        <span className="grid size-7 shrink-0 place-items-center rounded bg-[var(--accent-quiet)] text-xs font-semibold text-[var(--accent-primary-strong)]">
          {owner.slice(0, 1).toUpperCase()}
        </span>
      )}
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-[var(--text-primary)]">
          {owner}
        </span>
        {item.ownerEmail ? (
          <span className="block truncate text-xs text-[var(--text-secondary)]">
            {item.ownerEmail}
          </span>
        ) : null}
      </span>
    </button>
  );
}
