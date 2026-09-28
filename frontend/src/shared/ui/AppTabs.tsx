/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useRef, type HTMLAttributes, type KeyboardEvent, type ReactNode } from "react";
import { cx } from "./cx";
import { TAB_LIST_CLASS, tabCountClass, tabItemClass } from "./tab-styles";

export function AppTabs<TValue extends string>({
  items,
  value,
  onChange,
  className,
  id,
  ...props
}: Omit<HTMLAttributes<HTMLDivElement>, "onChange"> & {
  items: Array<{ label: ReactNode; value: TValue; count?: ReactNode }>;
  value: TValue;
  onChange: (value: TValue) => void;
}) {
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);
  const moveFocus = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = items.length - 1;
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? last
          : event.key === "ArrowRight"
            ? (index + 1) % items.length
            : event.key === "ArrowLeft"
              ? (index - 1 + items.length) % items.length
              : null;
    if (next === null) return;
    event.preventDefault();
    tabs.current[next]?.focus();
    onChange(items[next].value);
  };
  return (
    <div {...props} id={id} className={cx(TAB_LIST_CLASS, className)} role="tablist">
      {items.map((item, index) => {
        const active = item.value === value;

        return (
          <button
            key={item.value}
            ref={(element) => {
              tabs.current[index] = element;
            }}
            id={id ? `${id}-tab-${item.value}` : undefined}
            type="button"
            role="tab"
            aria-selected={active}
            aria-controls={id ? `${id}-panel-${item.value}` : undefined}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(item.value)}
            onKeyDown={(event) => moveFocus(event, index)}
            className={tabItemClass(active)}
          >
            {item.label}
            {item.count !== undefined ? (
              <span className={tabCountClass(active)}>{item.count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
