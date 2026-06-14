/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ComponentProps } from "react";
import { cx } from "../cx";

export function BreadcrumbItem({ className, ...props }: ComponentProps<"li">) {
  return <li className={cx("inline-flex min-w-0 items-center gap-2", className)} {...props} />;
}
