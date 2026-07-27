import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { AppButton } from "@/shared/ui/AppButton";
import { AppTextField } from "@/shared/ui/AppTextField";
import { CatalogPaginationFooter } from "@/shared/ui/catalog/CatalogPaginationFooter";
import { ReviewSelectionHeader } from "./ReviewSelectionHeader";
import { ReviewSelectionRow } from "./ReviewSelectionRow";

type SelectionId = number | string;

export type ReviewSelectionItem<TId extends SelectionId> = {
  id: TId;
  title: string;
  detail: string;
};

type Props<TId extends SelectionId> = {
  emptyDescription: string;
  error?: boolean;
  items: ReviewSelectionItem<TId>[];
  loading?: boolean;
  onClear: () => void;
  onRetry?: () => void;
  onToggle: (id: TId) => void;
  selectedIds: Set<TId>;
  title: string;
};

const PAGE_SIZE = 6;

export function ReviewSelectionCatalog<TId extends SelectionId>({
  emptyDescription,
  error = false,
  items,
  loading = false,
  onClear,
  onRetry,
  onToggle,
  selectedIds,
  title,
}: Props<TId>) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return items;
    return items.filter((item) =>
      `${item.title} ${item.detail}`.toLowerCase().includes(normalized),
    );
  }, [items, query]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visiblePage = Math.min(page, totalPages - 1);
  const visible = filtered.slice(visiblePage * PAGE_SIZE, (visiblePage + 1) * PAGE_SIZE);

  return (
    <section className="flex min-h-0 flex-col p-5">
      <ReviewSelectionHeader
        title={title}
        count={selectedIds.size}
        total={items.length}
        onClear={onClear}
      />
      <AppTextField
        aria-label={`Search ${title.toLowerCase()}`}
        className="mt-4 w-full py-2.5"
        placeholder={`Search ${title.toLowerCase()}`}
        prefix={<Search size={15} />}
        value={query}
        onChange={(event) => {
          setQuery(event.currentTarget.value);
          setPage(0);
        }}
      />
      <div className="mt-3 min-h-[252px] overflow-hidden rounded border border-[var(--border-soft)]">
        {loading ? (
          <p className="p-4 text-sm text-[var(--text-secondary)]">Loading {title.toLowerCase()}…</p>
        ) : error ? (
          <div className="grid justify-items-start gap-3 p-4">
            <p className="text-sm text-[var(--danger-text)]">
              Could not load {title.toLowerCase()}.
            </p>
            {onRetry ? (
              <AppButton type="button" variant="secondary" onClick={onRetry}>
                Try again
              </AppButton>
            ) : null}
          </div>
        ) : visible.length ? (
          visible.map((item) => (
            <ReviewSelectionRow
              key={item.id}
              selected={selectedIds.has(item.id)}
              title={item.title}
              detail={item.detail}
              onClick={() => onToggle(item.id)}
            />
          ))
        ) : (
          <p className="p-6 text-center text-sm text-[var(--text-secondary)]">
            {query ? `No ${title.toLowerCase()} match your search.` : emptyDescription}
          </p>
        )}
      </div>
      {totalPages > 1 ? (
        <CatalogPaginationFooter
          disabled={loading}
          hasNext={visiblePage + 1 < totalPages}
          page={visiblePage}
          setPage={setPage}
          totalPages={totalPages}
        />
      ) : null}
    </section>
  );
}
