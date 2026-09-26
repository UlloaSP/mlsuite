/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Plus, Search } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import {
  useDeleteAdminUser,
  useResetAdminUserPassword,
  useUpdateAdminUser,
} from "@/features/admin/api/admin-user.mutations";
import { useAdminUsers } from "@/features/admin/api/admin-user.queries";
import type { AdminUser } from "@/features/admin/api/admin-user.types";
import { useUser } from "@/capabilities/workspace-context/session";
import { AppButton } from "@/shared/ui/AppButton";
import { CatalogResourcePage } from "@/shared/ui/catalog/CatalogResourcePage";
import { useCatalogControls } from "@/shared/ui/catalog/useCatalogControls";
import { NotFoundError } from "@/shared/ui/RouteStatusPage";
import { ResetPasswordDialog } from "@/features/admin/components/ResetPasswordDialog";
import { UserCatalogTile } from "@/features/admin/components/UserCatalogTile";

const PAGE_SIZE = 8;
type ResetTarget = { id: number; fullName: string } | null;
type UserRoleFilter = "all" | "USER" | "SUPERADMIN";
type UserSortMode = "current" | "name" | "newest" | "oldest";

const FILTERS: Array<{ value: UserRoleFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "USER", label: "User" },
  { value: "SUPERADMIN", label: "Superadmin" },
];

const SORT_OPTIONS: Array<{ value: UserSortMode; label: string }> = [
  { value: "current", label: "Current order" },
  { value: "name", label: "Name" },
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
];

export function AdminUsersPage() {
  const navigate = useNavigate();
  const { data: user, error } = useUser();
  const controls = useCatalogControls<UserRoleFilter, UserSortMode>({
    filters: FILTERS.map(({ value }) => value),
    initialFilter: "all",
    initialSort: "current",
    sorts: SORT_OPTIONS.map(({ value }) => value),
  });
  const pageQuery = useAdminUsers({
    page: controls.page,
    role: controls.filter,
    search: controls.search,
    size: PAGE_SIZE,
    sort: controls.sort,
  });
  const updateUser = useUpdateAdminUser();
  const resetPassword = useResetAdminUserPassword();
  const deleteUser = useDeleteAdminUser();
  const [resetTarget, setResetTarget] = useState<ResetTarget>(null);
  const pageItems = pageQuery.data?.items ?? [];
  const isActionPending =
    updateUser.isPending || resetPassword.isPending || deleteUser.isPending || pageQuery.isLoading;

  const update = async (
    row: AdminUser,
    payload: { enabled?: boolean; systemRole?: AdminUser["systemRole"] },
  ) => {
    // Failures propagate: the tile shows them inline in a dialog, or as a toast for the switch.
    await updateUser.mutateAsync({ id: row.id, payload });
    toast.success("User updated.");
  };
  const remove = async (row: AdminUser) => {
    // Failures propagate to the delete dialog, which stays open and shows them.
    await deleteUser.mutateAsync(row.id);
    if (pageItems.length === 1 && controls.page > 0) {
      controls.setPage((current) => current - 1);
    }
    toast.success("User deleted.");
  };
  const submitResetPassword = (nextPassword: string) => {
    if (!resetTarget) return;
    resetPassword.mutate(
      { id: resetTarget.id, password: nextPassword },
      {
        onSuccess: () => {
          toast.success("Password changed.");
          setResetTarget(null);
        },
      },
    );
  };

  return (
    <>
      <CatalogResourcePage
        accessDenied={!user || Boolean(error) || user.systemRole !== "SUPERADMIN"}
        accessFallback={<NotFoundError />}
        controls={controls}
        header={{
          eyebrow: "Superadmin",
          title: "Users",
          description: "Search, filter, and maintain platform users.",
          breadcrumbs: [{ label: "Users" }],
          actions: (
            <AppButton type="button" onClick={() => navigate("/admin/users/create")}>
              <Plus size={16} />
              New user
            </AppButton>
          ),
        }}
        isActionPending={isActionPending || pageQuery.isFetching}
        loadingLabel="Loading users…"
        pageSize={PAGE_SIZE}
        filterLabel="Filter users by role"
        filters={FILTERS}
        placeholder="Search by name or email"
        query={pageQuery}
        sortLabel="Sort users"
        sortOptions={SORT_OPTIONS}
        emptyIcon={<Search size={22} />}
        emptyTitle="No users yet"
        filteredEmptyTitle="No matching users"
        emptyDescription="Create the first user to manage platform access."
        filteredEmptyDescription="Try another search term or role filter."
        renderItem={(row) => (
          <UserCatalogTile
            key={row.id}
            disabled={isActionPending}
            item={row}
            onDelete={() => remove(row)}
            onResetPassword={() => setResetTarget({ id: row.id, fullName: row.fullName })}
            onUpdate={(payload) => update(row, payload)}
          />
        )}
      />
      {resetTarget ? (
        <ResetPasswordDialog
          fullName={resetTarget.fullName}
          isPending={resetPassword.isPending}
          error={resetPassword.error?.message}
          onClose={() => {
            resetPassword.reset();
            setResetTarget(null);
          }}
          onSubmit={submitResetPassword}
        />
      ) : null}
    </>
  );
}
