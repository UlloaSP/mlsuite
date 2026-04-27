/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { ArrowLeft } from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";
import { Link } from "react-router";
import { AppCopy, AppEyebrow, AppTitle, cx } from "./ui";

export function AppPageHeader({
  eyebrow,
  title,
  description,
  backHref,
  backLabel = "Back",
  aside,
  className,
}: Omit<HTMLAttributes<HTMLDivElement>, "title"> & {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  backHref?: string;
  backLabel?: string;
  aside?: ReactNode;
}) {
  return (
    <div className={cx("flex flex-wrap items-start justify-between gap-6", className)}>
      <div className="max-w-3xl space-y-3">
        {backHref ? (
          <Link
            to={backHref}
            className="inline-flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
          >
            <ArrowLeft size={16} />
            {backLabel}
          </Link>
        ) : null}
        {eyebrow ? <AppEyebrow>{eyebrow}</AppEyebrow> : null}
        <AppTitle>{title}</AppTitle>
        {description ? <AppCopy className="max-w-2xl">{description}</AppCopy> : null}
      </div>
      {aside ? <div className="flex flex-wrap items-center gap-3">{aside}</div> : null}
    </div>
  );
}
