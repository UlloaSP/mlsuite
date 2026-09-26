import { BookOpenText } from "lucide-react";
import { useUserGuideLauncher } from "@/app/user-guide/use-user-guide-launcher";
import { SidebarLabel } from "./app-sidebar/SidebarLabel";
import { SidebarMenuButton } from "./app-sidebar/SidebarMenuButton";
import { SidebarMenuItem } from "./app-sidebar/SidebarMenuItem";

export function UserGuideButton() {
  const start = useUserGuideLauncher(true);

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        data-user-guide-item="user-guide"
        title="User guide"
        onClick={(event) => start(event.currentTarget)}
      >
        <BookOpenText size={18} />
        <SidebarLabel className="truncate">User guide</SidebarLabel>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
