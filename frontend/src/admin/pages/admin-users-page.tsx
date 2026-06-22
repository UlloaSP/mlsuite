import { Check, KeyRound, Plus } from "lucide-react";
import type { FormEvent } from "react";
import { useMemo, useRef, useState } from "react";
import { Navigate } from "react-router";
import {
  AppButton,
  AppSelect,
  AppTextField,
  AppPage,
  AppPageHeader,
  AppPanel,
  AppSurface,
} from "../../app/components";
import { useUser } from "../../api/user/hooks";
import { ResetPasswordDialog } from "../components/ResetPasswordDialog";
import {
  useAdminUsers,
  useCreateAdminUser,
  useResetAdminUserPassword,
  useUpdateAdminUser,
} from "../../api/admin-users/hooks";

type Role = "USER" | "SUPERADMIN";
type UserSortMode = "current" | "name" | "newest" | "oldest" | "enabled" | "disabled";
type ResetTarget = { id: number; fullName: string } | null;
const ROLE_OPTIONS = [
  { value: "USER", label: "USER" },
  { value: "SUPERADMIN", label: "SUPERADMIN" },
];
const USER_SORT_OPTIONS = [
  { value: "current", label: "Current order" },
  { value: "name", label: "Name" },
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "enabled", label: "Enabled first" },
  { value: "disabled", label: "Disabled first" },
];

// react-doctor-disable-next-line react-doctor/prefer-useReducer -- The create-user form fields and sort selector are independent controls.
export function AdminUsersPage() {
  const { data: user } = useUser();
  const { data: users = [], isLoading } = useAdminUsers();
  const createUser = useCreateAdminUser();
  const updateUser = useUpdateAdminUser();
  const resetPassword = useResetAdminUserPassword();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("USER");
  const [sortMode, setSortMode] = useState<UserSortMode>("current");
  const [resetTarget, setResetTarget] = useState<ResetTarget>(null);
  const userOrderRef = useRef(new Map<number, number>());

  const visibleUsers = useMemo(() => {
    const order = userOrderRef.current;
    const liveIds = new Set(users.map((row) => row.id));
    users.forEach((row) => {
      if (!order.has(row.id)) {
        order.set(row.id, order.size);
      }
    });
    for (const id of order.keys()) {
      if (!liveIds.has(id)) {
        order.delete(id);
      }
    }
    const byCurrentOrder = (left: { id: number }, right: { id: number }) =>
      (order.get(left.id) ?? 0) - (order.get(right.id) ?? 0);
    const sorted = [...users];

    switch (sortMode) {
      case "name":
        return sorted.sort(
          (left, right) =>
            left.fullName.localeCompare(right.fullName, undefined, { sensitivity: "base" }) ||
            byCurrentOrder(left, right),
        );
      case "newest":
        return sorted.sort(
          (left, right) =>
            new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime() ||
            byCurrentOrder(left, right),
        );
      case "oldest":
        return sorted.sort(
          (left, right) =>
            new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime() ||
            byCurrentOrder(left, right),
        );
      case "enabled":
        return sorted.sort(
          (left, right) =>
            Number(right.enabled) - Number(left.enabled) || byCurrentOrder(left, right),
        );
      case "disabled":
        return sorted.sort(
          (left, right) =>
            Number(left.enabled) - Number(right.enabled) || byCurrentOrder(left, right),
        );
      case "current":
      default:
        return sorted.sort(byCurrentOrder);
    }
  }, [sortMode, users]);

  if (user?.systemRole !== "SUPERADMIN") {
    return <Navigate to="/workspace" replace />;
  }

  const submit = (event: FormEvent) => {
    event.preventDefault();
    createUser.mutate(
      { email, fullName, password, systemRole: role },
      {
        onSuccess: () => {
          setEmail("");
          setFullName("");
          setPassword("");
          setRole("USER");
        },
      },
    );
  };
  const submitResetPassword = (nextPassword: string) => {
    if (!resetTarget) return;
    resetPassword.mutate(
      { id: resetTarget.id, password: nextPassword },
      { onSuccess: () => setResetTarget(null) },
    );
  };

  return (
    <AppPage>
      <AppSurface className="flex flex-1 flex-col gap-6 overflow-auto app-scroll">
        <AppPageHeader
          eyebrow="Admin"
          title="Users"
          description="Create accounts, set global access, and reset passwords."
          breadcrumbs={[{ label: "Admin" }, { label: "Users" }]}
        />
        <AppPanel>
          <form onSubmit={submit} className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_auto_auto]">
            <AppTextField
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
            />
            <AppTextField
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Full name"
            />
            <AppTextField
              required
              type="password"
              minLength={10}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
            />
            <AppSelect
              value={role}
              onValueChange={(nextRole) => setRole(nextRole as Role)}
              options={ROLE_OPTIONS}
            />
            <AppButton type="submit" disabled={createUser.isPending}>
              <Plus size={16} />
              Create
            </AppButton>
          </form>
        </AppPanel>
        <AppPanel className="overflow-auto">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
              User order
            </span>
            <AppSelect
              value={sortMode}
              onValueChange={(nextSort) => setSortMode(nextSort as UserSortMode)}
              className="min-w-[180px]"
              aria-label="Sort users"
              options={USER_SORT_OPTIONS}
            />
          </div>
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.14em] text-[var(--text-secondary)]">
              <tr>
                <th className="p-3">User</th>
                <th className="p-3">Role</th>
                <th className="w-32 p-3 text-center">Enabled</th>
                <th className="p-3">Password</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td className="px-3 py-5 text-[var(--text-secondary)]" colSpan={4}>
                    Loading…
                  </td>
                </tr>
              ) : (
                visibleUsers.map((row) => (
                  <tr key={row.id} className="border-t border-[var(--border-soft)]">
                    <td className="px-3 py-4">
                      <p className="font-semibold text-[var(--text-primary)]">{row.fullName}</p>
                      <p className="text-xs text-[var(--text-secondary)]">{row.email}</p>
                    </td>
                    <td className="px-3 py-4">
                      <AppSelect
                        value={row.systemRole}
                        onValueChange={(nextRole) =>
                          updateUser.mutate({
                            id: row.id,
                            payload: { systemRole: nextRole as Role },
                          })
                        }
                        options={ROLE_OPTIONS}
                      />
                    </td>
                    <td className="w-32 px-3 py-4 text-center">
                      <label className="inline-grid size-9 place-items-center rounded-full transition hover:bg-[var(--surface-muted)]">
                        <input
                          type="checkbox"
                          checked={row.enabled}
                          onChange={(e) =>
                            updateUser.mutate({
                              id: row.id,
                              payload: { enabled: e.target.checked },
                            })
                          }
                          className="peer sr-only"
                          aria-label={`${row.fullName} enabled`}
                        />
                        <span className="grid size-5 place-items-center rounded-[5px] border border-[var(--border-soft)] bg-[var(--surface-primary)] text-transparent transition peer-checked:border-[var(--accent-primary)] peer-checked:bg-[var(--accent-primary)] peer-checked:text-white">
                          <Check size={14} strokeWidth={3} />
                        </span>
                      </label>
                    </td>
                    <td className="px-3 py-4">
                      <AppButton
                        type="button"
                        variant="secondary"
                        onClick={() => setResetTarget({ id: row.id, fullName: row.fullName })}
                      >
                        <KeyRound size={15} />
                        Reset
                      </AppButton>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </AppPanel>
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
