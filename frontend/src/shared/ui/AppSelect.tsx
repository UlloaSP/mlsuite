/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { ChevronDown } from "lucide-react";
import { Select } from "radix-ui";
import { type ComponentPropsWithoutRef } from "react";
import { CONTROL_HEIGHT } from "./control-size";
import { cx } from "./cx";
import { FOCUS_RING } from "./focus-ring";

// Radix reserves "" for clearing the selection, so an empty option value travels under a sentinel.
const EMPTY_VALUE = "__mlsuite_empty_select_value__";
const toRadix = (value: string | undefined) => (value === "" ? EMPTY_VALUE : value);
const fromRadix = (value: string) => (value === EMPTY_VALUE ? "" : value);

export type AppSelectOption = {
  disabled?: boolean;
  label: string;
  value: string;
};

type AppSelectProps = Omit<
  ComponentPropsWithoutRef<typeof Select.Root>,
  "children" | "defaultValue" | "onValueChange" | "value"
> & {
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  value?: string;
  "aria-describedby"?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  className?: string;
  id?: string;
  label?: string;
  options: AppSelectOption[];
  placeholder?: string;
  portalContainer?: HTMLElement | null;
  /** `sm` for dense panel toolbars; rows of md controls keep the default. */
  size?: "md" | "sm";
  title?: string;
};

export function AppSelect({
  "aria-describedby": ariaDescribedBy,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  className,
  id,
  label,
  options,
  placeholder,
  portalContainer,
  size = "md",
  title,
  defaultValue,
  onValueChange,
  value,
  ...selectProps
}: AppSelectProps) {
  const menuLabel = label ?? ariaLabel ?? title ?? placeholder;
  const widestLabel = [placeholder, ...options.map((option) => option.label)]
    .filter((item): item is string => Boolean(item))
    .reduce((widest, item) => (item.length > widest.length ? item : widest), "");

  return (
    <Select.Root
      defaultValue={toRadix(defaultValue)}
      onValueChange={(nextValue) => onValueChange?.(fromRadix(nextValue))}
      value={toRadix(value)}
      {...selectProps}
    >
      <Select.Trigger
        aria-describedby={ariaDescribedBy}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        className={cx(
          "inline-flex min-w-0 items-center justify-between gap-2 rounded-control border border-line bg-surface px-3 py-0 text-fg shadow-none transition hover:border-fg disabled:cursor-not-allowed disabled:opacity-45",
          CONTROL_HEIGHT[size],
          size === "sm" ? "text-xs" : "text-sm",
          FOCUS_RING,
          className,
        )}
        id={id}
        title={title}
      >
        <span className="grid min-w-0">
          <span className="col-start-1 row-start-1 min-w-0 truncate">
            <Select.Value placeholder={placeholder} />
          </span>
          {widestLabel ? (
            <span
              aria-hidden="true"
              className="invisible col-start-1 row-start-1 whitespace-nowrap"
            >
              {widestLabel}
            </span>
          ) : null}
        </span>
        <Select.Icon asChild>
          <ChevronDown size={16} className="shrink-0 text-fg-muted" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal container={portalContainer}>
        <Select.Content
          className="z-(--z-popover) max-h-72 w-[var(--radix-select-trigger-width)] overflow-hidden rounded-menu border border-line bg-surface p-2 text-fg shadow-hover"
          position="item-aligned"
        >
          <Select.Viewport className="max-h-56 overflow-y-auto">
            <Select.Group>
              {menuLabel ? (
                <Select.Label className="px-3 pb-1.5 pt-1 text-sm text-fg-secondary">
                  {menuLabel}
                </Select.Label>
              ) : null}
              {options.map((option) => (
                <Select.Item
                  className="relative flex w-full cursor-default select-none items-center rounded-control px-3 py-2.5 text-left text-sm outline-none transition data-[disabled]:pointer-events-none data-[highlighted]:bg-surface-muted data-[disabled]:opacity-45"
                  disabled={option.disabled}
                  key={option.value}
                  value={option.value || EMPTY_VALUE}
                >
                  <Select.ItemText>{option.label}</Select.ItemText>
                </Select.Item>
              ))}
            </Select.Group>
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
