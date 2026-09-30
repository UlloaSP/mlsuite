import type { ReactNode } from "react";
import { Link } from "react-router";
import { cx } from "@/shared/ui/cx";
import { FOCUS_RING } from "@/shared/ui/focus-ring";

type Props = {
  title: string;
  /** Badges or tags shown after the title. */
  titleAccessory?: ReactNode;
  /** A leading icon or avatar box. */
  icon?: ReactNode;
  description?: ReactNode;
  metadata?: ReactNode;
  /** Right-aligned facts (counts, status) on wide screens; they wrap below on small ones. */
  details?: ReactNode;
  /** Row-level controls, always top-right: usually an AppActionsMenu. */
  actions?: ReactNode;
  /** A row that opens a page is a link, so it can be opened in a new tab. */
  to?: string;
  /** For rows that open a dialog instead of a page. Omit both for rows that only offer actions. */
  onOpen?: () => void;
};

const OPEN_CLASS = "flex min-w-0 flex-1 cursor-pointer items-start gap-3 rounded-control text-left";

/** The one catalog row: every catalog list renders its items with it. */
export function CatalogEntry({
  title,
  titleAccessory,
  icon,
  description,
  metadata,
  details,
  actions,
  to,
  onOpen,
}: Props) {
  const body = (
    <>
      {icon ? <div className="shrink-0">{icon}</div> : null}
      <div className="grid min-w-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h2 className="truncate text-base font-semibold text-fg" title={title}>
              {title}
            </h2>
            {titleAccessory}
          </div>
          {description ? (
            <p className="mt-1 truncate text-sm text-fg-secondary">{description}</p>
          ) : null}
          {metadata ? (
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-muted">
              {metadata}
            </div>
          ) : null}
        </div>
        {details ? (
          <div className="flex flex-wrap items-center gap-3 text-sm text-fg-secondary">
            {details}
          </div>
        ) : null}
      </div>
    </>
  );

  return (
    <article
      className={cx(
        "flex shrink-0 items-start gap-3 rounded-card border border-line bg-surface p-4 transition",
        (to || onOpen) && "hover:border-line-strong",
      )}
    >
      {to ? (
        <Link to={to} className={cx(OPEN_CLASS, FOCUS_RING)}>
          {body}
        </Link>
      ) : onOpen ? (
        <button type="button" onClick={onOpen} className={cx(OPEN_CLASS, FOCUS_RING)}>
          {body}
        </button>
      ) : (
        <div className="flex min-w-0 flex-1 items-start gap-3">{body}</div>
      )}
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </article>
  );
}
