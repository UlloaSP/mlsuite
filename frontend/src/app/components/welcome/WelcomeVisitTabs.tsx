/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { X } from "lucide-react";
import { Tabs } from "radix-ui";
import type { ReactNode } from "react";
import { AppIconButton } from "@/shared/ui/AppIconButton";
import { cx } from "@/shared/ui/cx";
import { TAB_LIST_CLASS, tabItemClass } from "@/shared/ui/tab-styles";
import type { NavigationItem } from "@/app/components/sidebar-navigation-support";
import type { SectionVisit } from "@/app/components/section-memory";

export type ResumableVisit = { section: NavigationItem; visit: SectionVisit };

type Props = {
  children: ReactNode;
  items: ResumableVisit[];
  selected: string;
  onSelect: (root: string) => void;
  onForget: (root: string) => void;
};

/** One tab per section with somewhere to resume, each dismissable; `children` is the panel. */
export function WelcomeVisitTabs({ children, items, selected, onSelect, onForget }: Props) {
  return (
    <Tabs.Root className="flex flex-col gap-4" value={selected} onValueChange={onSelect}>
      <Tabs.List
        aria-label="Where you left off"
        className={cx(TAB_LIST_CLASS, "flex-nowrap gap-4 overflow-x-auto")}
      >
        {items.map(({ section, visit }) => {
          const active = section.root === selected;
          const Icon = section.icon;
          return (
            <div key={section.root} className="flex shrink-0 items-center gap-0.5">
              <Tabs.Trigger
                value={section.root}
                title={`${section.label}: ${visit.title ?? section.label}`}
                className={cx(tabItemClass(active), "max-w-60")}
              >
                <Icon size={16} className="shrink-0" />
                <span className="truncate">{visit.title ?? section.label}</span>
              </Tabs.Trigger>
              <AppIconButton
                aria-label={`Forget where you were in ${section.label}`}
                className="size-7"
                onClick={() => onForget(section.root)}
              >
                <X size={14} />
              </AppIconButton>
            </div>
          );
        })}
      </Tabs.List>
      {children}
    </Tabs.Root>
  );
}
