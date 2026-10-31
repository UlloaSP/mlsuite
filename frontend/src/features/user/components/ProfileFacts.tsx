/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Building2, CalendarDays, Link2, MapPin, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { formatDate } from "@/shared/lib/date-time";
import { cx } from "@/shared/ui/cx";
import { FOCUS_RING } from "@/shared/ui/focus-ring";
import { OrganizationMark } from "@/shared/ui/OrganizationMark";
import type { PublicProfileDto } from "@/shared/api/openapi.gen";

function Fact({ children, icon: Icon }: { children: ReactNode; icon: LucideIcon }) {
  return (
    <li className="flex min-w-0 items-center gap-2">
      <Icon size={16} className="shrink-0 text-fg-muted" aria-hidden="true" />
      {children}
    </li>
  );
}

function ExternalLink({ href }: { href: string }) {
  return (
    <Fact icon={Link2}>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className={cx("min-w-0 truncate rounded-sm text-accent hover:underline", FOCUS_RING)}
      >
        {href.replace(/^https?:\/\//i, "").replace(/\/$/, "")}
      </a>
    </Fact>
  );
}

/** What a person says about themselves, beside what they publish. Addresses open as typed. */
export function ProfileFacts({ profile }: { profile: PublicProfileDto }) {
  return (
    <div className="flex min-w-0 flex-col gap-5">
      {profile.bio ? (
        <p className="whitespace-pre-line break-words text-sm leading-6 text-fg">{profile.bio}</p>
      ) : null}
      <ul className="flex flex-col gap-2 text-sm text-fg-secondary">
        {profile.company ? (
          <Fact icon={Building2}>
            <span className="min-w-0 truncate">{profile.company}</span>
          </Fact>
        ) : null}
        {profile.location ? (
          <Fact icon={MapPin}>
            <span className="min-w-0 truncate">{profile.location}</span>
          </Fact>
        ) : null}
        {profile.website ? <ExternalLink href={profile.website} /> : null}
        {profile.links.map((link) => (
          <ExternalLink key={link} href={link} />
        ))}
        <Fact icon={CalendarDays}>Joined {formatDate(profile.joinedAt)}</Fact>
      </ul>
      {profile.organizations.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-fg">Organizations</h2>
          <ul className="flex flex-col gap-2 text-sm text-fg-secondary">
            {profile.organizations.map((organization, index) => (
              <li key={index} className="flex min-w-0 items-center gap-2">
                <OrganizationMark
                  className="size-6 rounded-sm"
                  fallbackClassName="bg-surface-muted text-fg-muted"
                  iconSize={14}
                  logoUrl={organization.logoUrl}
                />
                <span className="min-w-0 truncate">{organization.name}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
