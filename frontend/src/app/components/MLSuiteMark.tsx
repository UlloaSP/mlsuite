/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

export function MLSuiteMark({ size = 28 }: { size?: number }) {
  return (
    <img
      aria-hidden="true"
      alt=""
      height={size}
      src="/mlsuite-logo.svg"
      width={size}
    />
  );
}
