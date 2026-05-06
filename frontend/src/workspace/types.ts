export type OrganizationRole = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
export type TeamRole = "TEAM_ADMIN" | "TEAM_MEMBER" | "TEAM_VIEWER";
export type MembershipStatus = "ACTIVE" | "PENDING" | "REMOVED";
export type InvitationStatus = "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED";
export type RoleScope = "SYSTEM" | "ORGANIZATION" | "TEAM";
export type PermissionKey =
	| "VIEW_WORKSPACE"
	| "VIEW_ORGANIZATION"
	| "EDIT_ORGANIZATION"
	| "DELETE_ORGANIZATION"
	| "TRANSFER_OWNERSHIP"
	| "VIEW_MEMBERS"
	| "INVITE_MEMBERS"
	| "MANAGE_MEMBER_ROLES"
	| "REMOVE_MEMBERS"
	| "VIEW_INVITATIONS"
	| "MANAGE_INVITATIONS"
	| "VIEW_TEAMS"
	| "CREATE_TEAMS"
	| "EDIT_TEAMS"
	| "DELETE_TEAMS"
	| "VIEW_MODELS"
	| "CREATE_MODELS"
	| "EDIT_MODELS"
	| "DELETE_MODELS"
	| "RUN_PREDICTIONS"
	| "VIEW_PLUGINS"
	| "MANAGE_PLUGINS"
	| "VIEW_AUDIT_LOG";
export type WorkspacePermissionKey =
	| "canViewWorkspace"
	| "canViewOrganization"
	| "canEditOrganization"
	| "canDeleteOrganization"
	| "canTransferOwnership"
	| "canViewMembers"
	| "canInviteMembers"
	| "canManageMemberRoles"
	| "canRemoveMembers"
	| "canViewInvitations"
	| "canManageInvitations"
	| "canViewTeams"
	| "canCreateTeams"
	| "canEditTeams"
	| "canDeleteTeams"
	| "canViewModels"
	| "canCreateModels"
	| "canEditModels"
	| "canDeleteModels"
	| "canRunPredictions"
	| "canViewPlugins"
	| "canManagePlugins";

export interface WorkspacePermissionsDto {
	canViewWorkspace: boolean;
	canViewOrganization: boolean;
	canEditOrganization: boolean;
	canDeleteOrganization: boolean;
	canTransferOwnership: boolean;
	canViewMembers: boolean;
	canInviteMembers: boolean;
	canManageMemberRoles: boolean;
	canRemoveMembers: boolean;
	canViewInvitations: boolean;
	canManageInvitations: boolean;
	canViewTeams: boolean;
	canCreateTeams: boolean;
	canEditTeams: boolean;
	canDeleteTeams: boolean;
	canViewModels: boolean;
	canCreateModels: boolean;
	canEditModels: boolean;
	canDeleteModels: boolean;
	canRunPredictions: boolean;
	canViewPlugins: boolean;
	canManagePlugins: boolean;
}

export interface TeamPermissionsDto {
	canViewTeam: boolean;
	canEditTeam: boolean;
	canDeleteTeam: boolean;
	canViewTeamMembers: boolean;
	canManageTeamMemberRoles: boolean;
	canRemoveTeamMembers: boolean;
}

export interface RoleSummaryDto {
	id: number | null;
	name: string;
	slug: string;
	scope: RoleScope;
	locked: boolean;
	systemKey?: string | null;
}

export interface MembershipRowActionsDto {
	canChangeRole: boolean;
	canRemove: boolean;
	assignableRoles: RoleSummaryDto[];
}

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

export interface OrganizationMembershipRowDto {
	id: number;
	organizationId: number;
	userId: number;
	fullName: string;
	email: string;
	avatarUrl?: string | null;
	role: RoleSummaryDto;
	legacyRole?: OrganizationRole | null;
	status: MembershipStatus;
	createdAt: string;
	actions: MembershipRowActionsDto;
}

export interface TeamDto {
	id: number;
	organizationId: number;
	slug: string;
	name: string;
	description?: string | null;
	leadName?: string | null;
	leadEmail?: string | null;
	memberCount?: number;
	modelCount?: number;
	quotaUsed?: number;
	quotaLimit?: number | null;
	status?: "ACTIVE" | "INACTIVE" | "ARCHIVED";
	createdAt: string;
	updatedAt: string;
}

export interface TeamDetailDto extends TeamDto {
	currentUserRole?: TeamRole | null;
	permissions: TeamPermissionsDto;
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

export interface TeamMembershipRowDto {
	id: number;
	teamId: number;
	userId: number;
	fullName: string;
	email: string;
	avatarUrl?: string | null;
	role: RoleSummaryDto;
	legacyRole?: TeamRole | null;
	status: MembershipStatus;
	createdAt: string;
	actions: MembershipRowActionsDto;
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
	permissions: WorkspacePermissionsDto;
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
	leadMembershipId?: number;
	monthlyInferenceQuota?: number;
}

export interface UpdateTeamRequest {
	name?: string;
	description?: string;
	leadMembershipId?: number;
	monthlyInferenceQuota?: number;
	status?: "ACTIVE" | "INACTIVE" | "ARCHIVED";
}

export interface CreateInvitationRequest {
	email: string;
	role: OrganizationRole;
	teamId?: number;
}

export interface OrganizationAdminStatsDto {
	totalTeams: number;
	activeTeams: number;
	totalMembers: number;
	totalModels: number;
	pendingInvitations: number;
	quotaUsed: number;
	quotaLimit: number;
}

export interface OrganizationAdminDashboardDto {
	organization: OrganizationDto;
	permissions: WorkspacePermissionsDto;
	stats: OrganizationAdminStatsDto;
	recentTeams: TeamDto[];
	recentMembers: OrganizationMembershipRowDto[];
	recentInvitations: InvitationDto[];
}

export interface PermissionDto {
	key: PermissionKey;
	label: string;
	description: string;
	dangerous: boolean;
}

export interface PermissionGroupDto {
	name: string;
	permissions: PermissionDto[];
}

export interface RoleDefinitionDto {
	id: number;
	name: string;
	slug: string;
	description: string;
	scope: RoleScope;
	locked: boolean;
	systemKey?: string | null;
	userCount: number;
	permissions: PermissionDto[];
	actions: {
		canView: boolean;
		canEdit: boolean;
		canDelete: boolean;
		canDuplicate: boolean;
		canAssign: boolean;
	};
}

export interface RoleTemplateDto {
	id: number;
	name: string;
	description: string;
	category: string;
	scope: string;
	permissionKeys: string[];
}

export interface RolesResponseDto {
	roles: RoleDefinitionDto[];
	templates: RoleTemplateDto[];
	permissionCatalog: PermissionGroupDto[];
	stats: {
		customRoles: number;
		lockedRoles: number;
		assignedUsers: number;
	};
}

export interface CreateRoleRequest {
	name: string;
	description?: string;
	permissionKeys: PermissionKey[];
}

export interface UpdateRoleRequest extends CreateRoleRequest {}

export interface CreateRoleFromTemplateRequest {
	templateId: number;
	name?: string;
	permissionKeys?: PermissionKey[];
}
