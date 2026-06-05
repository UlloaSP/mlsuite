import {
  ArrowUpRight,
  Building2,
  Boxes,
  BrainCircuit,
  Fingerprint,
  Sparkles,
  Users,
} from "lucide-react";
import { Link } from "react-router";
import { cx } from "../../app/components/ui-utils";
import type { SearchResultDto, SearchResultType } from "../types";

const icons: Record<SearchResultType, typeof Building2> = {
  organization: Building2,
  team: Users,
  model: BrainCircuit,
  signature: Fingerprint,
  prediction: Sparkles,
  plugin: Boxes,
};

export function SearchResultItem({
  result,
  active,
  onHover,
  onSelect,
}: {
  result: SearchResultDto;
  active: boolean;
  onHover: () => void;
  onSelect: () => void;
}) {
  const Icon = icons[result.type];

  return (
    <Link
      to={result.href}
      onMouseEnter={onHover}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onSelect}
      className={cx(
        "flex items-center justify-between gap-3 rounded-[20px] px-4 py-3 transition",
        active
          ? "bg-[var(--accent-quiet)] text-[var(--accent-primary-strong)]"
          : "text-[var(--text-primary)] hover:bg-[var(--surface-muted)]",
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--surface-primary)]">
          <Icon size={16} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{result.title}</p>
          <p className="truncate text-xs text-[var(--text-secondary)]">{result.subtitle}</p>
        </div>
      </div>
      <ArrowUpRight size={14} className="shrink-0 text-[var(--text-muted)]" />
    </Link>
  );
}
