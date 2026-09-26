/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ComponentProps } from "react";
import { Link } from "react-router";
import { cx } from "@/shared/ui/cx";

export function BreadcrumbLink({ className, ...props }: ComponentProps<typeof Link>) {
  return (
    <Link
      className={cx(
        "min-w-0 break-words font-medium text-fg-secondary transition hover:text-fg",
        className,
      )}
      {...props}
    />
  );
}
