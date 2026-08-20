import { useNavigate, useParams } from "react-router";
import { AppButton } from "@/shared/ui/AppButton";
import { AppPage } from "@/shared/ui/AppPage";
import { AppPageHeader } from "@/shared/ui/PageHeader";
import { AppPanel } from "@/shared/ui/AppPanel";
import { AppSurface } from "@/shared/ui/AppSurface";
import {
  useAcceptInvitation,
  useDeclineInvitation,
} from "@/features/workspace/api/workspace.mutations";

export function InvitationAcceptPage() {
  const navigate = useNavigate();
  const { token = "" } = useParams();
  const accept = useAcceptInvitation();
  const decline = useDeclineInvitation();

  return (
    <AppPage>
      <AppSurface className="flex flex-1 items-center justify-center overflow-auto">
        <AppPanel className="w-full max-w-2xl">
          <AppPageHeader
            eyebrow="Invitation"
            title="Join Workspace"
            description="Accept this invitation to enter the shared MLSuite workspace, or decline it and keep your current setup untouched."
          />
          <div className="mt-6 flex flex-wrap gap-3">
            <AppButton
              type="button"
              onClick={() => {
                void accept.mutateAsync(token).then(() => navigate("/workspace"));
              }}
            >
              Accept Invite
            </AppButton>
            <AppButton
              type="button"
              variant="secondary"
              onClick={() => {
                void decline.mutateAsync(token).then(() => navigate("/workspace"));
              }}
            >
              Decline
            </AppButton>
          </div>
        </AppPanel>
      </AppSurface>
    </AppPage>
  );
}
