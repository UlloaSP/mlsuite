/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { ChevronLeft } from "lucide-react";
import type { ComponentPropsWithoutRef } from "react";
import { cx } from "../cx";
import { PaginationLink } from "./PaginationLink";

export function PaginationPrevious({
  className,
  children = "Previous",
  ...props
}: ComponentPropsWithoutRef<typeof PaginationLink>) {
  return (
    <PaginationLink
      aria-label="Go to previous page"
      className={cx("w-auto gap-1 px-3", className)}
      {...props}
    >
      <ChevronLeft size={16} />
      <span className="hidden sm:inline">{children}</span>
    </PaginationLink>
  );
}
