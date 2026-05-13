import { m as motion } from "motion/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { useState } from "react";
import { AppButton, AppPage, AppPageHeader, AppSurface, AppTextArea, AppTextField } from "../../app/components";
import { OrganizationCard } from "../components/OrganizationCard";
import { getOrganizations, createOrganization } from "../api/workspaceService";
import { useWorkspaceContext } from "../hooks";

export function OrganizationsPage() {
	const navigate = useNavigate();
	const qc = useQueryClient();
	const { data: context } = useWorkspaceContext();
	const { data: organizations = [] } = useQuery({
		queryKey: ["organizations"],
		queryFn: getOrganizations,
	});
	const memberships = context?.memberships ?? [];
	const [name, setName] = useState("");
	const [slug, setSlug] = useState("");
	const [description, setDescription] = useState("");

	async function submit() {
		const organization = await createOrganization({ name, slug, description });
		await Promise.all([
			qc.invalidateQueries({ queryKey: ["organizations"] }),
			qc.invalidateQueries({ queryKey: ["workspaceContext"] }),
		]);
		void navigate(`/workspace/organizations/${organization.id}`);
	}

	return (
		<AppPage>
			<motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="flex flex-1">
				<AppSurface className="flex flex-1 flex-col gap-6 overflow-auto">
					<AppPageHeader
						eyebrow="Workspace"
						title="Organizations"
						description="Choose the organization you want to operate in, or spin up a new workspace."
						aside={<AppButton type="button" onClick={() => navigate("/workspace/organizations/create")}>New Org</AppButton>}
					/>
					<section className="grid gap-4 xl:grid-cols-[1.4fr_0.9fr]">
						<div className="grid gap-4 md:grid-cols-2">
							{organizations.map((organization) => (
								<OrganizationCard
									key={organization.id}
									organization={organization}
									membership={memberships.find((item) => item.organizationId === organization.id)}
								/>
							))}
						</div>
						<div className="rounded-[24px] border border-[var(--border-soft)] bg-[var(--surface-secondary)] p-5 shadow-[var(--shadow-card)]">
							<div className="space-y-3">
								<p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[var(--text-secondary)]">
									Quick Create
								</p>
								<AppTextField value={name} onChange={(event) => setName(event.target.value)} placeholder="Northwind AI" />
								<AppTextField value={slug} onChange={(event) => setSlug(event.target.value)} placeholder="northwind-ai" />
								<AppTextArea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Short organization summary" />
								<AppButton type="button" onClick={() => void submit()} disabled={!name.trim()}>
									Create Workspace
								</AppButton>
							</div>
						</div>
					</section>
				</AppSurface>
			</motion.div>
		</AppPage>
	);
}
