/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useAtomValue } from "jotai";
import { Link } from "react-router";
import { cx } from "@/shared/ui/cx";
import { FOCUS_RING } from "@/shared/ui/focus-ring";
import { MLSuiteWordmark } from "@/shared/ui/MLSuiteWordmark";
import type { SidebarPosition } from "@/shared/ui/sidebar-preferences";
import { shortcutBindingsAtom, shortcutToAria } from "@/shared/ui/shortcut-state";
import { SidebarTrigger } from "./app-sidebar/SidebarTrigger";
import { useSidebar } from "./app-sidebar/SidebarContext";

const logo = (
  <img
    alt=""
    aria-hidden="true"
    className="h-auto w-10 shrink-0"
    height="635"
    src="/mlsuite.png"
    width="1181"
  />
);

/** Logo row. The sidebar toggle sits on the edge that faces the content. */
export function SidebarBrand({ side }: { side: SidebarPosition }) {
  const { isMobile, state } = useSidebar();
  const bindings = useAtomValue(shortcutBindingsAtom);
  const toggleProps = {
    "aria-keyshortcuts": shortcutToAria(bindings["toggle-sidebar"]),
    "data-user-guide-item": "toggle-sidebar",
    side,
  };

  if (state === "collapsed" && !isMobile) {
    return (
      <SidebarTrigger
        {...toggleProps}
        className="mx-auto mb-2 size-11 rounded-xl text-fg-secondary hover:bg-surface-hover hover:text-fg"
      >
        {logo}
      </SidebarTrigger>
    );
  }

  return (
    <div
      className={cx("mb-2 flex h-12 items-center gap-1", side === "right" && "flex-row-reverse")}
    >
      <Link
        to="/home"
        viewTransition
        data-user-guide-item="brand"
        aria-label="MLsuite home"
        className={cx(
          "flex h-full min-w-0 flex-1 items-center gap-3 rounded-xl px-2.5 text-2xl leading-none text-fg",
          side === "right" && "justify-end",
          FOCUS_RING,
        )}
      >
        {logo}
        <span aria-hidden="true" className="truncate">
          <MLSuiteWordmark />
        </span>
      </Link>
      <SidebarTrigger
        {...toggleProps}
        className="size-9 shrink-0 rounded-lg text-fg-secondary hover:bg-surface-hover hover:text-fg"
      />
    </div>
  );
}
