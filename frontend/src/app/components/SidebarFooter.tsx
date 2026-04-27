/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useAtom } from "jotai";
import { LogOut } from "lucide-react";
import { useLogout, useUser } from "../../user/hooks";
import { sidebarCollapsedAtom } from "../atoms";
import { SidebarSection } from "./SidebarSection";
import { SidebarTile } from "./SidebarTile";

export function SidebarFooter() {
  const { data: user } = useUser();
  const { mutate: logout } = useLogout();
  const [collapsed] = useAtom(sidebarCollapsedAtom);

  return (
    <SidebarSection collapsed={collapsed} className="border-t p-4">
      {user ? (
        <SidebarTile
          icon={LogOut}
          label="Log Out"
          variant="action"
          collapsed={collapsed}
          onClick={() => logout()}
        />
      ) : null}
    </SidebarSection>
  );
}
