/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { AppBadge } from "@/shared/ui/AppBadge";
import { AppPageHeader } from "@/shared/ui/PageHeader";

export type ProfileHeaderProps = {
  imageUrl: string | null;
  name: string;
  provider: string;
};

export function ProfileHeader({ imageUrl, name, provider }: ProfileHeaderProps) {
  return (
    <AppPageHeader
      breadcrumbScope="account"
      breadcrumbs={[{ label: "Profile" }]}
      eyebrow="Profile"
      title={
        <span className="flex min-w-0 items-center gap-4">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt=""
              className="size-14 shrink-0 rounded-full border border-line object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="grid size-14 shrink-0 place-items-center rounded-full bg-accent-subtle text-xl font-semibold tracking-normal text-accent-strong">
              {name.slice(0, 2).toUpperCase()}
            </span>
          )}
          <span className="min-w-0 truncate">{name}</span>
        </span>
      }
      description={provider}
      actions={<AppBadge tone="accent">Workspace identity</AppBadge>}
    />
  );
}
