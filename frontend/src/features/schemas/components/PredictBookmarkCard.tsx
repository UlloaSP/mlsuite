/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { ArrowRight, GitCommitHorizontal, Tag } from "lucide-react";
import { Link } from "react-router";
import type { PredictBookmarkDto } from "@/features/schemas/api/schema-types";
import { AppBadge } from "@/shared/ui/AppBadge";
import { cx } from "@/shared/ui/cx";
import { FOCUS_RING } from "@/shared/ui/focus-ring";
import { LiveRelativeTime } from "@/shared/ui/LiveRelativeTime";
import { SECTION_ICONS } from "@/shared/ui/section-icons";
import { snapshotLabel } from "@/shared/lib/snapshot-label";

const VISIBLE_MODELS = 3;

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-2xs font-semibold uppercase tracking-eyebrow text-fg-muted">{label}</dt>
      <dd className="mt-1 truncate text-sm font-semibold tabular-nums text-fg">{value}</dd>
    </div>
  );
}

/** One runnable bookmark: what it runs, how much it is used, and a way in. */
export function PredictBookmarkCard({ bookmark }: { bookmark: PredictBookmarkDto }) {
  const ModelsIcon = SECTION_ICONS.models;
  const behind = bookmark.latestVersion > bookmark.version;
  const extraModels = bookmark.models.length - VISIBLE_MODELS;

  return (
    <Link
      to={`/predict/${bookmark.id}`}
      aria-label={`Predict with ${bookmark.name} (${bookmark.schemaName})`}
      className={cx(
        "group flex h-full flex-col gap-4 rounded-card border border-line bg-surface p-5 transition hover:border-line-strong hover:shadow-hover",
        FOCUS_RING,
      )}
    >
      <header className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-control bg-accent-subtle text-accent-strong">
          <Tag size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-fg-secondary">{bookmark.schemaName}</p>
          <h2 className="truncate text-lg font-semibold tracking-[-0.01em] text-fg">
            {bookmark.name}
          </h2>
        </div>
        <AppBadge tone={behind ? "warning" : "neutral"} className="shrink-0">
          <GitCommitHorizontal size={12} className="mr-1" />v{bookmark.version}
        </AppBadge>
      </header>

      <p className="line-clamp-2 min-h-10 text-sm leading-5 text-fg-secondary">
        {bookmark.schemaDescription?.trim() ||
          `Snapshot ${snapshotLabel(bookmark.versionName, bookmark.version)}.`}
      </p>

      <ul aria-label="Models" className="flex min-h-6 flex-wrap gap-1.5">
        {bookmark.models.slice(0, VISIBLE_MODELS).map((model) => (
          <li
            key={model}
            className="inline-flex max-w-40 items-center gap-1 rounded-full border border-line bg-surface-muted px-2 py-0.5 text-xs text-fg-secondary"
          >
            <ModelsIcon size={12} className="shrink-0" />
            <span className="truncate">{model}</span>
          </li>
        ))}
        {extraModels > 0 ? (
          <li className="rounded-full px-1.5 py-0.5 text-xs text-fg-muted">+{extraModels}</li>
        ) : null}
      </ul>

      <dl className="grid grid-cols-3 gap-3 border-t border-line pt-4">
        <Stat label="Inputs" value={String(bookmark.fieldCount)} />
        <Stat label="Reports" value={String(bookmark.reportCount)} />
        <Stat label="Inferences" value={String(bookmark.runCount)} />
      </dl>

      <footer className="mt-auto flex items-center justify-between gap-3 text-xs text-fg-muted">
        <span className="truncate">
          {behind ? (
            <span className="text-warning-fg">v{bookmark.latestVersion} is available</span>
          ) : bookmark.lastRunAt ? (
            <>
              Last run <LiveRelativeTime value={bookmark.lastRunAt} /> ago
            </>
          ) : (
            "Not run yet"
          )}
        </span>
        <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-accent-strong">
          Predict
          <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
        </span>
      </footer>
    </Link>
  );
}
