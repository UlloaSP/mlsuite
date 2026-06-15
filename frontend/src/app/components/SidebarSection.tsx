/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { cx } from "./cx";

export function SidebarSection({
  children,
  className = "",
  collapsed = false,
}: {
  children: React.ReactNode;
  className?: string;
  collapsed?: boolean;
}) {
  return (
    <div
      className={cx(
        `flex flex-col ${collapsed ? "items-center" : ""} gap-2.5 border-[var(--border-soft)]`,
        className,
      )}
    >
      {children}
    </div>
  );
}
