/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useRef, useState } from "react";
import { cx } from "@/shared/ui/cx";
import { ALL_EXTS, DF_EXT_LABEL, MODEL_EXT_LABEL } from "@/features/models/lib/bundle-utils";

type Props = {
  onFiles: (files: File[]) => void | Promise<void>;
};

export function BundleDropZone({ onFiles }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handle = (list: FileList | null) => {
    if (list) void onFiles(Array.from(list));
  };

  const active = dragOver;

  return (
    <div className="flex-shrink-0 px-4 pt-4">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
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
        className={cx(
          "group flex w-full cursor-pointer select-none items-center gap-4 rounded-lg border-[1.5px] border-dashed px-4 py-[18px]",
          "bg-surface-subtle",
          "transition-all duration-150",
          active
            ? "-translate-y-px border-accent bg-accent-subtle"
            : "border-line-strong hover:-translate-y-px hover:border-accent hover:bg-accent-subtle",
        )}
      >
        {/* Upload icon box */}
        <span
          className={cx(
            "flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg border transition-all duration-150",
            active
              ? "border-accent bg-accent-subtle text-accent"
              : "border-line bg-surface-muted text-fg-muted group-hover:border-accent group-hover:bg-accent-subtle group-hover:text-accent",
          )}
        >
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
            <polyline points="16 16 12 12 8 16" />
            <line x1="12" y1="12" x2="12" y2="21" />
            <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
          </svg>
        </span>

        {/* Labels */}
        <span className="min-w-0 flex-1 text-left">
          <span className="block text-sm font-bold text-fg">
            Drop files here or <span className="text-accent">browse</span>
          </span>
          <span className="mt-0.5 block truncate font-mono text-2xs text-fg-muted">
            models: {MODEL_EXT_LABEL}
          </span>
          <span className="block truncate font-mono text-2xs text-fg-muted">
            dataframes: {DF_EXT_LABEL}
          </span>
        </span>

        {/* Visual action; the whole drop zone is the interactive control. */}
        <span className="flex-shrink-0 cursor-pointer rounded-lg border border-line-strong bg-surface px-3.5 py-2 text-xs font-bold text-fg-secondary shadow-none transition-all duration-150 hover:-translate-y-px hover:border-line-strong hover:text-fg hover:shadow-hover">
          Add files
        </span>
      </button>

      <input
        aria-label="Upload bundle files"
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
