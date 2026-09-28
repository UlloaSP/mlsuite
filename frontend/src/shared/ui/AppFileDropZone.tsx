/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useRef, useState } from "react";
import { cx } from "./cx";

type Props = {
  /** File input `accept`; a hint only, so callers still validate what arrives. */
  accept: string;
  /** One mono line per accepted file family, e.g. "models: .joblib, .pkl". */
  hints: string[];
  inputLabel: string;
  onFiles: (files: File[]) => void | Promise<void>;
};

/** The whole zone is one control: click to browse or drop files onto it. */
export function AppFileDropZone({ accept, hints, inputLabel, onFiles }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handle = (list: FileList | null) => {
    if (list?.length) void onFiles(Array.from(list));
  };

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
          "group flex w-full cursor-pointer select-none items-center gap-4 rounded-lg border border-dashed px-4 py-4.5",
          "bg-surface-subtle",
          "transition-all duration-150",
          dragOver
            ? "border-accent bg-accent-subtle"
            : "border-line-strong hover:border-accent hover:bg-accent-subtle",
        )}
      >
        <span
          className={cx(
            "flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg border transition-all duration-150",
            dragOver
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

        <span className="min-w-0 flex-1 text-left">
          <span className="block text-sm font-semibold text-fg">
            Drop files here or <span className="text-accent">browse</span>
          </span>
          {hints.map((hint, index) => (
            <span
              key={hint}
              className={cx(
                "block truncate font-mono text-2xs text-fg-muted",
                index === 0 && "mt-0.5",
              )}
            >
              {hint}
            </span>
          ))}
        </span>

        {/* Visual action; the whole drop zone is the interactive control. */}
        <span className="flex-shrink-0 cursor-pointer rounded-lg border border-line-strong bg-surface px-3.5 py-2 text-xs font-semibold text-fg-secondary shadow-none transition-all duration-150 hover:border-line-strong hover:text-fg hover:shadow-hover">
          Add files
        </span>
      </button>

      <input
        aria-label={inputLabel}
        ref={inputRef}
        type="file"
        multiple
        hidden
        accept={accept}
        onChange={(e) => {
          handle(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
