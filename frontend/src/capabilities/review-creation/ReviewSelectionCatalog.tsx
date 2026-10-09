import { Search } from "lucide-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useDebouncedValue } from "@/shared/lib/use-debounced-value";
import { AppTextField } from "@/shared/ui/AppTextField";
import { CatalogListPanel } from "@/shared/ui/catalog/CatalogListPanel";
import { ReviewSelectionHeader } from "./ReviewSelectionHeader";
import { ReviewSelectionRow } from "./ReviewSelectionRow";
import {
  selectionIdsQueryOptions,
  useSelectionCatalog,
  type SelectionRequest,
} from "./review-creation-api";

type SelectionId = number | string;
export type ReviewSelectionSource = { kind: "runs"; ids: string[] } | { kind: "reviewers" };

type Props<TId extends SelectionId> = {
  organizationId: number | string;
  emptyDescription: string;
  source: ReviewSelectionSource;
  idFromString: (id: string) => TId;
  onClear: () => void;
  onSelectAll: (ids: TId[]) => void;
  onToggle: (id: TId) => void;
  selectedIds: Set<TId>;
  title: string;
};

export function ReviewSelectionCatalog<TId extends SelectionId>({
  organizationId,
  emptyDescription,
  source,
  idFromString,
  onClear,
  onSelectAll,
  onToggle,
  selectedIds,
  title,
}: Props<TId>) {
  const [query, setQuery] = useState("");
  const [selectionError, setSelectionError] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const search = useDebouncedValue(query.trim());
  const queryClient = useQueryClient();
  const request: SelectionRequest = {
    kind: source.kind,
    ids: source.kind === "runs" ? source.ids.map(Number) : [],
    search,
    locale: navigator.language,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    size: 24,
  };
  const catalog = useSelectionCatalog(organizationId, request, true);
  const items = catalog.data?.items ?? [];
  const selectAll = async () => {
    setSelecting(true);
    setSelectionError(false);
    try {
      // What is typed right now, not the search the list is still catching up to.
      const ids = await queryClient.fetchQuery(
        selectionIdsQueryOptions(organizationId, { ...request, search: query.trim() }),
      );
      onSelectAll([...new Set([...selectedIds, ...ids.map(idFromString)])]);
    } catch {
      setSelectionError(true);
    } finally {
      setSelecting(false);
    }
  };
  return (
    <section className="flex min-h-0 flex-col p-5">
      <ReviewSelectionHeader
        title={title}
        count={selectedIds.size}
        total={source.kind === "runs" ? source.ids.length : (catalog.data?.totalAvailable ?? 0)}
        onClear={onClear}
        onSelectAll={() => void selectAll()}
        selectLabel={query.trim() ? "Select results" : "Select all"}
        selectDisabled={
          selecting || catalog.isLoading || Boolean(catalog.error) || !catalog.data?.totalItems
        }
      />
      <AppTextField
        aria-label={`Search ${title.toLowerCase()}`}
        className="mt-4 w-full py-2.5"
        placeholder={`Search ${title.toLowerCase()}`}
        prefix={<Search size={15} />}
        value={query}
        onChange={(event) => {
          setQuery(event.currentTarget.value);
          setSelectionError(false);
        }}
      />
      {selectionError ? (
        <p role="alert" className="mt-2 text-sm text-danger-fg">
          Could not select results. Try again.
        </p>
      ) : null}
      <div className="mt-3 flex h-72 min-h-0 flex-col rounded border border-line">
        <CatalogListPanel
          scrollMemoryKey={false}
          itemCount={items.length}
          hasNext={Boolean(catalog.hasNextPage)}
          onLoadMore={catalog.fetchNextPage}
          isLoading={catalog.isLoading}
          isBusy={catalog.isFetching}
          loadingLabel={`Loading ${title.toLowerCase()}…`}
          errorMessage={catalog.error ? `Could not load ${title.toLowerCase()}.` : null}
          onRetry={() =>
            void (catalog.isFetchNextPageError ? catalog.fetchNextPage() : catalog.refetch())
          }
          emptyState={{
            title: `No ${title.toLowerCase()}`,
            description: query ? "Try another search." : emptyDescription,
          }}
        >
          {items.map((item) => (
            <ReviewSelectionRow
              key={item.id}
              selected={selectedIds.has(idFromString(item.id))}
              title={item.title}
              detail={item.detail}
              onClick={() => onToggle(idFromString(item.id))}
            />
          ))}
        </CatalogListPanel>
      </div>
    </section>
  );
}
