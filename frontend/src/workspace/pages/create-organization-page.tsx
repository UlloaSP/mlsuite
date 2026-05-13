import { useQueryClient } from "@tanstack/react-query";
import { m as motion } from "motion/react";
import { useState } from "react";
import { useNavigate } from "react-router";
import {
	AppButton,
	AppPage,
	AppPageHeader,
	AppSurface,
	AppTextArea,
	AppTextField,
} from "../../app/components";
import { createOrganization } from "../api/workspaceService";

export function CreateOrganizationPage() {
	const navigate = useNavigate();
	const qc = useQueryClient();
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
				<AppSurface className="flex flex-1 justify-center overflow-auto">
					<div className="w-full max-w-3xl rounded-[32px] border border-[var(--border-soft)] bg-[var(--surface-secondary)] p-6 shadow-[var(--shadow-card)]">
						<AppPageHeader
							eyebrow="Workspace"
							title="Create Organization"
							description="Start a new org-scoped home for models, plugins, memberships, and invitations."
							backHref="/workspace/organizations"
						/>
						<div className="mt-6 grid gap-4">
							<AppTextField value={name} onChange={(event) => setName(event.target.value)} placeholder="Northwind AI" />
							<AppTextField value={slug} onChange={(event) => setSlug(event.target.value)} placeholder="northwind-ai" />
							<AppTextArea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What makes this workspace distinct?" />
							<AppButton type="button" onClick={() => void submit()} disabled={!name.trim()}>
								Create Workspace
							</AppButton>
						</div>
					</div>
				</AppSurface>
			</motion.div>
		</AppPage>
	);
}
