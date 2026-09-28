/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useRef, useState, type DragEvent } from "react";

/** Click-to-browse and drag-and-drop for any element; render `input` next to it. */
export function useFileDrop({
  accept,
  inputLabel,
  onFiles,
}: {
  /** File input `accept`; a hint only, so callers still validate what arrives. */
  accept: string;
  inputLabel: string;
  onFiles: (files: File[]) => void | Promise<void>;
}) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handle = (list: FileList | null) => {
    if (list?.length) void onFiles(Array.from(list));
  };

  return {
    dragOver,
    browse: () => inputRef.current?.click(),
    dropProps: {
      onDragOver: (event: DragEvent) => {
        event.preventDefault();
        setDragOver(true);
      },
      onDragLeave: () => setDragOver(false),
      onDrop: (event: DragEvent) => {
        event.preventDefault();
        setDragOver(false);
        handle(event.dataTransfer.files);
      },
    },
    input: (
      <input
        aria-label={inputLabel}
        ref={inputRef}
        type="file"
        multiple
        hidden
        accept={accept}
        onChange={(event) => {
          handle(event.target.files);
          event.target.value = "";
        }}
      />
    ),
  };
}
