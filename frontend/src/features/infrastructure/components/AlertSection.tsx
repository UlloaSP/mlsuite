import type { ReactNode } from "react";

/** A titled list on the alerts page. */
export function AlertSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section aria-label={title} className="flex flex-col gap-2">
      <div>
        <h2 className="text-sm font-semibold text-fg">{title}</h2>
        {description ? <p className="text-xs text-fg-secondary">{description}</p> : null}
      </div>
      <div className="overflow-hidden rounded-card border border-line bg-surface divide-y divide-line">
        {children}
      </div>
    </section>
  );
}
