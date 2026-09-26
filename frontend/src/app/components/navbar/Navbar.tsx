/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { BookOpenText, Search } from "lucide-react";
import { useAtomValue, useSetAtom } from "jotai";
import { Link } from "react-router";
import { useUserGuideLauncher } from "@/app/user-guide/use-user-guide-launcher";
import { cx } from "@/shared/ui/cx";
import { FOCUS_RING } from "@/shared/ui/focus-ring";
import { MLSuiteWordmark } from "@/shared/ui/MLSuiteWordmark";
import { shortcutBindingsAtom, shortcutLabels, shortcutToAria } from "@/shared/ui/shortcut-state";
import { sidebarStyleAtom } from "@/shared/ui/sidebar-preferences";
import { globalSearchOpenAtom } from "@/shared/ui/ui-state";
import { useSidebar } from "@/app/components/app-sidebar/SidebarContext";
import { useNavigationItems } from "@/app/components/use-navigation-items";
import { useNavigationShortcuts } from "@/app/components/use-navigation-shortcuts";
import { NavbarAccountMenu } from "./NavbarAccountMenu";
import { NavbarItem } from "./NavbarItem";
import { NavbarLabel } from "./NavbarLabel";
import { NavbarOrganizationMenu } from "./NavbarOrganizationMenu";

const TOOL_BUTTON = cx(
  "grid size-9 shrink-0 place-items-center rounded-lg text-fg-secondary transition hover:bg-surface-hover hover:text-fg",
  FOCUS_RING,
);

/** Horizontal navigation for the top and bottom positions. */
export function Navbar({ position }: { position: "top" | "bottom" }) {
  const variant = useAtomValue(sidebarStyleAtom);
  const bindings = useAtomValue(shortcutBindingsAtom);
  const setSearchOpen = useSetAtom(globalSearchOpenAtom);
  const startGuide = useUserGuideLauncher(false);
  const { navigation, isParentActive, currentPath, pathname } = useNavigationItems();
  const showShortcuts = useNavigationShortcuts({
    navigation,
    showHints: true,
    shortcutChildren: () =>
      navigation.find((item) => item.children?.length && isParentActive(item))?.children ?? [],
  });
  // Menus open away from the screen edge the bar sits on.
  const menuSide = position === "top" ? "bottom" : "top";
  const floating = variant === "floating";
  // Collapse is shared with the sidebar: icons only, and a floating bar hugs its content.
  const compact = useSidebar().state === "collapsed";
  const searchShortcut = bindings["global-search"];

  return (
    <header
      data-app-sidebar
      data-user-guide="sidebar"
      data-position={position}
      data-variant={variant}
      data-state={compact ? "collapsed" : "expanded"}
      className={cx(
        "z-20 flex h-14 shrink-0 items-center gap-2 bg-sidebar px-2 text-fg backdrop-blur-xl sm:gap-3 sm:px-3",
        floating
          ? cx(
              // Width eases between the full row and the compact pill.
              "max-w-[calc(100%-1rem)] self-center rounded-2xl border border-line shadow-card transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] [interpolate-size:allow-keywords]",
              position === "top" ? "mt-2" : "mb-2",
              compact ? "w-fit" : "w-[calc(100%-1rem)]",
            )
          : position === "top"
            ? "border-b border-line"
            : "border-t border-line",
      )}
    >
      <Link
        to="/home"
        viewTransition
        data-user-guide-item="brand"
        aria-label="MLsuite home"
        className={cx(
          "flex h-10 shrink-0 items-center rounded-xl px-1.5 text-xl leading-none",
          FOCUS_RING,
        )}
      >
        <img
          alt=""
          aria-hidden="true"
          className="h-auto w-8"
          src="/mlsuite.png"
          width="1181"
          height="635"
        />
        <NavbarLabel compact={compact} from="xl">
          <span aria-hidden="true">
            <MLSuiteWordmark />
          </span>
        </NavbarLabel>
      </Link>

      <NavbarOrganizationMenu menuSide={menuSide} compact={compact} />

      <nav
        aria-label="Main navigation"
        className={cx(
          "flex min-w-0 items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          !(floating && compact) && "flex-1",
        )}
      >
        {navigation.map((item, index) => (
          <NavbarItem
            key={item.to}
            item={item}
            active={isParentActive(item)}
            currentPath={currentPath}
            pathname={pathname}
            menuSide={menuSide}
            shortcut={index + 1}
            showShortcut={showShortcuts}
            compact={compact}
          />
        ))}
      </nav>

      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          data-user-guide-item="global-search"
          aria-keyshortcuts={shortcutToAria(searchShortcut)}
          aria-label="Global search"
          title={`Global search (${shortcutLabels(searchShortcut).join(" ")})`}
          className={TOOL_BUTTON}
          onClick={() => setSearchOpen(true)}
        >
          <Search size={17} />
        </button>
        <button
          type="button"
          data-user-guide-item="user-guide"
          aria-label="User guide"
          title="User guide"
          className={TOOL_BUTTON}
          onClick={(event) => startGuide(event.currentTarget)}
        >
          <BookOpenText size={17} />
        </button>
        <NavbarAccountMenu menuSide={menuSide} />
      </div>
    </header>
  );
}
