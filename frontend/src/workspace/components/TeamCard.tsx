import { Link } from "react-router";
import { AppCopy, AppPanel, AppSectionTitle } from "../../app/components";
import type { TeamDto } from "../types";

export function TeamCard({ team }: { team: TeamDto }) {
	return (
		<Link to={`/workspace/teams/${team.id}`} className="block">
			<AppPanel className="h-full transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-hover)]">
				<div className="space-y-3">
					<p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[var(--text-secondary)]">
						Team
					</p>
					<AppSectionTitle>{team.name}</AppSectionTitle>
					<AppCopy>
						{team.description || "Focused group for scoped collaboration inside this workspace."}
					</AppCopy>
				</div>
			</AppPanel>
		</Link>
	);
}
