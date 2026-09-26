/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { ChevronDown, ChevronUp } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { Link } from "react-router";
import { AppKbd } from "@/shared/ui/AppKbd";
import { AppTooltip } from "@/shared/ui/AppTooltip";
import { useMediaQuery } from "@/shared/ui/use-media-query";
import { cx } from "@/shared/ui/cx";
import { FOCUS_RING } from "@/shared/ui/focus-ring";
import { SidebarMenuLink } from "@/app/components/SidebarMenuLink";
import { sidebarMenuContent } from "@/app/components/sidebar-menu-styles";
import { isChildActive, type NavigationItem } from "@/app/components/sidebar-navigation-support";
import { NavbarLabel } from "./NavbarLabel";

const itemClass = (active: boolean) =>
  cx(
    "inline-flex h-9 shrink-0 items-center rounded-lg px-2.5 text-sm font-medium transition",
    active
      ? "bg-accent-subtle text-accent-strong"
      : "text-fg-secondary hover:bg-surface-hover hover:text-fg",
    FOCUS_RING,
  );

/** A top-level entry of the bar; sections with children open a menu of them. */
export function NavbarItem({
  active,
  compact,
  currentPath,
  item,
  menuSide,
  pathname,
  shortcut,
  showShortcut,
}: {
  active: boolean;
  compact: boolean;
  currentPath: string;
  item: NavigationItem;
  menuSide: "top" | "bottom";
  pathname: string;
  shortcut: number;
  showShortcut: boolean;
}) {
  const Icon = item.icon;
  // Labels show from lg up unless compact; otherwise a tooltip names the icon.
  const labelShown = useMediaQuery("(min-width: 1024px)") && !compact;
  const tooltipSide = menuSide === "top" ? "top" : "bottom";
  // The chevron points the way the menu opens.
  const Chevron = menuSide === "top" ? ChevronUp : ChevronDown;
  const face = (
    <>
      <Icon size={17} className="shrink-0" />
      {/* Hidden labels only collapse in width, so assistive tech still reads them. */}
      <NavbarLabel compact={compact}>{item.label}</NavbarLabel>
      {showShortcut && !compact ? (
        <AppKbd className="ml-2 hidden lg:inline-flex">{String(shortcut)}</AppKbd>
      ) : null}
    </>
  );
  const common = {
    "aria-keyshortcuts": `Alt+${String(shortcut)}`,
    "data-user-guide-item": `nav:${item.label}`,
  };
  const withTooltip = (control: React.ReactElement) => (
    <AppTooltip
      disabled={labelShown}
      label={item.label}
      shortcut={common["aria-keyshortcuts"]}
      side={tooltipSide}
    >
      {control}
    </AppTooltip>
  );

  if (!item.children?.length) {
    return withTooltip(
      <Link
        {...common}
        to={item.to}
        viewTransition
        aria-current={active ? "page" : undefined}
        className={itemClass(active)}
      >
        {face}
      </Link>,
    );
  }

  return (
    <DropdownMenu.Root>
      {withTooltip(
        <DropdownMenu.Trigger {...common} className={itemClass(active)}>
          {face}
          <NavbarLabel compact={compact} className="flex">
            <Chevron size={14} className="shrink-0 opacity-70" />
          </NavbarLabel>
        </DropdownMenu.Trigger>,
      )}
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          side={menuSide}
          sideOffset={8}
          collisionPadding={8}
          className={sidebarMenuContent(true)}
        >
          {item.children.map((child) => (
            <SidebarMenuLink
              key={child.to}
              active={isChildActive(child, currentPath, pathname)}
              icon={child.icon}
              label={child.label}
              to={child.to}
            />
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
