import { Plus, Settings } from "lucide-react";
import { Link } from "react-router";
import { AppButton } from "@/shared/ui/AppButton";

export function OrganizationHeaderActions({ id, canCreate }: { id: number; canCreate: boolean }) {
  return (
    <>
      <Link to={`/workspace/organizations/${id}/settings`}>
        <AppButton variant="secondary">
          <Settings size={16} />
          Settings
        </AppButton>
      </Link>
      {canCreate ? (
        <Link to={`/workspace/organizations/${id}/teams`}>
          <AppButton>
            <Plus size={16} />
            Create Team
          </AppButton>
        </Link>
      ) : null}
    </>
  );
}
