/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { X } from "lucide-react";
import { useRef, type KeyboardEvent } from "react";
import { AppIconButton } from "@/shared/ui/AppIconButton";
import { cx } from "@/shared/ui/cx";
import { TAB_LIST_CLASS, tabItemClass } from "@/shared/ui/tab-styles";
import type { NavigationItem } from "@/app/components/sidebar-navigation-support";
import type { SectionVisit } from "@/app/components/section-memory";

export type ResumableVisit = { section: NavigationItem; visit: SectionVisit };

type Props = {
  items: ResumableVisit[];
  selected: string;
  onSelect: (root: string) => void;
  onForget: (root: string) => void;
};

export const visitTabId = (root: string) => `welcome-tab-${root.replaceAll("/", "-")}`;
export const visitPanelId = (root: string) => `welcome-panel-${root.replaceAll("/", "-")}`;

/** One tab per section with somewhere to resume, each dismissable. */
export function WelcomeVisitTabs({ items, selected, onSelect, onForget }: Props) {
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);
  const move = (event: KeyboardEvent, index: number) => {
    const next =
      event.key === "ArrowRight"
        ? (index + 1) % items.length
        : event.key === "ArrowLeft"
          ? (index - 1 + items.length) % items.length
          : null;
    if (next === null) return;
    event.preventDefault();
    tabs.current[next]?.focus();
    onSelect(items[next].section.root);
  };

  return (
    <div
      role="tablist"
      aria-label="Where you left off"
      className={cx(TAB_LIST_CLASS, "flex-nowrap gap-4 overflow-x-auto")}
    >
      {items.map(({ section, visit }, index) => {
        const active = section.root === selected;
        const Icon = section.icon;
        return (
          <div key={section.root} className="flex shrink-0 items-center gap-0.5">
            <button
              ref={(element) => {
                tabs.current[index] = element;
              }}
              id={visitTabId(section.root)}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={visitPanelId(section.root)}
              tabIndex={active ? 0 : -1}
              title={`${section.label}: ${visit.title ?? section.label}`}
              onClick={() => onSelect(section.root)}
              onKeyDown={(event) => move(event, index)}
              className={cx(tabItemClass(active), "max-w-60")}
            >
              <Icon size={16} className="shrink-0" />
              <span className="truncate">{visit.title ?? section.label}</span>
            </button>
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
    </div>
  );
}
