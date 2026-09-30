/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ReactNode } from "react";
import { cx } from "./cx";
import { FOCUS_RING } from "./focus-ring";
import { useFileDrop } from "./use-file-drop";

/**
 * A large secondary drop target, usually an empty list: the whole area can be
 * clicked or dropped onto, so an empty upload page is one big target.
 */
export function AppFileDropArea({
  accept,
  children,
  inputLabel,
  label,
  onFiles,
}: {
  accept: string;
  children: ReactNode;
  inputLabel: string;
  /** Accessible name of the area, e.g. "Drop model or dataframe files". */
  label: string;
  onFiles: (files: File[]) => void | Promise<void>;
}) {
  const { browse, dragOver, dropProps, input } = useFileDrop({ accept, inputLabel, onFiles });

  return (
    <>
      {/* A div, not a button: the empty state inside renders block content. */}
      <div
        role="button"
        tabIndex={0}
        aria-label={label}
        onClick={browse}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          browse();
        }}
        {...dropProps}
        className={cx(
          "flex min-h-40 flex-1 cursor-pointer flex-col items-center justify-center rounded-card border border-dashed transition",
          FOCUS_RING,
          dragOver
            ? "border-accent bg-accent-subtle"
            : "border-transparent hover:border-line hover:bg-surface-subtle",
        )}
      >
        {children}
      </div>
      {input}
    </>
  );
}
