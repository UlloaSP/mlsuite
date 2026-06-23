/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { HTMLAttributes } from "react";
import { cx } from "./cx";

export function AppPage({ children, className }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cx("flex size-full overflow-hidden", className)}>
      <div className="flex min-h-0 min-w-0 flex-1">{children}</div>
    </div>
  );
}
