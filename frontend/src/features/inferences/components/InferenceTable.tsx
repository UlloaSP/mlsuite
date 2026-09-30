import { useVirtualizer } from "@tanstack/react-virtual";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { useRef } from "react";
import type { InferenceReactTable } from "@/features/inferences/lib/use-inference-table";
import type { InferenceTableRow } from "@/features/inferences/lib/inference-table-rows";
import { cx } from "@/shared/ui/cx";
import { FOCUS_RING } from "@/shared/ui/focus-ring";

const ROW_HEIGHT = 44;

// The name column stays in view while the data scrolls sideways.
const stickyClass = (columnId: string) =>
  columnId === "name" ? "sticky left-0 z-[1] border-r border-line" : "";

type Props = {
  table: InferenceReactTable;
  onOpen: (row: InferenceTableRow) => void;
  openId?: string;
};

/**
 * Every matching inference as one virtualized table: only the rows in view are rendered,
 * so a few thousand inferences scroll like a spreadsheet without pagination.
 */
export function InferenceTable({ table, onOpen, openId }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const rows = table.getRowModel().rows;
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    getItemKey: (index) => rows[index]!.id,
    overscan: 12,
  });
  const width = table.getTotalSize();

  return (
    <div
      ref={scrollRef}
      data-scroll-memory="inference-table"
      className="app-scroll min-h-0 flex-1 basis-0 overflow-auto rounded-card border border-line bg-surface"
    >
      <table className="grid text-sm" style={{ width }} aria-rowcount={rows.length + 1}>
        <thead className="sticky top-0 z-[2] grid border-b border-line bg-surface-subtle">
          {table.getHeaderGroups().map((group) => (
            <tr key={group.id} className="flex">
              {group.headers.map((header) => {
                const sorted = header.column.getIsSorted();
                const sortable = !header.isPlaceholder && header.column.getCanSort();
                const label = header.isPlaceholder ? null : <table.FlexRender header={header} />;
                return (
                  <th
                    key={header.id}
                    colSpan={header.colSpan}
                    style={{ width: header.getSize() }}
                    aria-sort={
                      sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : undefined
                    }
                    className={cx(
                      "flex h-9 shrink-0 items-center bg-surface-subtle px-3 text-left text-xs font-semibold text-fg-secondary",
                      header.subHeaders.length > 0 && "border-l border-line first:border-l-0",
                      stickyClass(header.column.id),
                    )}
                  >
                    {sortable ? (
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        className={cx(
                          "-mx-1 flex min-w-0 items-center gap-1.5 rounded-control px-1 py-0.5 hover:text-fg",
                          FOCUS_RING,
                        )}
                      >
                        <span className="truncate">{label}</span>
                        {sorted === "asc" ? (
                          <ArrowUp size={13} aria-hidden="true" />
                        ) : sorted === "desc" ? (
                          <ArrowDown size={13} aria-hidden="true" />
                        ) : (
                          <ArrowUpDown size={13} aria-hidden="true" className="text-fg-disabled" />
                        )}
                      </button>
                    ) : (
                      <span className="truncate">{label}</span>
                    )}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody className="relative grid" style={{ height: virtualizer.getTotalSize() }}>
          {virtualizer.getVirtualItems().map((item) => {
            const row = rows[item.index]!;
            const selected = row.id === openId;
            return (
              <tr
                key={row.id}
                aria-rowindex={item.index + 2}
                data-selected={selected || undefined}
                onClick={() => onOpen(row.original)}
                className={cx(
                  "group absolute flex w-full cursor-pointer border-b border-line",
                  selected ? "bg-surface-selected" : "bg-surface hover:bg-surface-hover",
                )}
                style={{ height: ROW_HEIGHT, transform: `translateY(${item.start}px)` }}
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    style={{ width: cell.column.getSize() }}
                    className={cx(
                      "flex min-w-0 shrink-0 items-center px-3 text-fg",
                      stickyClass(cell.column.id),
                      cell.column.id === "name" &&
                        (selected
                          ? "bg-surface-selected"
                          : "bg-surface group-hover:bg-surface-hover"),
                    )}
                  >
                    <table.FlexRender cell={cell} />
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
