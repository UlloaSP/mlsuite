/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { ChevronRight } from "lucide-react";
import type { ComponentPropsWithoutRef } from "react";
import { cx } from "../cx";
import { PaginationLink } from "./PaginationLink";

export function PaginationNext({
  className,
  children = "Next",
  ...props
}: ComponentPropsWithoutRef<typeof PaginationLink>) {
  return (
    <PaginationLink
      aria-label="Go to next page"
      className={cx("w-auto gap-1 px-3", className)}
      {...props}
    >
      <span className="hidden sm:inline">{children}</span>
      <ChevronRight size={16} />
    </PaginationLink>
  );
}
