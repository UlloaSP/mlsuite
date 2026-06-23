import { Building2, Boxes, BrainCircuit, FileJson2, PlayCircle, Users } from "lucide-react";
import { Link } from "react-router";
import { cx } from "../../app/components";
import type { SearchResultDto, SearchResultType } from "../../api/search/dtos";

const icons: Record<SearchResultType, typeof Building2> = {
  organization: Building2,
  team: Users,
  model: BrainCircuit,
  schema: FileJson2,
  predictionRun: PlayCircle,
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
        "flex items-center justify-between gap-3 border-t border-[var(--border-soft)] px-6 py-3 transition first:border-t-0",
        active
          ? "bg-[var(--accent-quiet)] text-[var(--accent-primary-strong)]"
          : "text-[var(--text-primary)] hover:bg-[var(--surface-muted)]",
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <Icon size={16} className="shrink-0 text-[var(--text-muted)]" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{result.title}</p>
          <p className="truncate text-xs text-[var(--text-secondary)]">{result.subtitle}</p>
        </div>
      </div>
    </Link>
  );
}
