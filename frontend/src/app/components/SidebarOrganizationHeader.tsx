/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Building2, Check, ChevronsUpDown } from "lucide-react";
import { useAtomValue } from "jotai";
import { DropdownMenu } from "radix-ui";
import { Link, useNavigate } from "react-router";
import { useWorkspaceContext } from "@/capabilities/workspace-context/workspace-context";
import { useSelectOrganization } from "@/features/workspace/api/workspace.mutations";
import { cx } from "@/shared/ui/cx";
import { FOCUS_RING } from "@/shared/ui/focus-ring";
import { sidebarPositionAtom } from "@/shared/ui/sidebar-position";
import { SidebarLabel } from "./app-sidebar/SidebarLabel";
import { SidebarMenu } from "./app-sidebar/SidebarMenu";
import { SidebarMenuButton } from "./app-sidebar/SidebarMenuButton";
import { SidebarMenuItem } from "./app-sidebar/SidebarMenuItem";
import { useSidebar } from "./app-sidebar/SidebarContext";

export function SidebarOrganizationHeader() {
  const navigate = useNavigate();
  const { state } = useSidebar();
  const sidebarPosition = useAtomValue(sidebarPositionAtom);
  const { data: context } = useWorkspaceContext();
  const selectOrganization = useSelectOrganization();

  if (!context) {
    return null;
  }

  const collapsed = state === "collapsed";

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <SidebarMenuButton
              data-user-guide-item="workspace-switcher"
              className={cx(
                "rounded-xl text-[var(--text-primary)]",
                collapsed ? "mx-auto size-9 min-h-9 p-0" : "min-h-13 px-2.5 py-2",
              )}
              title={context.currentOrganization.name}
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--text-primary)] text-[var(--text-inverse)]">
                <Building2 size={16} />
              </span>
              <SidebarLabel className={collapsed ? "w-0 flex-none text-left" : "flex-1 text-left"}>
                <span className="block truncate text-sm font-semibold">
                  {context.currentOrganization.name}
                </span>
                <span className="block truncate text-xs font-normal text-[var(--text-secondary)]">
                  {context.currentOrganization.slug}
                </span>
              </SidebarLabel>
              <ChevronsUpDown
                size={16}
                className={cx(
                  "shrink-0 text-[var(--text-muted)] transition-[opacity,transform] duration-200",
                  collapsed ? "w-0 scale-90 opacity-0" : "opacity-100",
                )}
              />
            </SidebarMenuButton>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align={sidebarPosition === "right" ? "end" : "start"}
              side="bottom"
              sideOffset={8}
              collisionPadding={8}
              className={cx(
                "z-[1000] flex max-h-[var(--radix-dropdown-menu-content-available-height)] max-w-[calc(100vw-1rem)] flex-col overflow-hidden rounded-xl border border-[var(--border-soft)] bg-[var(--surface-primary)] p-2 text-[var(--text-primary)] shadow-[var(--shadow-hover)]",
                collapsed ? "w-64" : "w-[var(--radix-dropdown-menu-trigger-width)]",
              )}
            >
              <DropdownMenu.Group className="app-scroll max-h-42 min-h-0 overflow-y-auto overscroll-contain">
                {context.organizations.map((organization) => (
                  <DropdownMenu.Item
                    key={organization.id}
                    className={cx(
                      "flex h-14 cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-sm outline-none hover:bg-[var(--surface-muted)] focus:bg-[var(--surface-muted)] focus-visible:ring-inset",
                      FOCUS_RING,
                    )}
                    onSelect={() => {
                      void selectOrganization.mutateAsync(organization.id).then(() => {
                        void navigate("/home");
                      });
                    }}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{organization.name}</span>
                      <span className="block truncate text-xs text-[var(--text-secondary)]">
                        {organization.slug}
                      </span>
                    </span>
                    {organization.id === context.currentOrganization.id ? (
                      <Check size={16} className="shrink-0" />
                    ) : null}
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Group>
              <DropdownMenu.Separator className="my-2 h-px shrink-0 bg-[var(--border-soft)]" />
              <DropdownMenu.Item asChild>
                <Link
                  to="/workspace/organizations"
                  className="block shrink-0 rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--accent-primary-strong)] outline-none hover:bg-[var(--surface-muted)] focus:bg-[var(--surface-muted)]"
                >
                  Manage organizations
                </Link>
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
