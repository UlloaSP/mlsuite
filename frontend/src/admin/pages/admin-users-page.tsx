/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Plus, Search } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import type { AdminUserDto } from "../../api/admin-users/dtos";
import {
  useAdminUsers,
  useDeleteAdminUser,
  useResetAdminUserPassword,
  useUpdateAdminUser,
} from "../../api/admin-users/hooks";
import { useUser } from "../../api/user/hooks";
import { AppButton, CatalogResourcePage, useCatalogControls } from "../../app/components";
import { NotFoundError } from "../../app/pages/error-page";
import { ResetPasswordDialog } from "../components/ResetPasswordDialog";
import { UserCatalogTile } from "../components/UserCatalogTile";

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
    initialFilter: "all",
    initialSort: "current",
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
    row: AdminUserDto,
    payload: { enabled?: boolean; systemRole?: AdminUserDto["systemRole"] },
  ) => {
    try {
      await updateUser.mutateAsync({ id: row.id, payload });
      toast.success("User updated.");
    } catch (actionError: unknown) {
      toast.error(actionError instanceof Error ? actionError.message : String(actionError));
      throw actionError;
    }
  };
  const remove = async (row: AdminUserDto) => {
    try {
      await deleteUser.mutateAsync(row.id);
      if (pageItems.length === 1 && controls.page > 0) {
        controls.setPage((current) => current - 1);
      }
      toast.success("User deleted.");
    } catch (actionError: unknown) {
      toast.error(actionError instanceof Error ? actionError.message : String(actionError));
      throw actionError;
    }
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
        onError: (actionError) => toast.error(actionError.message),
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
              New User
            </AppButton>
          ),
        }}
        isActionPending={isActionPending || pageQuery.isFetching}
        loadingLabel="Loading users..."
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
          onClose={() => setResetTarget(null)}
          onSubmit={submitResetPassword}
        />
      ) : null}
    </>
  );
}
