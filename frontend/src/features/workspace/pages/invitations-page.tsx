import {
  organizationInvitationCandidatesQueryKey,
  organizationInvitationsQueryKey,
} from "@/features/workspace/api/workspace.keys";
import { useQueryClient } from "@tanstack/react-query";
import { Mail, RotateCcw, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useParams } from "react-router";
import { AppButton } from "@/shared/ui/AppButton";
import { AppSelect } from "@/shared/ui/AppSelect";
import { AppCopy } from "@/shared/ui/AppCopy";
import { AppPage } from "@/shared/ui/AppPage";
import { AppPageHeader } from "@/shared/ui/PageHeader";
import { AppSectionTitle } from "@/shared/ui/AppSectionTitle";
import { AppSurface } from "@/shared/ui/AppSurface";
import { NotFoundError } from "@/shared/ui/RouteStatusPage";
import {
  bulkRevokeInvitations,
  createInvitation,
  resendInvitation,
  revokeInvitation,
} from "@/features/workspace/api/invitations.api";
import { AdminDataPanel } from "@/features/workspace/components/admin/AdminDataPanel";
import { AdminStatCard } from "@/features/workspace/components/admin/AdminStatCard";
import { StatusBadge } from "@/features/workspace/components/admin/StatusBadge";
import { InviteForm } from "@/features/workspace/components/InviteForm";
import { RoleBadge } from "@/features/workspace/components/RoleBadge";
import {
  useOrganizationInvitationCandidatesQuery,
  useOrganizationInvitationsQuery,
  useOrganizationRolesQuery,
  useOrganizationTeamsQuery,
} from "@/features/workspace/api/workspace.queries";
import { useWorkspaceContext } from "@/capabilities/workspace-context/workspace-context";
import { invitationRoleOptions } from "@/features/workspace/lib/invitation-role-options";
import type { InvitationStatus } from "@/capabilities/workspace-context/workspace-context.types";

const statuses: Array<InvitationStatus | "ALL"> = [
  "ALL",
  "PENDING",
  "ACCEPTED",
  "EXPIRED",
  "REVOKED",
];
const invitationDateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: "short" });

export function InvitationsPage() {
  const { organizationId = "" } = useParams();
  const qc = useQueryClient();
  const id = Number(organizationId);
  const { data: workspace } = useWorkspaceContext();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<InvitationStatus | "ALL">("PENDING");
  const [selected, setSelected] = useState<number[]>([]);
  const { data: invitations = [] } = useOrganizationInvitationsQuery(id);
  const { data: teams = [] } = useOrganizationTeamsQuery(id);
  const canManage = Boolean(workspace?.permissions.canManageInvitations);
  const { data: roles } = useOrganizationRolesQuery(id, canManage);
  const { data: candidates = [] } = useOrganizationInvitationCandidatesQuery(id, canManage);
  const filtered = useMemo(
    () =>
      invitations.filter(
        (invite) =>
          invite.email.toLowerCase().includes(query.toLowerCase()) &&
          (status === "ALL" || invite.status === status),
      ),
    [invitations, query, status],
  );
  if (workspace && !workspace.permissions.canViewInvitations) return <NotFoundError />;
  const roleOptions = invitationRoleOptions(
    roles?.roles ?? [],
    workspace?.permissions.canTransferOwnership ?? false,
  );

  return (
    <AppPage>
      <AppSurface className="flex flex-1 flex-col gap-6 overflow-auto">
        <AppPageHeader
          title="Invitations"
          description="Invite users, assign starting role, and revoke pending access."
          breadcrumbs={[{ label: "Workspace", to: "/workspace" }, { label: "Invitations" }]}
        />
        {workspace?.permissions.canManageInvitations ? (
          <section className="border-y border-[var(--border-soft)] py-5">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <AppSectionTitle>Invite member</AppSectionTitle>
                <AppCopy className="mt-1">
                  Search existing users outside this organization and assign their starting access.
                </AppCopy>
              </div>
              <AppCopy>{candidates.length} available users</AppCopy>
            </div>
            {roleOptions.length > 0 ? (
              <InviteForm
                teams={teams}
                candidates={candidates}
                roleOptions={roleOptions}
                onSubmit={async (payload) => {
                  await createInvitation(id, payload);
                  await Promise.all([
                    qc.invalidateQueries({
                      queryKey: organizationInvitationsQueryKey(id),
                    }),
                    qc.invalidateQueries({
                      queryKey: organizationInvitationCandidatesQueryKey(id),
                    }),
                  ]);
                }}
              />
            ) : (
              <AppCopy>No assignable roles available.</AppCopy>
            )}
          </section>
        ) : null}
        <div className="grid gap-4 md:grid-cols-4">
          {statuses.slice(1).map((item) => (
            <AdminStatCard
              key={item}
              label={item}
              value={invitations.filter((i) => i.status === item).length}
              icon={<Mail size={18} />}
            />
          ))}
        </div>
        <AdminDataPanel
          title="All Invitations"
          description={`${filtered.length} invitations in this view`}
          search={query}
          onSearch={setQuery}
          actions={
            <>
              <AppSelect
                value={status}
                onValueChange={(nextStatus) => setStatus(nextStatus as InvitationStatus | "ALL")}
                options={statuses.map((item) => ({ value: item, label: item }))}
              />
              {selected.length ? (
                <AppButton
                  variant="danger"
                  onClick={() =>
                    void bulkRevokeInvitations(id, selected).then(() => {
                      setSelected([]);
                      return qc.invalidateQueries({
                        queryKey: organizationInvitationsQueryKey(id),
                      });
                    })
                  }
                >
                  Bulk revoke
                </AppButton>
              ) : null}
            </>
          }
        >
          <table className="w-full min-w-[820px] text-sm">
            <thead className="border-b border-[var(--border-soft)] text-left">
              <tr>
                <th className="p-4">Email</th>
                <th>Role</th>
                <th>Team</th>
                <th>Status</th>
                <th>Expires</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((invite) => (
                <tr key={invite.id} className="border-b border-[var(--border-soft)] last:border-0">
                  <td className="p-4 font-semibold">
                    <input
                      aria-label={`Select invitation ${invite.email}`}
                      className="mr-3"
                      type="checkbox"
                      checked={selected.includes(invite.id)}
                      onChange={(event) =>
                        setSelected((current) =>
                          event.target.checked
                            ? [...current, invite.id]
                            : current.filter((id) => id !== invite.id),
                        )
                      }
                    />
                    {invite.email}
                  </td>
                  <td>
                    <RoleBadge value={invite.roleDefinition?.name ?? invite.role} />
                  </td>
                  <td>{teams.find((team) => team.id === invite.teamId)?.name ?? "No team"}</td>
                  <td>
                    <StatusBadge value={invite.status} />
                  </td>
                  <td>{invitationDateFormatter.format(Date.parse(invite.expiresAt))}</td>
                  <td className="flex gap-2 py-3">
                    <AppButton
                      variant="secondary"
                      onClick={() =>
                        void resendInvitation(id, invite.id).then(() =>
                          qc.invalidateQueries({
                            queryKey: organizationInvitationsQueryKey(id),
                          }),
                        )
                      }
                    >
                      <RotateCcw size={14} />
                      Resend
                    </AppButton>
                    <AppButton
                      variant="secondary"
                      onClick={() =>
                        void navigator.clipboard?.writeText(
                          `${window.location.origin}/invite/${invite.token}`,
                        )
                      }
                    >
                      Copy
                    </AppButton>
                    {workspace?.permissions.canManageInvitations ? (
                      <AppButton
                        variant="danger"
                        onClick={() =>
                          void revokeInvitation(id, invite.id).then(() =>
                            qc.invalidateQueries({
                              queryKey: organizationInvitationsQueryKey(id),
                            }),
                          )
                        }
                      >
                        <X size={14} />
                        Revoke
                      </AppButton>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminDataPanel>
      </AppSurface>
    </AppPage>
  );
}
