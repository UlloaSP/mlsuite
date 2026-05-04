import { appFetch } from "../../app/api/appFetch";
import type {
	CreateInvitationRequest,
	CreateOrganizationRequest,
	CreateTeamRequest,
	InvitationDto,
	OrganizationDto,
	OrganizationMembershipDto,
	TeamDto,
	TeamMembershipDto,
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

export const updateOrganization = (organizationId: number, payload: UpdateOrganizationRequest): Promise<OrganizationDto> =>
	appFetch<OrganizationDto>(`/api/organizations/${organizationId}`, json("PATCH", payload));

export const getOrganizationMembers = (organizationId: number): Promise<OrganizationMembershipDto[]> =>
	appFetch<OrganizationMembershipDto[]>(`/api/organizations/${organizationId}/members`);

export const updateOrganizationMemberRole = (organizationId: number, membershipId: number, role: string): Promise<OrganizationMembershipDto> =>
	appFetch<OrganizationMembershipDto>(`/api/organizations/${organizationId}/members/${membershipId}`, json("PATCH", { role }));

export const removeOrganizationMember = (organizationId: number, membershipId: number): Promise<void> =>
	appFetch<void>(`/api/organizations/${organizationId}/members/${membershipId}`, { method: "DELETE" });

export const getTeams = (organizationId: number): Promise<TeamDto[]> =>
	appFetch<TeamDto[]>(`/api/organizations/${organizationId}/teams`);

export const createTeam = (organizationId: number, payload: CreateTeamRequest): Promise<TeamDto> =>
	appFetch<TeamDto>(`/api/organizations/${organizationId}/teams`, json("POST", payload));

export const getTeam = (teamId: number): Promise<TeamDto> =>
	appFetch<TeamDto>(`/api/teams/${teamId}`);

export const updateTeam = (teamId: number, payload: UpdateTeamRequest): Promise<TeamDto> =>
	appFetch<TeamDto>(`/api/teams/${teamId}`, json("PATCH", payload));

export const getTeamMembers = (teamId: number): Promise<TeamMembershipDto[]> =>
	appFetch<TeamMembershipDto[]>(`/api/teams/${teamId}/members`);

export const updateTeamMemberRole = (teamId: number, membershipId: number, role: string): Promise<TeamMembershipDto> =>
	appFetch<TeamMembershipDto>(`/api/teams/${teamId}/members/${membershipId}`, json("PATCH", { role }));

export const removeTeamMember = (teamId: number, membershipId: number): Promise<void> =>
	appFetch<void>(`/api/teams/${teamId}/members/${membershipId}`, { method: "DELETE" });

export const getInvitations = (organizationId: number): Promise<InvitationDto[]> =>
	appFetch<InvitationDto[]>(`/api/organizations/${organizationId}/invitations`);

export const createInvitation = (organizationId: number, payload: CreateInvitationRequest): Promise<InvitationDto> =>
	appFetch<InvitationDto>(`/api/organizations/${organizationId}/invitations`, json("POST", payload));

export const revokeInvitation = (organizationId: number, invitationId: number): Promise<void> =>
	appFetch<void>(`/api/organizations/${organizationId}/invitations/${invitationId}`, { method: "DELETE" });

export const getPendingInvitations = (): Promise<InvitationDto[]> =>
	appFetch<InvitationDto[]>("/api/invitations/pending");

export const acceptInvitation = (token: string): Promise<InvitationDto> =>
	appFetch<InvitationDto>(`/api/invitations/${encodeURIComponent(token)}/accept`, { method: "POST" });

export const declineInvitation = (token: string): Promise<void> =>
	appFetch<void>(`/api/invitations/${encodeURIComponent(token)}/decline`, { method: "POST" });
