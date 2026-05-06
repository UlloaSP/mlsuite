import { useState } from "react";
import { AppButton, AppPanel, AppSelect, AppTextField } from "../../app/components";
import type { OrganizationRole, TeamDto } from "../types";

const defaultRole: OrganizationRole = "MEMBER";

export function InviteForm({
	teams,
	onSubmit,
	roleOptions = ["ADMIN", "MEMBER", "VIEWER"],
}: {
	teams: TeamDto[];
	onSubmit: (payload: { email: string; role: OrganizationRole; teamId?: number }) => Promise<void>;
	roleOptions?: OrganizationRole[];
}) {
	const [email, setEmail] = useState("");
	const [role, setRole] = useState<OrganizationRole>(defaultRole);
	const [teamId, setTeamId] = useState<string>("");

	return (
		<AppPanel className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_180px_180px_auto]">
			<AppTextField
				value={email}
				onChange={(event) => setEmail(event.target.value)}
				placeholder="teammate@company.com"
			/>
			<AppSelect value={role} onChange={(event) => setRole(event.target.value as OrganizationRole)}>
				{roleOptions.map((option) => (
					<option key={option} value={option}>
						{option}
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
			<AppButton
				type="button"
				onClick={async () => {
					await onSubmit({
						email,
						role,
						teamId: teamId ? Number(teamId) : undefined,
					});
					setEmail("");
					setRole(defaultRole);
					setTeamId("");
				}}
				disabled={!email.trim()}
			>
				Send Invite
			</AppButton>
		</AppPanel>
	);
}
