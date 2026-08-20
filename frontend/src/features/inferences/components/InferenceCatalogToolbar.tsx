import { Search, SlidersHorizontal } from "lucide-react";
import type { InferenceCatalogItemDto } from "@/features/inferences/api/inference-api";
import type { InferenceFilters } from "@/features/inferences/lib/inference-filter";
import { AppSelect } from "@/shared/ui/AppSelect";
import { AppTextField } from "@/shared/ui/AppTextField";
import { AppToolbar } from "@/shared/ui/AppToolbar";

type Props = {
  filters: InferenceFilters;
  inferences: InferenceCatalogItemDto[];
  onChange: <K extends keyof InferenceFilters>(key: K, value: InferenceFilters[K]) => void;
};

const uniqueOptions = (items: Array<{ value: string; label: string }>) =>
  [...new Map(items.map((item) => [item.value, item])).values()].sort((a, b) =>
    a.label.localeCompare(b.label),
  );

export function InferenceCatalogToolbar({ filters, inferences, onChange }: Props) {
  const schemaOptions = uniqueOptions(
    inferences.map((item) => ({ value: String(item.schemaId), label: item.schemaName })),
  );
  const visibleBookmarks = inferences.filter(
    (item) => filters.schemaId === "all" || String(item.schemaId) === filters.schemaId,
  );
  const bookmarkOptions = uniqueOptions(
    visibleBookmarks
      .filter((item) => item.bookmarkId != null)
      .map((item) => ({ value: String(item.bookmarkId), label: item.bookmarkName ?? "Bookmark" })),
  );

  return (
    <AppToolbar>
      <div className="flex flex-1 flex-wrap items-center gap-3">
        <AppTextField
          value={filters.query}
          onChange={(event) => onChange("query", event.target.value)}
          placeholder="Search inferences..."
          prefix={<Search size={16} className="text-[var(--text-muted)]" />}
          className="min-w-[260px] flex-1"
        />
        <SlidersHorizontal size={15} className="text-[var(--text-muted)]" />
        <AppSelect
          aria-label="Schema"
          value={filters.schemaId}
          onValueChange={(value) => onChange("schemaId", value)}
          className="min-w-44"
          options={[{ value: "all", label: "All schemas" }, ...schemaOptions]}
        />
        <AppSelect
          aria-label="Bookmark"
          value={filters.bookmarkId}
          onValueChange={(value) => onChange("bookmarkId", value)}
          className="min-w-44"
          options={[
            { value: "all", label: "All bookmarks" },
            { value: "unbookmarked", label: "Without bookmark" },
            ...bookmarkOptions,
          ]}
        />
        <AppSelect
          aria-label="Inference status"
          value={filters.status}
          onValueChange={(value) => onChange("status", value as InferenceFilters["status"])}
          className="min-w-44"
          options={[
            { value: "all", label: "All statuses" },
            { value: "SUCCESS", label: "Success" },
            { value: "PARTIAL_SUCCESS", label: "Partial success" },
            { value: "FAILED", label: "Failed" },
          ]}
        />
      </div>
    </AppToolbar>
  );
}
