/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

export const cx = (...values: Array<string | false | null | undefined>): string =>
  values.filter(Boolean).join(" ");
