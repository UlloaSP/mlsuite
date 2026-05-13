import { appFetch } from "../../app/api/appFetch";
import type {
	CreateInvitationRequest,
	CreateOrganizationRequest,
	CreateTeamRequest,
	InvitationDto,
	OrganizationAdminDashboardDto,
	OrganizationDto,
	OrganizationMembershipDto,
	OrganizationMembershipRowDto,
	TeamDetailDto,
	TeamDto,
	TeamMembershipRowDto,
	UpdateOrganizationRequest,
	UpdateTeamRequest,
	WorkspaceContextDto,
} from "../types";

const json = (method: "POST" | "PATCH", body: unknown): RequestInit => ({
	method,
	headers: { "Content-Type": "application/json" },
	body: JSON.stringify(body),
});

export const getWorkspaceContext = (): Promise<WorkspaceContextDto> =>
	appFetch<WorkspaceContextDto>("/api/workspace/context");

export const selectOrganization = (organizationId: number): Promise<WorkspaceContextDto> =>
	appFetch<WorkspaceContextDto>("/api/workspace/context", json("PATCH", { organizationId }));

export const getOrganizations = (): Promise<OrganizationDto[]> =>
	appFetch<OrganizationDto[]>("/api/organizations");

export const createOrganization = (payload: CreateOrganizationRequest): Promise<OrganizationDto> =>
	appFetch<OrganizationDto>("/api/organizations", json("POST", payload));

export const getOrganization = (organizationId: number): Promise<OrganizationDto> =>
	appFetch<OrganizationDto>(`/api/organizations/${organizationId}`);

export const getOrganizationAdminDashboard = (organizationId: number): Promise<OrganizationAdminDashboardDto> =>
	appFetch<OrganizationAdminDashboardDto>(`/api/organizations/${organizationId}/admin-dashboard`);

export const updateOrganization = (organizationId: number, payload: UpdateOrganizationRequest): Promise<OrganizationDto> =>
	appFetch<OrganizationDto>(`/api/organizations/${organizationId}`, json("PATCH", payload));

export const getOrganizationMembers = (organizationId: number): Promise<OrganizationMembershipRowDto[]> =>
	appFetch<OrganizationMembershipRowDto[]>(`/api/organizations/${organizationId}/members`);

export const updateOrganizationMemberRole = (organizationId: number, membershipId: number, roleDefinitionId: number): Promise<OrganizationMembershipDto> =>
	appFetch<OrganizationMembershipDto>(`/api/organizations/${organizationId}/members/${membershipId}`, json("PATCH", { roleDefinitionId }));

export const removeOrganizationMember = (organizationId: number, membershipId: number): Promise<void> =>
	appFetch<void>(`/api/organizations/${organizationId}/members/${membershipId}`, { method: "DELETE" });

export const transferOrganizationOwnership = (
	organizationId: number,
	nextOwnerMembershipId: number,
): Promise<OrganizationMembershipDto> =>
	appFetch<OrganizationMembershipDto>(
		`/api/organizations/${organizationId}/transfer-ownership`,
		json("POST", { nextOwnerMembershipId }),
	);

export const getTeams = (organizationId: number): Promise<TeamDto[]> =>
	appFetch<TeamDto[]>(`/api/organizations/${organizationId}/teams`);

export const createTeam = (organizationId: number, payload: CreateTeamRequest): Promise<TeamDto> =>
	appFetch<TeamDto>(`/api/organizations/${organizationId}/teams`, json("POST", payload));

export const getTeam = (teamId: number): Promise<TeamDetailDto> =>
	appFetch<TeamDetailDto>(`/api/teams/${teamId}`);

export const updateTeam = (teamId: number, payload: UpdateTeamRequest): Promise<TeamDto> =>
	appFetch<TeamDto>(`/api/teams/${teamId}`, json("PATCH", payload));

export const getTeamMembers = (teamId: number): Promise<TeamMembershipRowDto[]> =>
	appFetch<TeamMembershipRowDto[]>(`/api/teams/${teamId}/members`);

export const updateTeamMemberRole = (teamId: number, membershipId: number, roleDefinitionId: number): Promise<TeamMembershipRowDto> =>
	appFetch<TeamMembershipRowDto>(`/api/teams/${teamId}/members/${membershipId}`, json("PATCH", { roleDefinitionId }));

export const removeTeamMember = (teamId: number, membershipId: number): Promise<void> =>
	appFetch<void>(`/api/teams/${teamId}/members/${membershipId}`, { method: "DELETE" });

export const getInvitations = (organizationId: number): Promise<InvitationDto[]> =>
	appFetch<InvitationDto[]>(`/api/organizations/${organizationId}/invitations`);

export const createInvitation = (organizationId: number, payload: CreateInvitationRequest): Promise<InvitationDto> =>
	appFetch<InvitationDto>(`/api/organizations/${organizationId}/invitations`, json("POST", payload));

export const revokeInvitation = (organizationId: number, invitationId: number): Promise<void> =>
	appFetch<void>(`/api/organizations/${organizationId}/invitations/${invitationId}`, { method: "DELETE" });

export const resendInvitation = (organizationId: number, invitationId: number): Promise<InvitationDto> =>
	appFetch<InvitationDto>(`/api/organizations/${organizationId}/invitations/${invitationId}/resend`, { method: "POST" });

export const bulkRevokeInvitations = (organizationId: number, invitationIds: number[]): Promise<void> =>
	appFetch<void>(`/api/organizations/${organizationId}/invitations/bulk-revoke`, json("POST", { invitationIds }));

export const getPendingInvitations = (): Promise<InvitationDto[]> =>
	appFetch<InvitationDto[]>("/api/invitations/pending");

export const acceptInvitation = (token: string): Promise<InvitationDto> =>
	appFetch<InvitationDto>(`/api/invitations/${encodeURIComponent(token)}/accept`, { method: "POST" });

export const declineInvitation = (token: string): Promise<void> =>
	appFetch<void>(`/api/invitations/${encodeURIComponent(token)}/decline`, { method: "POST" });
