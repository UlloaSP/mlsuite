/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

export function BundleEmptyState() {
  return (
    <div className="flex min-h-[180px] flex-1 flex-col items-center justify-center px-6 py-9 text-center">
      <div className="mb-3 flex size-[42px] items-center justify-center rounded-[11px] border border-[var(--border-soft)] bg-[var(--surface-muted)] text-[var(--text-muted)]">
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
      <p className="mb-1 text-[13px] font-bold text-[var(--text-muted)]">No bundles yet</p>
      <p className="max-w-[270px] text-[12px] leading-relaxed text-[var(--text-muted)]">
        Drop model files above. Dataframes are attached by matching filename where possible.
      </p>
    </div>
  );
}
