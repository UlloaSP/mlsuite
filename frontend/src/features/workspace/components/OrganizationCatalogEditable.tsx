/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useState } from "react";
import { cx } from "@/shared/ui/cx";

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
  const label =
    as === "description"
      ? "Organization description"
      : as === "title"
        ? "Organization name"
        : "Organization slug";
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

  if (editing) {
    return as === "description" ? (
      <textarea
        aria-label={label}
        value={draft}
        autoFocus
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => void submit()}
        className="max-h-32 min-h-20 w-full resize-y rounded border border-[var(--border-soft)] bg-transparent px-2 py-1 text-sm text-[var(--text-primary)] outline-none"
      />
    ) : (
      <input
        aria-label={label}
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
      onClick={() => {
        setDraft(value);
        onEdit();
      }}
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
