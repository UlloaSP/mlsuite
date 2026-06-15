/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ComponentPropsWithoutRef } from "react";
import { cx } from "../cx";

export function PaginationItem({ className, ...props }: ComponentPropsWithoutRef<"li">) {
  return <li className={cx("flex", className)} {...props} />;
}
