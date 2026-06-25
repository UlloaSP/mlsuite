/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Plus, Search } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import {
  useAdminUsers,
  useDeleteAdminUser,
  useResetAdminUserPassword,
  useUpdateAdminUser,
} from "../../api/admin-users/hooks";
import type { AdminUserDto } from "../../api/admin-users/dtos";
import { useUser } from "../../api/user/hooks";
import {
  AppButton,
  AppEmptyState,
  AppPage,
  AppPageHeader,
  AppPanel,
  AppSurface,
} from "../../app/components";
import { NotFoundError } from "../../app/pages/error-page";
import { ResetPasswordDialog } from "../components/ResetPasswordDialog";
import { UserCatalogPagination } from "../components/UserCatalogPagination";
import { UserCatalogTile } from "../components/UserCatalogTile";
import {
  UserCatalogToolbar,
  type UserRoleFilter,
  type UserSortMode,
} from "../components/UserCatalogToolbar";

const PAGE_SIZE = 8;
type ResetTarget = { id: number; fullName: string } | null;

export function AdminUsersPage() {
  const navigate = useNavigate();
  const { data: user, error } = useUser();
  const { data: users = [], isLoading, error: loadError } = useAdminUsers();
  const updateUser = useUpdateAdminUser();
  const resetPassword = useResetAdminUserPassword();
  const deleteUser = useDeleteAdminUser();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const [filter, setFilter] = useState<UserRoleFilter>("all");
  const [sort, setSort] = useState<UserSortMode>("current");
  const [page, setPage] = useState(0);
  const [resetTarget, setResetTarget] = useState<ResetTarget>(null);

  const filteredUsers = useMemo(
    () => sortUsers(filterUsers(users, deferredQuery, filter), sort),
    [deferredQuery, filter, sort, users],
  );
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const pageItems = filteredUsers.slice(
    currentPage * PAGE_SIZE,
    currentPage * PAGE_SIZE + PAGE_SIZE,
  );
  const isActionPending =
    updateUser.isPending || resetPassword.isPending || deleteUser.isPending || isLoading;

  if (!user || error) return <NotFoundError />;
  if (user.systemRole !== "SUPERADMIN") return <NotFoundError />;

  const resetPage = () => setPage(0);
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
    <AppPage>
      <AppSurface className="flex flex-1 flex-col overflow-hidden">
        <AppPageHeader
          eyebrow="Superadmin"
          title="Users"
          description="Search, filter, and maintain platform users."
          breadcrumbs={[{ label: "Users" }]}
          actions={
            <AppButton type="button" onClick={() => navigate("/admin/users/create")}>
              <Plus size={16} />
              New User
            </AppButton>
          }
        />
        <UserCatalogToolbar
          filter={filter}
          query={query}
          resultCount={filteredUsers.length}
          setFilter={(value) => {
            resetPage();
            setFilter(value);
          }}
          setQuery={(value) => {
            resetPage();
            setQuery(value);
          }}
          setSort={(value) => {
            resetPage();
            setSort(value);
          }}
          sort={sort}
        />
        <section className="min-h-0 flex-1 basis-0 overflow-y-auto py-4">
          <div className="grid gap-3 pr-1">
            {isLoading ? (
              <AppPanel className="px-6 py-16 text-center text-sm text-[var(--text-secondary)]">
                Loading users...
              </AppPanel>
            ) : null}
            {loadError ? (
              <AppPanel className="px-6 py-16 text-center text-sm text-[var(--danger-text)]">
                {loadError instanceof Error ? loadError.message : String(loadError)}
              </AppPanel>
            ) : null}
            {!isLoading && !loadError && pageItems.length === 0 ? (
              <AppEmptyState
                icon={<Search size={22} />}
                title="No matching users"
                description="Try another search term or role filter."
              />
            ) : null}
            {pageItems.map((row) => (
              <UserCatalogTile
                key={row.id}
                disabled={isActionPending}
                item={row}
                onDelete={() => remove(row)}
                onResetPassword={() => setResetTarget({ id: row.id, fullName: row.fullName })}
                onUpdate={(payload) => update(row, payload)}
              />
            ))}
          </div>
        </section>
        <UserCatalogPagination
          disabled={isActionPending}
          page={currentPage}
          setPage={setPage}
          totalPages={totalPages}
        />
        {resetTarget ? (
          <ResetPasswordDialog
            fullName={resetTarget.fullName}
            isPending={resetPassword.isPending}
            onClose={() => setResetTarget(null)}
            onSubmit={submitResetPassword}
          />
        ) : null}
      </AppSurface>
    </AppPage>
  );
}

function filterUsers(users: AdminUserDto[], query: string, filter: UserRoleFilter) {
  return users.filter((row) => {
    const matchesRole = filter === "all" || row.systemRole === filter;
    const haystack = `${row.fullName} ${row.email} ${row.username}`.toLowerCase();
    return matchesRole && (!query || haystack.includes(query));
  });
}

function sortUsers(users: AdminUserDto[], sort: UserSortMode) {
  const sorted = [...users];
  if (sort === "name") {
    return sorted.sort((left, right) => left.fullName.localeCompare(right.fullName));
  }
  if (sort === "newest") {
    return sorted.sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
  }
  if (sort === "oldest") {
    return sorted.sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt));
  }
  return sorted;
}
