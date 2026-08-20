/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

const EMPTY_SELECT_VALUE = "__mlsuite_empty_select_value__";

export const normalizeSelectValue = (value: string | undefined): string | undefined => {
  if (value === undefined) return undefined;
  return value === "" ? EMPTY_SELECT_VALUE : value;
};

export const denormalizeSelectValue = (value: string): string =>
  value === EMPTY_SELECT_VALUE ? "" : value;
