export type OrganizationRole = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
export type TeamRole = "TEAM_ADMIN" | "TEAM_MEMBER" | "TEAM_VIEWER";
export type MembershipStatus = "ACTIVE" | "PENDING" | "REMOVED";
export type InvitationStatus = "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED";

export interface OrganizationDto {
	id: number;
	slug: string;
	name: string;
	description?: string | null;
	avatarUrl?: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface OrganizationMembershipDto {
	id: number;
	organizationId: number;
	userId: number;
	fullName: string;
	email: string;
	avatarUrl?: string | null;
	role: OrganizationRole;
	status: MembershipStatus;
	createdAt: string;
}

export interface TeamDto {
	id: number;
	organizationId: number;
	slug: string;
	name: string;
	description?: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface TeamMembershipDto {
	id: number;
	teamId: number;
	userId: number;
	fullName: string;
	email: string;
	avatarUrl?: string | null;
	role: TeamRole;
	status: MembershipStatus;
	createdAt: string;
}

export interface InvitationDto {
	id: number;
	organizationId: number;
	organizationName: string;
	teamId?: number | null;
	email: string;
	role: OrganizationRole;
	status: InvitationStatus;
	token: string;
	expiresAt: string;
	createdAt: string;
}

export interface WorkspaceUserDto {
	id: number;
	fullName: string;
	email: string;
	avatarUrl?: string | null;
}

export interface WorkspaceContextDto {
	user: WorkspaceUserDto;
	memberships: OrganizationMembershipDto[];
	organizations: OrganizationDto[];
	currentOrganization: OrganizationDto;
	currentMembership: OrganizationMembershipDto;
	teams: TeamDto[];
	invitations: InvitationDto[];
	permissions: Record<string, boolean>;
}

export interface CreateOrganizationRequest {
	name: string;
	slug?: string;
	description?: string;
}

export interface UpdateOrganizationRequest {
	name: string;
	description?: string;
}

export interface CreateTeamRequest {
	name: string;
	slug?: string;
	description?: string;
}

export interface UpdateTeamRequest {
	name: string;
	description?: string;
}

export interface CreateInvitationRequest {
	email: string;
	role: OrganizationRole;
	teamId?: number;
}
