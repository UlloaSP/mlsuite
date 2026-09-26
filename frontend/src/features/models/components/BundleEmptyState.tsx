/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useRef, useState } from "react";

import { cx } from "@/shared/ui/cx";
import { ALL_EXTS } from "@/features/models/lib/bundle-utils";

type Props = {
  onFiles: (files: File[]) => void | Promise<void>;
};

export function BundleEmptyState({ onFiles }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handle = (list: FileList | null) => {
    if (list) onFiles(Array.from(list));
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Drop model or dataframe files"
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        handle(e.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      className={cx(
        "flex min-h-45 flex-1 cursor-pointer flex-col items-center justify-center px-6 py-9 text-center transition-all duration-150",
        dragOver && "bg-accent-subtle",
      )}
    >
      <div className="mb-3 flex size-10 items-center justify-center rounded-xl border border-line bg-surface-muted text-fg-muted">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      </div>
      <p className="mb-1 text-sm font-semibold text-fg-muted">No bundles yet</p>
      <p className="max-w-68 text-xs leading-relaxed text-fg-muted">
        Drop a model or dataframe here. Dataframes can wait for a model.
      </p>
      <input
        ref={inputRef}
        type="file"
        multiple
        hidden
        accept={ALL_EXTS.join(",")}
        onChange={(e) => {
          handle(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
