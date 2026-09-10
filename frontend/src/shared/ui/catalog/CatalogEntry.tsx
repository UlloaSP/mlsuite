import type { ReactNode } from "react";

type Props = {
  title: string;
  description: ReactNode;
  metadata: ReactNode;
  details: ReactNode;
  actions?: ReactNode;
  onOpen: () => void;
};

export function CatalogEntry({ title, description, metadata, details, actions, onOpen }: Props) {
  return (
    <article className="flex shrink-0 items-center gap-3 rounded border border-[var(--border-soft)] bg-[var(--surface-primary)] p-4 transition hover:border-[var(--text-primary)]">
      <button
        type="button"
        onClick={onOpen}
        className="grid min-w-0 flex-1 cursor-pointer gap-4 text-left outline-offset-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"
      >
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold text-[var(--text-primary)]">{title}</h2>
          <p className="mt-1 truncate text-sm text-[var(--text-secondary)]">{description}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--text-muted)]">
            {metadata}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--text-secondary)]">
          {details}
        </div>
      </button>
      {actions ? <div className="shrink-0 self-start">{actions}</div> : null}
    </article>
  );
}
