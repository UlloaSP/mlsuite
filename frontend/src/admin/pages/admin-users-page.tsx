import { KeyRound, Plus, ShieldCheck } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import { Navigate } from "react-router";
import {
	AppBadge,
	AppButton,
	AppPage,
	AppPageHeader,
	AppPanel,
	AppSelect,
	AppSurface,
	AppTextField,
} from "../../app/components";
import { useUser } from "../../user/hooks";
import {
	useAdminUsers,
	useCreateAdminUser,
	useResetAdminUserPassword,
	useUpdateAdminUser,
} from "../hooks";

type Role = "USER" | "SUPERADMIN";

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

	if (user?.systemRole !== "SUPERADMIN") {
		return <Navigate to="/workspace" replace />;
	}

	const submit = (event: FormEvent) => {
		event.preventDefault();
		createUser.mutate(
			{ email, fullName, password, systemRole: role },
			{ onSuccess: () => {
				setEmail("");
				setFullName("");
				setPassword("");
				setRole("USER");
			} },
		);
	};

	return (
		<AppPage>
			<AppSurface className="flex flex-1 flex-col gap-6 overflow-auto app-scroll">
				<AppPageHeader
					eyebrow="Admin"
					title="Users"
					description="Create accounts, set global access, and reset passwords."
					aside={<AppBadge tone="accent"><ShieldCheck size={13} />SUPERADMIN</AppBadge>}
				/>
				<AppPanel>
					<form onSubmit={submit} className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_auto_auto]">
						<AppTextField required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
						<AppTextField required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name" />
						<AppTextField required type="password" minLength={10} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
						<AppSelect value={role} onChange={(e) => setRole(e.target.value as Role)}>
							<option value="USER">USER</option>
							<option value="SUPERADMIN">SUPERADMIN</option>
						</AppSelect>
						<AppButton type="submit" disabled={createUser.isPending}><Plus size={16} />Create</AppButton>
					</form>
				</AppPanel>
				<AppPanel className="overflow-auto">
					<table className="w-full min-w-[820px] text-left text-sm">
						<thead className="text-xs uppercase tracking-[0.14em] text-[var(--text-secondary)]">
							<tr>
								<th className="px-3 py-3">User</th>
								<th className="px-3 py-3">Role</th>
								<th className="px-3 py-3">Enabled</th>
								<th className="px-3 py-3">Password</th>
							</tr>
						</thead>
						<tbody>
							{isLoading ? (
								<tr><td className="px-3 py-5 text-[var(--text-secondary)]" colSpan={4}>Loading...</td></tr>
							) : users.map((row) => (
								<tr key={row.id} className="border-t border-[var(--border-soft)]">
									<td className="px-3 py-4">
										<p className="font-semibold text-[var(--text-primary)]">{row.fullName}</p>
										<p className="text-xs text-[var(--text-secondary)]">{row.email}</p>
									</td>
									<td className="px-3 py-4">
										<AppSelect
											value={row.systemRole}
											onChange={(e) => updateUser.mutate({ id: row.id, payload: { systemRole: e.target.value as Role } })}
										>
											<option value="USER">USER</option>
											<option value="SUPERADMIN">SUPERADMIN</option>
										</AppSelect>
									</td>
									<td className="px-3 py-4">
										<input
											type="checkbox"
											checked={row.enabled}
											onChange={(e) => updateUser.mutate({ id: row.id, payload: { enabled: e.target.checked } })}
											className="size-5 accent-[var(--accent-primary)]"
										/>
									</td>
									<td className="px-3 py-4">
										<AppButton
											type="button"
											variant="secondary"
											onClick={() => {
												const next = window.prompt("New password");
												if (next) resetPassword.mutate({ id: row.id, password: next });
											}}
										>
											<KeyRound size={15} />Reset
										</AppButton>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</AppPanel>
			</AppSurface>
		</AppPage>
	);
}
