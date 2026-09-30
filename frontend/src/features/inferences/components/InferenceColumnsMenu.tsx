import { Columns3 } from "lucide-react";
import { Popover } from "radix-ui";
import { useState } from "react";
import { FIXED_COLUMN_IDS } from "@/features/inferences/lib/inference-table-columns";
import type { InferenceReactTable } from "@/features/inferences/lib/use-inference-table";
import { AppButton } from "@/shared/ui/AppButton";
import { AppCheckbox } from "@/shared/ui/AppCheckbox";
import { AppSearchField } from "@/shared/ui/AppSearchField";

type Column = ReturnType<InferenceReactTable["getAllLeafColumns"]>[number];

const columnLabel = (column: Column) =>
  typeof column.columnDef.header === "string" ? column.columnDef.header : column.id;

/** Chooses which columns the table shows, by group, with a search for wide schemas. */
export function InferenceColumnsMenu({ table }: { table: InferenceReactTable }) {
  const [query, setQuery] = useState("");
  const columns = table
    .getAllLeafColumns()
    .filter((column) => !FIXED_COLUMN_IDS.includes(column.id));
  const hidden = columns.filter((column) => !column.getIsVisible()).length;
  const needle = query.trim().toLowerCase();
  const groups = new Map<string, Column[]>();
  for (const column of columns) {
    const header = column.parent?.columnDef.header;
    const group = typeof header === "string" ? header : "Inference";
    groups.set(group, [...(groups.get(group) ?? []), column]);
  }

  return (
    <Popover.Root onOpenChange={(open) => (open ? undefined : setQuery(""))}>
      <Popover.Trigger asChild>
        <AppButton variant="secondary">
          <Columns3 size={16} />
          Columns
          {hidden > 0 ? <span className="text-fg-muted">({hidden} hidden)</span> : null}
        </AppButton>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          collisionPadding={8}
          className="z-(--z-popover) flex max-h-[min(32rem,var(--radix-popover-content-available-height))] w-80 flex-col rounded-menu border border-line bg-surface shadow-hover"
        >
          <div className="shrink-0 border-b border-line p-3">
            <AppSearchField
              label="Search columns"
              placeholder="Search columns…"
              value={query}
              onChange={setQuery}
            />
          </div>
          <div className="app-scroll min-h-0 flex-1 overflow-y-auto p-2">
            {[...groups].map(([group, members]) => {
              const matching = members.filter((column) =>
                columnLabel(column).toLowerCase().includes(needle),
              );
              if (matching.length === 0) return null;
              const visible = matching.filter((column) => column.getIsVisible()).length;
              return (
                <fieldset key={group} className="mb-2 last:mb-0">
                  <legend className="flex w-full items-center gap-3 px-2 py-1.5 text-2xs font-semibold uppercase tracking-eyebrow text-fg-muted">
                    <AppCheckbox
                      aria-label={`Show every ${group} column`}
                      checked={visible === matching.length}
                      onChange={(event) =>
                        table.setColumnVisibility((current) => ({
                          ...current,
                          ...Object.fromEntries(
                            matching.map((column) => [column.id, event.target.checked]),
                          ),
                        }))
                      }
                    />
                    {group}
                  </legend>
                  {matching.map((column) => (
                    <label
                      key={column.id}
                      className="flex cursor-pointer items-center gap-3 rounded-control px-2 py-1.5 text-sm text-fg hover:bg-surface-muted"
                    >
                      <AppCheckbox
                        checked={column.getIsVisible()}
                        onChange={(event) => column.toggleVisibility(event.target.checked)}
                      />
                      <span className="truncate">{columnLabel(column)}</span>
                    </label>
                  ))}
                </fieldset>
              );
            })}
          </div>
          <div className="flex shrink-0 justify-end border-t border-line p-2">
            <AppButton size="sm" variant="ghost" onClick={() => table.resetColumnVisibility()}>
              Reset columns
            </AppButton>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
