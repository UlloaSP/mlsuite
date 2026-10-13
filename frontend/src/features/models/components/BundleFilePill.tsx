/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { formatBytes } from "@/shared/lib/format-bytes";

type Props = {
  name: string;
  size: number;
};

const ModelIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" />
  </svg>
);

export function BundleFilePill({ name, size }: Props) {
  return (
    <div className="flex items-center gap-2.5 rounded-control border border-line bg-surface-subtle px-3 py-2">
      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-accent-subtle text-accent">
        <ModelIcon />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-fg">{name}</p>
        <p className="mt-px font-mono text-3xs text-fg-muted">{formatBytes(size)}</p>
      </div>

      <span className="flex-shrink-0 rounded-full bg-accent-subtle px-2 py-0.5 font-mono text-3xs font-medium text-accent">
        artifact
      </span>
    </div>
  );
}
