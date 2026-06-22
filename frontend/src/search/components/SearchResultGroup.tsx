import { SearchResultItem } from "./SearchResultItem";
import type { SearchGroupDto } from "../../api/search/dtos";

export function SearchResultGroup({
  group,
  activeIndex,
  offset,
  onHover,
  onSelect,
}: {
  group: SearchGroupDto;
  activeIndex: number;
  offset: number;
  onHover: (index: number) => void;
  onSelect: () => void;
}) {
  return (
    <section className="space-y-2">
      <p className="px-2 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[var(--text-secondary)]">
        {group.label}
      </p>
      <div className="space-y-1">
        {group.results.map((result, index) => (
          <SearchResultItem
            key={`${group.label}-${result.type}-${result.id}`}
            result={result}
            active={activeIndex === offset + index}
            onHover={() => onHover(offset + index)}
            onSelect={onSelect}
          />
        ))}
      </div>
    </section>
  );
}
