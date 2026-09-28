/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Tabs } from "radix-ui";
import type { ReactNode } from "react";
import { cx } from "./cx";
import { TAB_LIST_CLASS, tabCountClass, tabItemClass } from "./tab-styles";

/**
 * A tab list whose panels are the `AppTabPanel` children. The root adds no box,
 * so the list and panel lay out as children of the caller's container.
 */
export function AppTabs<TValue extends string>({
  "aria-label": ariaLabel,
  children,
  className,
  items,
  onChange,
  value,
}: {
  "aria-label"?: string;
  children?: ReactNode;
  className?: string;
  items: Array<{ label: ReactNode; value: TValue; count?: ReactNode }>;
  onChange: (value: TValue) => void;
  value: TValue;
}) {
  return (
    <Tabs.Root
      className="contents"
      value={value}
      onValueChange={(next) => onChange(next as TValue)}
    >
      <Tabs.List aria-label={ariaLabel} className={cx(TAB_LIST_CLASS, className)}>
        {items.map((item) => {
          const active = item.value === value;
          return (
            <Tabs.Trigger key={item.value} value={item.value} className={tabItemClass(active)}>
              {item.label}
              {item.count !== undefined ? (
                <span className={tabCountClass(active)}>{item.count}</span>
              ) : null}
            </Tabs.Trigger>
          );
        })}
      </Tabs.List>
      {children}
    </Tabs.Root>
  );
}

/** The panel of the tab with the same value; rendered only while that tab is active. */
export const AppTabPanel = Tabs.Content;
