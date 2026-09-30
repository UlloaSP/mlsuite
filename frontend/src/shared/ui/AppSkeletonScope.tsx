/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ReactNode } from "react";

/**
 * Renders its real children as a skeleton while `loading`: layout, panels, and borders stay,
 * text and controls become theme-colored placeholders (see `[data-skeleton]` in appearance.css).
 * The children must already have something to draw — previous data or a partial record.
 * Without any, use `AppLoadingState` instead.
 */
export function AppSkeletonScope({
  children,
  className = "contents",
  label,
  loading,
}: {
  children: ReactNode;
  className?: string;
  label: string;
  loading: boolean;
}) {
  return (
    <>
      {loading ? (
        <span role="status" className="sr-only">
          {label}
        </span>
      ) : null}
      <div
        className={className}
        data-skeleton={loading ? "" : undefined}
        aria-busy={loading || undefined}
        inert={loading}
      >
        {children}
      </div>
    </>
  );
}
