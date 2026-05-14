import { useEffect, useState } from "react";
import { AppButton, AppSelect, AppTextField } from "../../app/components";
import type { RoleDefinitionDto, TeamDto } from "../types";

const defaultRoleId = (roles: RoleDefinitionDto[]) =>
	roles.find((role) => role.systemKey === "MEMBER")?.id ?? roles[0]?.id ?? null;

export function InviteForm({
	teams,
	onSubmit,
	roleOptions,
}: {
	teams: TeamDto[];
	onSubmit: (payload: { email: string; roleDefinitionId: number; teamId?: number }) => Promise<void>;
	roleOptions: RoleDefinitionDto[];
}) {
	const [email, setEmail] = useState("");
	const [roleDefinitionId, setRoleDefinitionId] = useState<string>("");
	const [teamId, setTeamId] = useState<string>("");
	const selectedRoleId = roleDefinitionId ? Number(roleDefinitionId) : defaultRoleId(roleOptions);
	const canSubmit = Boolean(email.trim() && selectedRoleId);
	const submit = () => {
		if (!canSubmit || !selectedRoleId) return;
		void onSubmit({
			email,
			roleDefinitionId: selectedRoleId,
			teamId: teamId ? Number(teamId) : undefined,
		}).then(() => {
			setEmail("");
			setRoleDefinitionId(String(defaultRoleId(roleOptions) ?? ""));
			setTeamId("");
		});
	};

	useEffect(() => {
		const nextDefault = defaultRoleId(roleOptions);
		if (nextDefault && !roleOptions.some((role) => String(role.id) === roleDefinitionId)) {
			setRoleDefinitionId(String(nextDefault));
		}
	}, [roleDefinitionId, roleOptions]);

	return (
		<div className="grid gap-4">
			<AppTextField
				value={email}
				onChange={(event) => setEmail(event.target.value)}
				placeholder="teammate@company.com"
				type="email"
			/>
			<div className="grid gap-3 sm:grid-cols-2">
				<AppSelect
					value={selectedRoleId ? String(selectedRoleId) : ""}
					onChange={(event) => setRoleDefinitionId(event.target.value)}
					disabled={roleOptions.length === 0}
				>
					{roleOptions.map((option) => (
						<option key={option.id} value={option.id}>
							{option.name}
						</option>
					))}
				</AppSelect>
				<AppSelect value={teamId} onChange={(event) => setTeamId(event.target.value)}>
					<option value="">No team</option>
					{teams.map((team) => (
						<option key={team.id} value={team.id}>
							{team.name}
						</option>
					))}
				</AppSelect>
			</div>
			<AppButton type="button" className="w-full sm:w-auto sm:justify-self-end" disabled={!canSubmit} onClick={submit}>
				Send Invite
			</AppButton>
		</div>
	);
}
