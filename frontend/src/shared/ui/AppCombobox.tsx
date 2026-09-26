import { Check, ChevronDown } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { cx } from "./cx";

export interface AppComboboxItem {
  id: number;
  label: string;
  description?: string | null;
  avatarUrl?: string | null;
}

export function AppCombobox({
  value,
  items,
  placeholder,
  emptyLabel = "No results",
  disabled,
  onChange,
}: {
  value: number | null;
  items: AppComboboxItem[];
  placeholder: string;
  emptyLabel?: string;
  disabled?: boolean;
  onChange: (item: AppComboboxItem | null) => void;
}) {
  const listboxId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const selected = items.find((item) => item.id === value) ?? null;
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      normalizedQuery
        ? items.filter((item) =>
            `${item.label} ${item.description ?? ""}`.toLowerCase().includes(normalizedQuery),
          )
        : items,
    [items, normalizedQuery],
  );
  const choose = (item: AppComboboxItem) => {
    onChange(item);
    setQuery(item.label);
    setOpen(false);
  };

  return (
    <div className="relative">
      <label
        className={cx(
          "inline-flex w-full items-center gap-3 rounded border border-line bg-surface px-4 py-3 text-sm text-fg-secondary",
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        <input
          value={open ? query : (selected?.label ?? query)}
          disabled={disabled}
          placeholder={placeholder}
          aria-label={placeholder}
          aria-controls={listboxId}
          aria-autocomplete="list"
          onFocus={() => {
            setOpen(true);
            setQuery(selected?.label ?? "");
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            onChange(null);
            setOpen(true);
            setActiveIndex(0);
          }}
          onBlur={() => setOpen(false)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setOpen(true);
              setActiveIndex((index) => Math.min(index + 1, filtered.length - 1));
            }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              setActiveIndex((index) => Math.max(index - 1, 0));
            }
            if (event.key === "Enter" && open && filtered[activeIndex]) {
              event.preventDefault();
              choose(filtered[activeIndex]);
            }
            if (event.key === "Escape") {
              setOpen(false);
            }
          }}
          className="w-full bg-transparent text-fg outline-none placeholder:text-fg-muted"
        />
        <ChevronDown size={16} className="shrink-0 text-fg-muted" />
      </label>
      {open && !disabled ? (
        <div
          id={listboxId}
          className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 max-h-64 overflow-y-auto rounded border border-line bg-surface p-2 shadow-card"
        >
          {filtered.length ? (
            filtered.map((item, index) => (
              <button
                key={item.id}
                type="button"
                aria-current={selected?.id === item.id}
                onMouseDown={(event) => {
                  event.preventDefault();
                  choose(item);
                }}
                className={cx(
                  "flex w-full items-center gap-3 rounded px-3 py-2.5 text-left transition",
                  index === activeIndex ? "rounded bg-surface-muted" : "hover:bg-surface-muted",
                )}
              >
                {item.avatarUrl ? (
                  <img
                    src={item.avatarUrl}
                    alt=""
                    className="size-9 shrink-0 rounded object-cover"
                  />
                ) : (
                  <span className="flex size-9 shrink-0 items-center justify-center rounded bg-accent-subtle text-xs font-semibold text-accent-strong">
                    {item.label.slice(0, 1).toUpperCase()}
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-fg">{item.label}</span>
                  {item.description ? (
                    <span className="block truncate text-xs text-fg-secondary">
                      {item.description}
                    </span>
                  ) : null}
                </span>
                {selected?.id === item.id ? <Check size={16} /> : null}
              </button>
            ))
          ) : (
            <div className="px-3 py-4 text-sm text-fg-secondary">{emptyLabel}</div>
          )}
        </div>
      ) : null}
    </div>
  );
}
