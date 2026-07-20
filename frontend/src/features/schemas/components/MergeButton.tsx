/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { SchemaDraftMergeSide } from "@/features/schemas/api/draft-types";

type Props = {
  conflictIndex: number;
  label: string;
  onClick: () => void;
  paths: string[];
  separator: boolean;
  side: SchemaDraftMergeSide;
};

export function MergeButton({ conflictIndex, label, onClick, paths, separator, side }: Props) {
  return (
    <>
      {separator ? <span data-merge-conflict-action-separator="">|</span> : null}
      <button
        aria-label={`Use ${label} for ${paths.join(", ")}`}
        data-merge-conflict-action={side}
        data-merge-conflict-conflict-index={conflictIndex}
        onClick={onClick}
        type="button"
      >
        use {label}
      </button>
    </>
  );
}
