/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ComponentProps } from "react";
import { Link } from "react-router";
import { cx } from "../cx";

export function BreadcrumbLink({ className, ...props }: ComponentProps<typeof Link>) {
  return (
    <Link
      className={cx(
        "truncate font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]",
        className,
      )}
      {...props}
    />
  );
}
