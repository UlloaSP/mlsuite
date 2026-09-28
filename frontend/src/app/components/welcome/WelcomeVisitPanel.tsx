/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { ArrowRight } from "lucide-react";
import { Link } from "react-router";
import { RESTORE_SCROLL_STATE } from "@/app/layouts/use-scroll-memory";
import { AppPanel } from "@/shared/ui/AppPanel";
import { appButtonClass } from "@/shared/ui/button-styles";
import { LiveRelativeTime } from "@/shared/ui/LiveRelativeTime";
import { VisitFacts } from "./VisitFacts";
import { Tabs } from "radix-ui";
import type { ResumableVisit } from "./WelcomeVisitTabs";

/** Where the member was in one section: the page, what it held, and the way back in. */
export function WelcomeVisitPanel({ section, visit }: ResumableVisit) {
  const Icon = section.icon;
  const title = visit.title ?? section.label;
  const path = [
    section.label,
    ...(visit.trail ?? []).filter((level) => level !== section.label && level !== title),
  ];

  return (
    <Tabs.Content value={section.root} asChild>
      <AppPanel className="flex flex-col gap-6">
        <div className="flex items-start gap-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-control bg-accent-subtle text-accent-strong">
            <Icon size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-fg-muted">{path.join(" › ")}</p>
            <h2 className="mt-0.5 truncate text-2xl font-semibold tracking-[-0.02em] text-fg">
              {title}
            </h2>
            <p className="mt-1 text-sm text-fg-secondary">
              {visit.description ? `${visit.description} · ` : ""}
              Visited <LiveRelativeTime value={visit.at} /> ago
            </p>
          </div>
        </div>
        <VisitFacts href={visit.href} />
        <div className="flex justify-end border-t border-line pt-5">
          <Link to={visit.href} state={RESTORE_SCROLL_STATE} className={appButtonClass()}>
            Continue
            <ArrowRight size={16} />
          </Link>
        </div>
      </AppPanel>
    </Tabs.Content>
  );
}
