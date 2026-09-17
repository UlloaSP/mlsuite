/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { MLSuiteMark } from "@/shared/ui/MLSuiteMark";

export function AuthHeader() {
  return (
    <header className="relative z-10 order-0 col-span-full flex h-[4.75rem] items-center justify-between border-b border-[var(--border-soft)] bg-[color-mix(in_srgb,var(--surface-secondary)_82%,transparent)] px-5 sm:px-8 lg:px-12 xl:px-16">
      <div className="flex items-center gap-2.5" role="img" aria-label="ML Suite">
        <MLSuiteMark size={29} />
        <span
          aria-hidden="true"
          className="flex items-baseline gap-[0.08em] text-lg leading-none tracking-[-0.045em] text-[var(--text-primary)]"
        >
          <span className="font-extrabold">ML</span>
          <span className="font-light">suite</span>
        </span>
      </div>
    </header>
  );
}
