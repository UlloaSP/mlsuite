/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { ArrowRight } from "lucide-react";
import { Link } from "react-router";
import { cx } from "@/shared/ui/cx";
import { FOCUS_RING } from "@/shared/ui/focus-ring";
import type { LifecycleStage } from "@/features/workspace/lib/workspace-overview";

const numberFormat = new Intl.NumberFormat();

export function LifecycleStageCard({ stage, step }: { stage: LifecycleStage; step: number }) {
  const Icon = stage.icon;
  const loading = stage.count === undefined;
  const empty = stage.count === 0;

  return (
    <article
      className={cx(
        "group relative flex min-h-44 flex-col rounded-card border border-line bg-surface p-5 transition",
        stage.to && "hover:border-line-strong hover:bg-surface-hover",
      )}
    >
      <div className="flex items-center justify-between text-fg-muted">
        <span className="grid size-9 place-items-center rounded-lg bg-accent-subtle text-accent-strong">
          <Icon size={17} />
        </span>
        <span className="font-mono text-2xs tabular-nums">{String(step).padStart(2, "0")}</span>
      </div>

      <h3 className="mt-4 text-sm font-semibold text-fg">
        {/* The title link covers the card; the empty-state action sits above it. */}
        {stage.to ? (
          <Link
            to={stage.to}
            viewTransition
            className={cx("rounded after:absolute after:inset-0 after:rounded-card", FOCUS_RING)}
          >
            {stage.label}
          </Link>
        ) : (
          stage.label
        )}
      </h3>
      <p
        className="mt-1 text-3xl font-semibold tracking-[-0.03em] text-fg tabular-nums"
        aria-busy={loading}
      >
        {loading ? (
          <span className="inline-block h-8 w-12 animate-pulse rounded-md bg-surface-muted align-middle motion-reduce:animate-none">
            <span className="sr-only">Loading</span>
          </span>
        ) : (
          numberFormat.format(stage.count ?? 0)
        )}
      </p>

      <p className="mt-2 text-xs leading-5 text-fg-secondary">
        {empty ? stage.emptyHint : stage.description}
      </p>

      <div className="mt-auto pt-3">
        {empty && stage.emptyAction ? (
          <Link
            to={stage.emptyAction.to}
            viewTransition
            className={cx(
              "relative z-10 inline-flex items-center gap-1.5 rounded text-xs font-semibold text-accent-strong hover:underline",
              FOCUS_RING,
            )}
          >
            {stage.emptyAction.label}
            <ArrowRight size={13} />
          </Link>
        ) : stage.to ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-fg-muted transition group-hover:text-fg">
            Open {stage.label.toLowerCase()}
            <ArrowRight size={13} className="transition group-hover:translate-x-0.5" />
          </span>
        ) : null}
      </div>
    </article>
  );
}
