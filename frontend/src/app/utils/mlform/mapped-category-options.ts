/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { isRecord } from "./shared";

export type MappedCategoryOption = Record<string, unknown> & {
  label?: unknown;
  value?: unknown;
  mapping?: unknown;
};

export const mappedCategoryOptions = (field: Record<string, unknown>): MappedCategoryOption[] =>
  Array.isArray(field.options)
    ? field.options.reduce<MappedCategoryOption[]>(
        (options, option) =>
          isRecord(option) ? [...options, option as MappedCategoryOption] : options,
        [],
      )
    : [];

const mappedOptionMatchesValue = (option: MappedCategoryOption, value: unknown): boolean =>
  String(option.value) === String(value) || String(option.label) === String(value);

const isOneHotTrue = (value: unknown): boolean =>
  value === true || value === 1 || String(value).trim().toLowerCase() === "true";

const isOneHotFalse = (value: unknown): boolean =>
  value === false || value === 0 || String(value).trim().toLowerCase() === "false";

const isPresent = (value: unknown): boolean =>
  value !== undefined && value !== null && !(typeof value === "string" && value.trim() === "");

const mappedScalarEquals = (left: unknown, right: unknown): boolean => {
  if (left === right) return true;
  if (left === null || left === undefined || right === null || right === undefined) return false;
  if (isOneHotTrue(left) && isOneHotTrue(right)) return true;
  if (isOneHotFalse(left) && isOneHotFalse(right)) return true;
  return String(left) === String(right);
};

export const mappedOptionDisplayValue = (option: MappedCategoryOption): unknown =>
  option.label ?? option.value;

export const mappedOptionSubmitValue = (option: MappedCategoryOption): unknown =>
  option.value ?? option.label;

export const findMappedOptionByValue = (
  options: readonly MappedCategoryOption[],
  value: unknown,
): MappedCategoryOption | undefined =>
  options.find((option) => mappedOptionMatchesValue(option, value));

export const findMappedOptionByMapping = (
  options: readonly MappedCategoryOption[],
  inputData: Record<string, unknown>,
  resolveKey: (targetId: string) => string,
): MappedCategoryOption | undefined =>
  options.find((option) => {
    const mapping = isRecord(option.mapping) ? option.mapping : {};
    const entries = Object.entries(mapping);
    const positiveEntries = entries.filter(([, expected]) => isOneHotTrue(expected));
    const matches = ([targetId, expected]: [string, unknown]) =>
      mappedScalarEquals(inputData[resolveKey(targetId)], expected);
    return (
      entries.length > 0 &&
      (entries.every(matches) ||
        (positiveEntries.length > 0 &&
          positiveEntries.every(([targetId, expected]) => {
            const value = inputData[resolveKey(targetId)];
            return isPresent(value) && mappedScalarEquals(value, expected);
          })))
    );
  });
