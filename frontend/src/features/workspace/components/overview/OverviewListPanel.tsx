/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { cx } from "@/shared/ui/cx";
import { FOCUS_RING } from "@/shared/ui/focus-ring";
import { AppEmptyState } from "@/shared/ui/AppEmptyState";

/** A titled list of recent records with a link to the full page. */
export function OverviewListPanel({
  children,
  emptyText,
  isEmpty,
  linkLabel,
  summary,
  title,
  to,
}: {
  children: ReactNode;
  emptyText: string;
  isEmpty: boolean;
  linkLabel: string;
  summary?: ReactNode;
  title: string;
  to: string;
}) {
  return (
    <section className="flex min-w-0 flex-col rounded-xl border border-line bg-surface">
      <header className="flex items-baseline justify-between gap-3 border-b border-line px-5 py-4">
        <h2 className="text-sm font-semibold text-fg">{title}</h2>
        {summary ? <p className="text-xs text-fg-secondary">{summary}</p> : null}
      </header>
      {isEmpty ? (
        <AppEmptyState compact title={emptyText} />
      ) : (
        <ul className="divide-y divide-line">{children}</ul>
      )}
      <footer className="mt-auto border-t border-line px-5 py-3">
        <Link
          to={to}
          viewTransition
          className={cx(
            "inline-flex items-center gap-1.5 rounded text-xs font-semibold text-accent-strong hover:underline",
            FOCUS_RING,
          )}
        >
          {linkLabel}
          <ArrowRight size={13} />
        </Link>
      </footer>
    </section>
  );
}
