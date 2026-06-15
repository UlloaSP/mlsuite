/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ComponentPropsWithoutRef } from "react";
import { cx } from "../cx";

export function PaginationContent({ className, ...props }: ComponentPropsWithoutRef<"ul">) {
  return <ul className={cx("flex flex-row items-center gap-1", className)} {...props} />;
}
