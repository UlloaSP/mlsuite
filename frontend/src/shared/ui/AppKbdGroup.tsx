/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ComponentProps } from "react";
import { cx } from "./cx";

export function AppKbdGroup({ className, ...props }: ComponentProps<"span">) {
  return <span {...props} className={cx("inline-flex items-center gap-1", className)} />;
}
