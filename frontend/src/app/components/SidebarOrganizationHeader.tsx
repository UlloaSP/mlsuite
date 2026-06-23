/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Building2, Check, ChevronsUpDown } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { Link, useNavigate } from "react-router";
import { useSelectOrganization, useWorkspaceContext } from "../../api/workspace/hooks";
import { cx } from "./cx";
import { FOCUS_RING } from "./focus-ring";
import {
  SidebarLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "./app-sidebar";

export function SidebarOrganizationHeader() {
  const navigate = useNavigate();
  const { state } = useSidebar();
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
              align="start"
              side="bottom"
              sideOffset={8}
              className="z-[1000] min-w-[260px] rounded-xl border border-[var(--border-soft)] bg-[var(--surface-primary)] p-2 text-[var(--text-primary)] shadow-[var(--shadow-hover)]"
            >
              {context.organizations.map((organization) => (
                <DropdownMenu.Item
                  key={organization.id}
                  className={cx(
                    "flex cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 text-sm outline-none hover:bg-[var(--surface-muted)] focus:bg-[var(--surface-muted)]",
                    FOCUS_RING,
                  )}
                  onSelect={() => {
                    void selectOrganization.mutateAsync(organization.id).then(() => {
                      void navigate("/workspace");
                    });
                  }}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{organization.name}</span>
                    <span className="block truncate text-xs text-[var(--text-secondary)]">
                      {organization.slug}
                    </span>
                  </span>
                  {organization.id === context.currentOrganization.id ? <Check size={16} /> : null}
                </DropdownMenu.Item>
              ))}
              <DropdownMenu.Separator className="my-2 h-px bg-[var(--border-soft)]" />
              <DropdownMenu.Item asChild>
                <Link
                  to="/workspace/organizations"
                  className="block rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--accent-primary-strong)] outline-none hover:bg-[var(--surface-muted)] focus:bg-[var(--surface-muted)]"
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
