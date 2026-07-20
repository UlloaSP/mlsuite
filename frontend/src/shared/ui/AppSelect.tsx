/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { type ComponentPropsWithoutRef } from "react";
import { Select } from "./select/Select";
import { SelectContent } from "./select/SelectContent";
import { SelectGroup } from "./select/SelectGroup";
import { SelectItem } from "./select/SelectItem";
import { SelectLabel } from "./select/SelectLabel";
import { SelectTrigger } from "./select/SelectTrigger";
import { SelectValue } from "./select/SelectValue";

export type AppSelectOption = {
  disabled?: boolean;
  label: string;
  value: string;
};

type AppSelectProps = Omit<ComponentPropsWithoutRef<typeof Select>, "children"> & {
  "aria-describedby"?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  className?: string;
  id?: string;
  label?: string;
  options: AppSelectOption[];
  placeholder?: string;
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
  title,
  ...selectProps
}: AppSelectProps) {
  const menuLabel = label ?? ariaLabel ?? title ?? placeholder;
  const widestLabel = [placeholder, ...options.map((option) => option.label)]
    .filter((item): item is string => Boolean(item))
    .reduce((widest, item) => (item.length > widest.length ? item : widest), "");

  return (
    <Select {...selectProps}>
      <SelectTrigger
        aria-describedby={ariaDescribedBy}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        className={className}
        id={id}
        title={title}
      >
        <span className="grid min-w-0">
          <span className="col-start-1 row-start-1 min-w-0 truncate">
            <SelectValue placeholder={placeholder} />
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
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {menuLabel ? <SelectLabel>{menuLabel}</SelectLabel> : null}
          {options.map((option) => (
            <SelectItem disabled={option.disabled} key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
