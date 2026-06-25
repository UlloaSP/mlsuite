/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Eye, EyeOff, UserPlus } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { useCreateAdminUser } from "../../api/admin-users/hooks";
import { useUser } from "../../api/user/hooks";
import {
  AppButton,
  AppIconButton,
  AppPage,
  AppPageHeader,
  AppSelect,
  AppSurface,
  AppTextField,
} from "../../app/components";
import { NotFoundError } from "../../app/pages/error-page";

type Role = "USER" | "SUPERADMIN";

const ROLE_OPTIONS: Array<{ value: Role; label: string }> = [
  { value: "USER", label: "User" },
  { value: "SUPERADMIN", label: "Superadmin" },
];

export function CreateAdminUserPage() {
  const navigate = useNavigate();
  const { data: user, error } = useUser();
  const createUser = useCreateAdminUser();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("USER");
  const [visible, setVisible] = useState(false);

  if (!user || error) return <NotFoundError />;
  if (user.systemRole !== "SUPERADMIN") return <NotFoundError />;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    createUser.mutate(
      { email, fullName, password, systemRole: role },
      {
        onSuccess: () => {
          toast.success("User created.");
          void navigate("/admin/users");
        },
        onError: (actionError) => toast.error(actionError.message),
      },
    );
  };

  return (
    <AppPage>
      <AppSurface className="flex flex-1 flex-col overflow-auto">
        <AppPageHeader
          eyebrow="Superadmin"
          title="Create User"
          description="Create platform access and assign global role."
          breadcrumbs={[{ label: "Users", to: "/admin/users" }, { label: "Create User" }]}
        />
        <form onSubmit={submit} className="mx-auto grid w-full max-w-2xl gap-4">
          <Field label="Email">
            <AppTextField
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="user@example.com"
              autoFocus
            />
          </Field>
          <Field label="Full name">
            <AppTextField
              required
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Ada Lovelace"
            />
          </Field>
          <Field label="Password">
            <div className="flex gap-2">
              <AppTextField
                required
                type={visible ? "text" : "password"}
                minLength={10}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Minimum 10 characters"
                className="min-w-0 flex-1"
              />
              <AppIconButton
                type="button"
                aria-label={visible ? "Hide password" : "Show password"}
                onClick={() => setVisible((current) => !current)}
                className="shrink-0 rounded border border-[var(--border-soft)] bg-[var(--surface-primary)]"
              >
                {visible ? <EyeOff size={18} /> : <Eye size={18} />}
              </AppIconButton>
            </div>
          </Field>
          <Field label="Role">
            <AppSelect
              value={role}
              onValueChange={(nextRole) => setRole(nextRole as Role)}
              options={ROLE_OPTIONS}
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <AppButton type="button" variant="secondary" onClick={() => navigate("/admin/users")}>
              Cancel
            </AppButton>
            <AppButton type="submit" disabled={createUser.isPending}>
              <UserPlus size={16} />
              {createUser.isPending ? "Creating..." : "Create User"}
            </AppButton>
          </div>
        </form>
      </AppSurface>
    </AppPage>
  );
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-semibold text-[var(--text-secondary)]">{label}</span>
      {children}
    </label>
  );
}
