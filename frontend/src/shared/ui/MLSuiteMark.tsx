/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

export function MLSuiteMark({ size = 28 }: { size?: number }) {
  return (
    <img
      aria-hidden="true"
      alt=""
      className="object-contain"
      height={size}
      src="/mlsuite.png"
      width={size}
    />
  );
}
