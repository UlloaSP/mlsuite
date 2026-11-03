/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ReactNode } from "react";
import type { AppBreadcrumbItem } from "@/shared/ui/AppBreadcrumbs";
import { PersonAvatar } from "@/shared/ui/PersonAvatar";
import { AppPageHeader } from "@/shared/ui/PageHeader";

/** Who a profile is about: their picture and name, and the handle their page answers at. */
export function ProfileHeader({
  actions,
  avatarUrl,
  breadcrumbs,
  className,
  handle,
  name,
}: {
  actions?: ReactNode;
  avatarUrl: string | null;
  breadcrumbs?: AppBreadcrumbItem[];
  className?: string;
  handle: string;
  name: string;
}) {
  return (
    <AppPageHeader
      breadcrumbs={breadcrumbs}
      className={className}
      title={
        <span className="flex min-w-0 items-center gap-4">
          <PersonAvatar
            avatarUrl={avatarUrl}
            className="size-14 rounded-full border border-line text-xl tracking-normal"
            name={name}
          />
          <span className="min-w-0 break-words">{name}</span>
        </span>
      }
      description={`@${handle}`}
      actions={actions}
    />
  );
}
