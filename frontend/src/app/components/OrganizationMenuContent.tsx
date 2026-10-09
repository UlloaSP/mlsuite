/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Check } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { useCallback, useRef, useState } from "react";
import { defaultRangeExtractor, useVirtualizer } from "@tanstack/react-virtual";
import { useLoadMoreNearEnd } from "@/shared/ui/catalog/useLoadMoreNearEnd";
import { useLocation, useNavigate } from "react-router";
import { useWorkspaceOrganizationCatalog } from "@/capabilities/workspace-context/workspace-context";
import { useSelectOrganization } from "@/features/workspace/api/workspace.mutations";
import type { WorkspaceCurrentContextDto } from "@/shared/api/openapi.gen";
import { useDebouncedValue } from "@/shared/lib/use-debounced-value";
import { AppSearchField } from "@/shared/ui/AppSearchField";
import { cx } from "@/shared/ui/cx";
import { OrganizationMark } from "@/shared/ui/OrganizationMark";
import { SidebarMenuLink } from "./SidebarMenuLink";
import {
  SIDEBAR_MENU_ITEM,
  SIDEBAR_MENU_LABEL,
  SIDEBAR_MENU_SEPARATOR,
} from "./sidebar-menu-styles";
import { isChildActive } from "./sidebar-navigation-support";
import { getWorkspaceLinks } from "./workspace-navigation";

/** Active organization pages and the organization switcher, shared by sidebar and bar. */
export function OrganizationMenuContent({
  align,
  className,
  context,
  side,
}: {
  align: "start" | "end";
  className: string;
  context: WorkspaceCurrentContextDto;
  side: "top" | "bottom";
}) {
  const [search, setSearch] = useState("");
  const organizations = useWorkspaceOrganizationCatalog(useDebouncedValue(search.trim()));
  const items = organizations.data?.items ?? [];
  // Search is only offered when the memberships do not fit the first page.
  const searchable =
    (organizations.data?.totalItems ?? 0) > 24 || organizations.hasNextPage || search !== "";
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(null);
  const attachScroll = useCallback((element: HTMLDivElement | null) => {
    scrollRef.current = element;
    setScrollElement(element);
  }, []);
  const [focusedId, setFocusedId] = useState<number | null>(null);
  const focusedIndex = items.findIndex((item) => item.id === focusedId);
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollElement,
    estimateSize: () => 56,
    getItemKey: (index) => items[index]!.id,
    overscan: 4,
    rangeExtractor: (range) =>
      [...new Set([...defaultRangeExtractor(range), focusedIndex])]
        .filter((index) => index >= 0)
        .sort((a, b) => a - b),
  });
  useLoadMoreNearEnd({
    scrollRef,
    lastVisible: virtualizer.range?.endIndex ?? -1,
    count: items.length,
    margin: 7,
    hasNext: Boolean(organizations.hasNextPage),
    isBusy: organizations.isFetching,
    hasError: Boolean(organizations.error),
    onLoadMore: organizations.fetchNextPage,
  });
  const navigate = useNavigate();
  const location = useLocation();
  const selectOrganization = useSelectOrganization();
  const workspaceLinks = getWorkspaceLinks(context.permissions, context.currentOrganization.id);
  const currentPath = `${location.pathname}${location.search}`;

  return (
    <DropdownMenu.Portal>
      <DropdownMenu.Content
        align={align}
        side={side}
        sideOffset={8}
        collisionPadding={8}
        className={className}
      >
        {workspaceLinks.length > 0 ? (
          <>
            <DropdownMenu.Label className={SIDEBAR_MENU_LABEL}>Workspace</DropdownMenu.Label>
            <DropdownMenu.Group>
              {workspaceLinks.map((link) => (
                <SidebarMenuLink
                  key={link.to}
                  active={isChildActive(link, currentPath, location.pathname)}
                  icon={link.icon}
                  label={link.label}
                  to={link.to}
                />
              ))}
            </DropdownMenu.Group>
            <DropdownMenu.Separator className={SIDEBAR_MENU_SEPARATOR} />
            <DropdownMenu.Label className={SIDEBAR_MENU_LABEL}>
              Switch organization
            </DropdownMenu.Label>
          </>
        ) : null}
        {searchable ? (
          // Typing must not reach the menu's own type-ahead.
          <div className="px-1 pb-2" onKeyDown={(event) => event.stopPropagation()}>
            <AppSearchField
              label="Search organization"
              placeholder="Search organization"
              value={search}
              onChange={setSearch}
            />
          </div>
        ) : null}
        <DropdownMenu.Group
          ref={attachScroll}
          className="app-scroll max-h-42 min-h-0 overflow-y-auto overscroll-contain"
          onKeyDownCapture={(event) => {
            if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
            const current = Number(
              (event.target as HTMLElement).closest<HTMLElement>("[data-index]")?.dataset.index ??
                0,
            );
            const next =
              event.key === "Home"
                ? 0
                : event.key === "End"
                  ? items.length - 1
                  : Math.max(
                      0,
                      Math.min(items.length - 1, current + (event.key === "ArrowDown" ? 1 : -1)),
                    );
            if (!items[next]) return;
            event.preventDefault();
            event.stopPropagation();
            virtualizer.scrollToIndex(next);
            requestAnimationFrame(() =>
              scrollRef.current?.querySelector<HTMLElement>(`[data-index="${next}"]`)?.focus(),
            );
          }}
        >
          <div className="relative" style={{ height: virtualizer.getTotalSize() }}>
            {virtualizer.getVirtualItems().map((row) => {
              const organization = items[row.index]!;
              return (
                <DropdownMenu.Item
                  key={organization.id}
                  data-index={row.index}
                  onFocus={() => setFocusedId(organization.id)}
                  style={{ transform: `translateY(${row.start}px)` }}
                  className={cx(
                    SIDEBAR_MENU_ITEM,
                    "absolute left-0 top-0 h-14 w-full justify-between py-2.5",
                  )}
                  onSelect={() => {
                    void selectOrganization.mutateAsync(organization.id).then(() => {
                      void navigate("/home");
                    });
                  }}
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <OrganizationMark
                      className="size-8 rounded-lg"
                      fallbackClassName="bg-surface-muted text-fg-secondary"
                      iconSize={14}
                      logoUrl={organization.logoUrl}
                    />
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{organization.name}</span>
                      <span className="block truncate text-xs text-fg-secondary">
                        {organization.slug}
                      </span>
                    </span>
                  </span>
                  {organization.id === context.currentOrganization.id ? (
                    <Check size={16} className="shrink-0" />
                  ) : null}
                </DropdownMenu.Item>
              );
            })}
          </div>
          {organizations.error ? (
            <DropdownMenu.Item
              className={SIDEBAR_MENU_ITEM}
              onSelect={(event) => {
                event.preventDefault();
                void (organizations.isFetchNextPageError
                  ? organizations.fetchNextPage()
                  : organizations.refetch());
              }}
            >
              Could not load organizations. Retry
            </DropdownMenu.Item>
          ) : organizations.isFetching ? (
            <p role="status" className="px-3 py-2 text-xs text-fg-secondary">
              Loading organizations…
            </p>
          ) : items.length === 0 ? (
            <p className="px-3 py-2 text-xs text-fg-secondary">No organizations match.</p>
          ) : null}
        </DropdownMenu.Group>
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  );
}
