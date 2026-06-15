/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ComponentPropsWithoutRef } from "react";
import { cx } from "../cx";

export function Pagination({ className, ...props }: ComponentPropsWithoutRef<"nav">) {
  return (
    <nav
      aria-label="pagination"
      className={cx("mx-auto flex w-full justify-center", className)}
      {...props}
    />
  );
}
