/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { ChevronDown } from "lucide-react";
import { Popover } from "radix-ui";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { SEARCH_DEBOUNCE_MS } from "@/shared/lib/use-debounced-value";
import { CONTROL_HEIGHT } from "./control-size";
import { cx } from "./cx";
import { FIELD_FOCUS_RING } from "./focus-ring";
import { ComboboxOptions } from "./ComboboxOptions";

export type RemoteComboboxProps<TId extends string | number = number> = {
  onSearchChange?: (query: string) => void;
  hasNext?: boolean;
  onLoadMore?: () => unknown;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => unknown;
  selectedItem?: AppComboboxItem<TId> | null;
};

export interface AppComboboxItem<TId extends string | number = number> {
  id: TId;
  label: string;
  description?: string | null;
  /** A person's picture; `null` shows their initial. Leave unset for options that are not people. */
  avatarUrl?: string | null;
}

export function AppCombobox<TId extends string | number = number>({
  value,
  "aria-label": ariaLabel,
  items,
  placeholder,
  emptyLabel = "No results",
  disabled,
  onChange,
  onSearchChange,
  selectedItem,
  ...remote
}: {
  "aria-label"?: string;
  value: TId | null;
  items: AppComboboxItem<TId>[];
  placeholder: string;
  emptyLabel?: string;
  disabled?: boolean;
  onChange: (item: AppComboboxItem<TId> | null) => void;
} & RemoteComboboxProps<TId>) {
  const listboxId = useId();
  const fieldRef = useRef<HTMLLabelElement>(null);
  const searchTimer = useRef<number | undefined>(undefined);
  const startAtChoice = useRef(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [picked, setPicked] = useState<AppComboboxItem<TId> | null>(null);
  const selected =
    items.find((item) => item.id === value) ??
    (selectedItem?.id === value ? selectedItem : null) ??
    (picked?.id === value ? picked : null);
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      normalizedQuery && !onSearchChange
        ? items.filter((item) =>
            `${item.label} ${item.description ?? ""}`.toLowerCase().includes(normalizedQuery),
          )
        : items,
    [items, normalizedQuery, onSearchChange],
  );
  const expanded = open && !disabled;
  const dialog = expanded ? fieldRef.current?.closest<HTMLElement>('[role="dialog"]') : undefined;
  // A failed remote request adds one "Retry" option after the loaded ones.
  const optionCount = filtered.length + (remote.error ? 1 : 0);
  const optionId = (index: number) => `${listboxId}-option-${index}`;
  const search = (text: string, delayMs = 0) => {
    window.clearTimeout(searchTimer.current);
    if (!onSearchChange) return;
    if (delayMs === 0) onSearchChange(text);
    else searchTimer.current = window.setTimeout(() => onSearchChange(text), delayMs);
  };
  useEffect(() => () => window.clearTimeout(searchTimer.current), []);
  useEffect(() => {
    if (!open && value == null && picked) {
      setPicked(null);
      setQuery("");
    }
  }, [open, value, picked]);
  // Pointer and focus on the field itself never dismiss its own list.
  const keepField = (event: Event) => {
    if (fieldRef.current?.contains(event.target as Node)) event.preventDefault();
  };
  const choose = (item: AppComboboxItem<TId>) => {
    setPicked(item);
    onChange(item);
    setQuery(item.label);
    setOpen(false);
  };
  const openList = () => {
    setOpen(true);
    setQuery(onSearchChange ? "" : (selected?.label ?? ""));
    search("");
    setActiveIndex(0);
    startAtChoice.current = true;
  };
  // Arrow keys start from the current choice, as a select does; a remote list has it only
  // once its first page arrives.
  useEffect(() => {
    if (!open || !startAtChoice.current) return;
    const index = items.findIndex((item) => item.id === value);
    if (index < 0) return;
    startAtChoice.current = false;
    setActiveIndex(index);
  }, [open, items, value]);

  return (
    <Popover.Root
      open={expanded}
      onOpenChange={(next) => {
        if (!next) setOpen(false);
      }}
    >
      <Popover.Anchor asChild>
        <label
          ref={fieldRef}
          className={cx(
            "inline-flex w-full items-center gap-3 rounded-control border border-line bg-surface px-3 text-sm text-fg-secondary transition",
            CONTROL_HEIGHT.md,
            FIELD_FOCUS_RING,
            disabled && "cursor-not-allowed opacity-50",
          )}
        >
          <input
            value={open ? query : (selected?.label ?? query)}
            disabled={disabled}
            placeholder={placeholder}
            role="combobox"
            aria-label={ariaLabel ?? placeholder}
            aria-controls={listboxId}
            aria-expanded={expanded}
            aria-activedescendant={
              expanded && activeIndex < optionCount ? optionId(activeIndex) : undefined
            }
            aria-autocomplete="list"
            onFocus={openList}
            onClick={() => {
              if (!open) openList();
            }}
            onChange={(event) => {
              setQuery(event.target.value);
              startAtChoice.current = false;
              search(event.target.value, SEARCH_DEBOUNCE_MS);
              onChange(null);
              setOpen(true);
              setActiveIndex(0);
            }}
            onBlur={() => setOpen(false)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setOpen(true);
                setActiveIndex((index) => Math.min(index + 1, Math.max(optionCount - 1, 0)));
              }
              if (event.key === "ArrowUp") {
                event.preventDefault();
                setActiveIndex((index) => Math.max(index - 1, 0));
              }
              if (event.key === "Enter" && open && filtered[activeIndex]) {
                event.preventDefault();
                choose(filtered[activeIndex]);
              } else if (event.key === "Enter" && open && remote.error) {
                event.preventDefault();
                void remote.onRetry?.();
              }
              if (event.key === "Escape") {
                setOpen(false);
              }
            }}
            className="w-full bg-transparent text-fg outline-none placeholder:text-fg-muted"
          />
          <ChevronDown size={16} className="shrink-0 text-fg-muted" />
        </label>
      </Popover.Anchor>
      {/* In the top layer, so no scroll container, menu or virtual row clips or covers it. Inside a
          modal dialog that layer is the dialog itself: its scroll lock only lets its own content
          scroll, by wheel and by touch. */}
      <Popover.Portal container={dialog}>
        <Popover.Content
          role="presentation"
          align="start"
          sideOffset={8}
          collisionPadding={8}
          onOpenAutoFocus={(event) => event.preventDefault()}
          onCloseAutoFocus={(event) => event.preventDefault()}
          onPointerDownOutside={keepField}
          onFocusOutside={keepField}
          onEscapeKeyDown={() => setOpen(false)}
          onMouseDown={(event) => event.preventDefault()}
          className="z-(--z-popover) w-(--radix-popover-trigger-width) rounded-menu border border-line bg-surface shadow-card"
        >
          <ComboboxOptions
            id={listboxId}
            label={placeholder}
            items={filtered}
            activeIndex={activeIndex}
            selectedId={selected?.id}
            emptyLabel={emptyLabel}
            onChoose={choose}
            onActivate={(index) => {
              startAtChoice.current = false;
              setActiveIndex(index);
            }}
            {...remote}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
