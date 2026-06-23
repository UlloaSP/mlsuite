/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { type ComponentProps } from "react";
import { cx } from "../cx";

export function SidebarGroup({ children, className, ...props }: ComponentProps<"section">) {
  return (
    <section className={cx("grid gap-1.5 py-2", className)} {...props}>
      {children}
    </section>
  );
}
