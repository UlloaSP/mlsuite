import { AppButton, AppCopy, AppPanel } from "../../app/components";
import { RoleBadge } from "./RoleBadge";
import type {
	MembershipStatus,
	OrganizationMembershipDto,
	OrganizationRole,
	TeamMembershipDto,
	TeamRole,
} from "../types";

type Row = OrganizationMembershipDto | TeamMembershipDto;
type Role = OrganizationRole | TeamRole;

export function MemberTable({
	rows,
	roles,
	onRoleChange,
	onRemove,
}: {
	rows: Row[];
	roles: Role[];
	onRoleChange: (membershipId: number, role: Role) => void;
	onRemove: (membershipId: number) => void;
}) {
	if (rows.length === 0) {
		return (
			<AppPanel className="border-dashed">
				<AppCopy>No members yet.</AppCopy>
			</AppPanel>
		);
	}

	return (
		<div className="space-y-3">
			{rows.map((row) => (
				<AppPanel key={row.id}>
					<div className="flex flex-wrap items-center justify-between gap-4">
						<div className="space-y-2">
							<p className="text-base font-semibold text-[var(--text-primary)]">{row.fullName}</p>
							<p className="text-sm text-[var(--text-secondary)]">{row.email}</p>
							<div className="flex flex-wrap gap-2">
								<RoleBadge value={row.role} />
								<RoleBadge value={row.status as MembershipStatus} />
							</div>
						</div>
						<div className="flex flex-wrap items-center gap-3">
							<select
								value={row.role}
								onChange={(event) => onRoleChange(row.id, event.target.value as Role)}
								className="rounded-full border border-[var(--border-soft)] bg-[var(--surface-primary)] px-4 py-3 text-sm text-[var(--text-primary)] shadow-[var(--shadow-card)]"
							>
								{roles.map((role) => (
									<option key={role} value={role}>
										{role.replaceAll("_", " ")}
									</option>
								))}
							</select>
							<AppButton type="button" variant="danger" onClick={() => onRemove(row.id)}>
								Remove
							</AppButton>
						</div>
					</div>
				</AppPanel>
			))}
		</div>
	);
}
