import { appFetch } from "@/shared/api/http";
import { useQuery } from "@tanstack/react-query";
import { useInfiniteCatalog, type CatalogPage } from "@/shared/api/infinite-catalog";
import type {
  MemberCatalogDto,
  InvitationCatalogDto,
  InvitationDto,
  InvitationCandidateDto,
  OrganizationMembershipRowDto,
  PermissionGroupDto,
  RoleCatalogMetadataDto,
  RoleDefinitionDto,
  RoleSummaryDto,
  RoleTemplateDto,
} from "@/shared/api/openapi.gen";
import {
  organizationMembersQueryKey,
  organizationInvitationsQueryKey,
  organizationInvitationCandidatesQueryKey,
  organizationRolesQueryKey,
  PENDING_INVITATIONS_QUERY_KEY,
} from "./workspace.keys";

type Controls = { search: string; filter?: string; sort?: string };
const params = (page: number, controls: Controls) =>
  new URLSearchParams({ page: String(page), size: "24", ...controls });

export function useMemberCatalog(id: number, controls: Controls, enabled = true) {
  return useInfiniteCatalog({
    queryKey: [...organizationMembersQueryKey(id), "infinite", controls],
    queryFn: (page, signal) =>
      appFetch<MemberCatalogDto>(
        `/api/organizations/${id}/members/catalog?${params(page, controls)}`,
        { signal },
      ),
    enabled: Boolean(id) && enabled,
  });
}

export function useMemberFilterRoleCatalog(id: number, search: string, enabled: boolean) {
  return useInfiniteCatalog({
    queryKey: [...organizationMembersQueryKey(id), "roles", "infinite", search],
    queryFn: (page, signal) =>
      appFetch<CatalogPage<RoleSummaryDto>>(
        `/api/organizations/${id}/members/roles/catalog?${params(page, { search })}`,
        { signal },
      ),
    enabled: Boolean(id) && enabled,
  });
}

export function useMemberFilterRole(id: number, roleId: string) {
  return useQuery({
    queryKey: [...organizationMembersQueryKey(id), "roles", "detail", roleId],
    queryFn: ({ signal }) =>
      appFetch<CatalogPage<RoleSummaryDto>>(
        `/api/organizations/${id}/members/roles/catalog?${new URLSearchParams({ size: "1", filter: roleId })}`,
        { signal },
      ),
    enabled: Boolean(id) && roleId !== "ALL",
  });
}

export function useInvitationCatalog(id: number, controls: Controls) {
  return useInfiniteCatalog({
    queryKey: [...organizationInvitationsQueryKey(id), "infinite", controls],
    queryFn: (page, signal) =>
      appFetch<InvitationCatalogDto>(
        `/api/organizations/${id}/invitations/catalog?${params(page, controls)}`,
        { signal },
      ),
    enabled: Boolean(id),
  });
}

export function useInvitationCandidateCatalog(id: number, search: string, enabled = true) {
  return useInfiniteCatalog({
    queryKey: [...organizationInvitationCandidatesQueryKey(id), "infinite", search],
    queryFn: (page, signal) =>
      appFetch<CatalogPage<InvitationCandidateDto>>(
        `/api/organizations/${id}/invitation-candidates/catalog?${params(page, { search })}`,
        { signal },
      ),
    enabled: Boolean(id) && enabled,
  });
}

function useRoleResource<T>(
  id: number,
  resource: string,
  search: string,
  enabled: boolean,
  filter = "all",
) {
  return useInfiniteCatalog({
    queryKey: [...organizationRolesQueryKey(id), "infinite", resource, search, filter],
    queryFn: (page, signal) =>
      appFetch<CatalogPage<T>>(
        `/api/organizations/${id}/${resource}/catalog?${params(page, { search, filter })}`,
        { signal },
      ),
    enabled: Boolean(id) && enabled,
  });
}

export const useRoleCatalog = (id: number, search: string, enabled = true, filter = "all") =>
  useRoleResource<RoleDefinitionDto>(id, "roles", search, enabled, filter);
export const useRoleTemplateCatalog = (id: number, search: string, enabled = true) =>
  useRoleResource<RoleTemplateDto>(id, "role-templates", search, enabled);
export const usePermissionCatalog = (id: number, search: string, enabled = true) =>
  useRoleResource<PermissionGroupDto>(id, "permissions", search, enabled);

export function useRoleCatalogMetadata(id: number, enabled = true) {
  return useQuery({
    queryKey: [...organizationRolesQueryKey(id), "metadata"],
    queryFn: ({ signal }) =>
      appFetch<RoleCatalogMetadataDto>(`/api/organizations/${id}/roles/metadata`, { signal }),
    enabled: Boolean(id) && enabled,
  });
}

export function usePendingInvitationCatalog(search: string) {
  return useInfiniteCatalog({
    queryKey: [...PENDING_INVITATIONS_QUERY_KEY, "infinite", search],
    queryFn: (page, signal) =>
      appFetch<CatalogPage<InvitationDto>>(
        `/api/invitations/pending/catalog?${params(page, { search })}`,
        { signal },
      ),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useOwnerCandidateCatalog(id: number, search: string, enabled = true) {
  return useInfiniteCatalog({
    queryKey: [...organizationMembersQueryKey(id), "owners", "infinite", search],
    queryFn: (page, signal) =>
      appFetch<CatalogPage<OrganizationMembershipRowDto>>(
        `/api/organizations/${id}/owner-candidates/catalog?${params(page, { search })}`,
        { signal },
      ),
    enabled: Boolean(id) && enabled,
  });
}
export function useMemberRoleCatalog(
  id: number,
  memberId: number,
  search: string,
  enabled: boolean,
) {
  return useInfiniteCatalog({
    queryKey: [...organizationRolesQueryKey(id), "member", memberId, "infinite", search],
    queryFn: (page, signal) =>
      appFetch<CatalogPage<RoleSummaryDto>>(
        `/api/organizations/${id}/members/${memberId}/roles/catalog?${params(page, { search })}`,
        { signal },
      ),
    enabled: Boolean(id) && enabled,
  });
}
