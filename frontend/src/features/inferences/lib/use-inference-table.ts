import {
  useTable,
  type ColumnVisibilityState,
  type SortingState,
  type Updater,
} from "@tanstack/react-table";
import { useMemo, useState } from "react";
import {
  buildInferenceColumns,
  inferenceTableFeatures,
  type InferenceTableMeta,
} from "@/features/inferences/lib/inference-table-columns";
import type {
  InferenceDataColumn,
  InferenceTableRow,
} from "@/features/inferences/lib/inference-table-rows";

const resolve = <T>(updater: Updater<T>, current: T): T =>
  typeof updater === "function" ? (updater as (old: T) => T)(current) : updater;

const readVisibility = (key: string): ColumnVisibilityState => {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(key) ?? "{}");
    return typeof stored === "object" && stored !== null && !Array.isArray(stored)
      ? Object.fromEntries(
          Object.entries(stored).filter(
            (entry): entry is [string, boolean] => typeof entry[1] === "boolean",
          ),
        )
      : {};
  } catch {
    return {};
  }
};

/**
 * Hidden columns, remembered on this device per organization and schema, so each schema
 * reopens with the columns the member chose for it.
 */
function useStoredColumnVisibility(storageKey: string, defaults: ColumnVisibilityState) {
  const [stored, setStored] = useState(() => ({
    key: storageKey,
    value: readVisibility(storageKey),
  }));
  const saved = stored.key === storageKey ? stored.value : readVisibility(storageKey);
  const visibility = { ...defaults, ...saved };
  const setVisibility = (updater: Updater<ColumnVisibilityState>) => {
    const next = resolve(updater, visibility);
    localStorage.setItem(storageKey, JSON.stringify(next));
    setStored({ key: storageKey, value: next });
  };
  return [visibility, setVisibility] as const;
}

const SORT_DIRECTIONS = new Set(["asc", "desc"]);

/** "createdAt.desc" ⇄ one sorted column; anything unreadable falls back to newest first. */
export const parseInferenceSort = (value: string): SortingState => {
  // Column ids may contain dots themselves, so the direction is what follows the last one.
  const split = value.lastIndexOf(".");
  const id = value.slice(0, Math.max(split, 0));
  const direction = value.slice(split + 1);
  return id && SORT_DIRECTIONS.has(direction)
    ? [{ id, desc: direction === "desc" }]
    : [{ id: "createdAt", desc: true }];
};

const formatSort = ([first]: SortingState) =>
  first ? `${first.id}.${first.desc ? "desc" : "asc"}` : "";

type Options = {
  rows: InferenceTableRow[];
  dataColumns: readonly InferenceDataColumn[];
  /** Where column choices are remembered, e.g. the organization and schema. */
  visibilityKey: string;
  /** Scoped to one schema, the Schema column only repeats the filter, so it starts hidden. */
  scoped: boolean;
  sort: string;
  onSortChange: (sort: string) => void;
} & InferenceTableMeta;

export function useInferenceTable({
  rows,
  dataColumns,
  visibilityKey,
  scoped,
  sort,
  onSortChange,
  renderName,
  renderActions,
}: Options) {
  const columns = useMemo(() => buildInferenceColumns(dataColumns), [dataColumns]);
  const [columnVisibility, setColumnVisibility] = useStoredColumnVisibility(
    `mlsuite:inference-columns:${visibilityKey}`,
    scoped ? { schema: false } : {},
  );
  const sorting = parseInferenceSort(sort);
  return useTable({
    features: inferenceTableFeatures,
    columns,
    data: rows,
    getRowId: (row) => String(row.item.id),
    enableSortingRemoval: false,
    sortDescFirst: false,
    state: { sorting, columnVisibility },
    onSortingChange: (updater) => onSortChange(formatSort(resolve(updater, sorting))),
    onColumnVisibilityChange: setColumnVisibility,
    meta: { renderName, renderActions },
  });
}

export type InferenceReactTable = ReturnType<typeof useInferenceTable>;
