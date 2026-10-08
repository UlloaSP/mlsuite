import {
  columnSizingFeature,
  columnVisibilityFeature,
  createColumnHelper,
  createSortedRowModel,
  rowSortingFeature,
  tableFeatures,
  type ColumnDef,
  type Row,
} from "@tanstack/react-table";
import type { ReactNode } from "react";
import { FeedbackStatusBadge } from "@/capabilities/prediction-runtime/feedback/FeedbackStatusBadge";
import {
  formatInferenceCell,
  type InferenceColumnGroup,
  type InferenceDataColumn,
  type InferenceTableRow,
} from "@/features/inferences/lib/inference-table-rows";
import { AppBadge } from "@/shared/ui/AppBadge";
import { formatTimestamp } from "@/shared/lib/date-time";
import { snapshotLabel } from "@/shared/lib/snapshot-label";
import type { PredictionRunCatalogItemDto } from "@/shared/api/openapi.gen";

/** Renderers the page supplies each render, so column definitions never hold stale handlers. */
export type InferenceTableMeta = {
  /** The row's name cell, which opens its preview. */
  renderName: (row: InferenceTableRow) => ReactNode;
  renderActions: (row: InferenceTableRow) => ReactNode;
};

export const inferenceTableFeatures = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  columnVisibilityFeature,
  columnSizingFeature,
  tableMeta: {} as InferenceTableMeta,
});

type Features = typeof inferenceTableFeatures;
export type InferenceColumnDef = ColumnDef<Features, InferenceTableRow, any>;

const helper = createColumnHelper<Features, InferenceTableRow>();

export const GROUP_LABELS: Record<InferenceColumnGroup, string> = {
  inputs: "Inputs",
  outputs: "Outputs",
  feedback: "Feedback",
};

export const ORIGIN_LABELS: Record<PredictionRunCatalogItemDto["origin"], string> = {
  WORKSPACE: "Workspace",
  PUBLIC: "Public page",
};

/** Who made the run: a member by name, or a visitor of the public page, who has none. */
export const inferenceAuthor = (item: PredictionRunCatalogItemDto): string | undefined =>
  item.createdByName || item.createdByEmail || (item.origin === "PUBLIC" ? "Visitor" : undefined);

/** Columns the table always shows and the columns menu cannot hide. */
export const FIXED_COLUMN_IDS = ["name", "actions"];

const compareValues = (left: unknown, right: unknown): number => {
  if (typeof left === "number" && typeof right === "number") return left - right;
  return formatInferenceCell(left).localeCompare(formatInferenceCell(right), undefined, {
    numeric: true,
    sensitivity: "base",
  });
};

const sortByValue = (
  left: Row<Features, InferenceTableRow>,
  right: Row<Features, InferenceTableRow>,
  columnId: string,
) => compareValues(left.getValue(columnId), right.getValue(columnId));

const EMPTY = <span className="text-fg-disabled">—</span>;

const textCell = (value: unknown) => {
  const text = formatInferenceCell(value);
  return text ? (
    <span className="block truncate" title={text}>
      {text}
    </span>
  ) : (
    EMPTY
  );
};

const summaryColumns = (): InferenceColumnDef[] => [
  helper.accessor((row) => row.item.name, {
    id: "name",
    header: "Name",
    size: 240,
    sortFn: sortByValue,
    cell: ({ row, table }) => table.options.meta?.renderName(row.original),
  }),
  helper.accessor((row) => row.item.createdAt, {
    id: "createdAt",
    header: "Created",
    size: 170,
    sortFn: sortByValue,
    cell: ({ getValue }) => <span className="tabular-nums">{formatTimestamp(getValue())}</span>,
  }),
  helper.accessor((row) => row.item.status, {
    id: "status",
    header: "Status",
    size: 140,
    sortFn: sortByValue,
    cell: ({ getValue }) => (
      <AppBadge
        tone={
          getValue() === "SUCCESS"
            ? "success"
            : getValue() === "PARTIAL_SUCCESS"
              ? "warning"
              : "danger"
        }
      >
        {getValue()}
      </AppBadge>
    ),
  }),
  helper.accessor((row) => row.feedbackStatus, {
    id: "feedbackStatus",
    header: "Feedback",
    size: 140,
    sortFn: sortByValue,
    cell: ({ row }) => <FeedbackStatusBadge status={row.original.feedbackStatus} />,
  }),
  helper.accessor((row) => row.item.schemaName, {
    id: "schema",
    header: "Schema",
    size: 160,
    sortFn: sortByValue,
    cell: ({ getValue }) => textCell(getValue()),
  }),
  helper.accessor((row) => row.item.schemaVersion, {
    id: "version",
    header: "Version",
    size: 130,
    sortFn: sortByValue,
    cell: ({ row }) =>
      textCell(snapshotLabel(row.original.item.schemaVersionName, row.original.item.schemaVersion)),
  }),
  helper.accessor((row) => row.item.bookmarkName ?? undefined, {
    id: "bookmark",
    header: "Bookmark",
    size: 150,
    sortFn: sortByValue,
    sortUndefined: "last",
    cell: ({ getValue }) => textCell(getValue()),
  }),
  helper.accessor((row) => inferenceAuthor(row.item), {
    id: "author",
    header: "Author",
    size: 170,
    sortFn: sortByValue,
    sortUndefined: "last",
    cell: ({ getValue }) => textCell(getValue()),
  }),
  helper.accessor((row) => ORIGIN_LABELS[row.item.origin], {
    id: "origin",
    header: "Origin",
    size: 130,
    sortFn: sortByValue,
    cell: ({ getValue }) => textCell(getValue()),
  }),
];

const dataColumn = (column: InferenceDataColumn): InferenceColumnDef =>
  helper.accessor((row) => row.values.get(column.id), {
    id: column.id,
    header: column.label,
    size: column.group === "inputs" ? 140 : column.group === "outputs" ? 180 : 220,
    sortFn: sortByValue,
    sortUndefined: "last",
    cell: ({ getValue }) => textCell(getValue()),
  });

/** "Risk · Inputs" when several schemas share the table, "Inputs" when only one does. */
export const dataGroupLabel = (column: InferenceDataColumn, multipleSchemas: boolean) =>
  multipleSchemas
    ? `${column.schemaName} · ${GROUP_LABELS[column.group]}`
    : GROUP_LABELS[column.group];

/**
 * The summary every inference has, then each schema's inputs, outputs, and feedback,
 * each under its group header, then the row actions.
 */
export const buildInferenceColumns = (
  dataColumns: readonly InferenceDataColumn[],
): InferenceColumnDef[] => {
  const multipleSchemas = new Set(dataColumns.map((column) => column.schemaId)).size > 1;
  // Data columns arrive ordered by schema then group, so consecutive runs form the groups.
  const groups: Array<{ id: string; header: string; columns: InferenceDataColumn[] }> = [];
  for (const column of dataColumns) {
    const id = `${column.schemaId}:${column.group}`;
    const last = groups.at(-1);
    if (last?.id === id) last.columns.push(column);
    else groups.push({ id, header: dataGroupLabel(column, multipleSchemas), columns: [column] });
  }
  const groupColumns = groups.map(({ id, header, columns }) =>
    helper.group({ id, header, columns: columns.map(dataColumn) }),
  );
  const actions = helper.display({
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    size: 56,
    cell: ({ row, table }) => table.options.meta?.renderActions(row.original),
  });
  if (groupColumns.length === 0) return [...summaryColumns(), actions];
  return [
    helper.group({ id: "inference", header: "Inference", columns: summaryColumns() }),
    ...groupColumns,
    actions,
  ];
};
