import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import { useState } from "react";
import { useParams } from "react-router";
import {
	AppButton,
	AppPage,
	AppPageHeader,
	AppSurface,
	AppTextArea,
	AppTextField,
} from "../../app/components";
import { createTeam, getTeams } from "../api/workspaceService";
import { TeamCard } from "../components/TeamCard";

export function TeamsPage() {
	const { organizationId = "" } = useParams();
	const qc = useQueryClient();
	const id = Number(organizationId);
	const { data: teams = [] } = useQuery({
		queryKey: ["teams", id],
		queryFn: () => getTeams(id),
		enabled: Boolean(id),
	});
	const [name, setName] = useState("");
	const [slug, setSlug] = useState("");
	const [description, setDescription] = useState("");

	async function submit() {
		await createTeam(id, { name, slug, description });
		setName("");
		setSlug("");
		setDescription("");
		await Promise.all([
			qc.invalidateQueries({ queryKey: ["teams", id] }),
			qc.invalidateQueries({ queryKey: ["workspaceContext"] }),
		]);
	}

	return (
		<AppPage>
			<motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="flex flex-1">
				<AppSurface className="flex flex-1 flex-col gap-6 overflow-auto">
					<AppPageHeader
						eyebrow="Workspace"
						title="Teams"
						description="Create focused teams inside the current organization for scoped collaboration and access."
						backHref={`/workspace/organizations/${id}`}
					/>
					<div className="grid gap-4 xl:grid-cols-[1.25fr_0.9fr]">
						<div className="grid gap-4 md:grid-cols-2">
							{teams.map((team) => (
								<TeamCard key={team.id} team={team} />
							))}
						</div>
						<div className="rounded-[24px] border border-[var(--border-soft)] bg-[var(--surface-secondary)] p-5 shadow-[var(--shadow-card)]">
							<div className="grid gap-3">
								<AppTextField value={name} onChange={(event) => setName(event.target.value)} placeholder="Research Ops" />
								<AppTextField value={slug} onChange={(event) => setSlug(event.target.value)} placeholder="research-ops" />
								<AppTextArea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Team mission and scope" />
								<AppButton type="button" onClick={() => void submit()} disabled={!name.trim()}>
									Create Team
								</AppButton>
							</div>
						</div>
					</div>
				</AppSurface>
			</motion.div>
		</AppPage>
	);
}
