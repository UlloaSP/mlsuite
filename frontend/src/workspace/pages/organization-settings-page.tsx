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
import { getOrganization, updateOrganization } from "../api/workspaceService";

export function OrganizationSettingsPage() {
	const { organizationId = "" } = useParams();
	const qc = useQueryClient();
	const id = Number(organizationId);
	const { data: organization } = useQuery({
		queryKey: ["organization", id],
		queryFn: () => getOrganization(id),
		enabled: Boolean(id),
	});
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");

	const effectiveName = name || organization?.name || "";
	const effectiveDescription = description || organization?.description || "";

	async function submit() {
		await updateOrganization(id, {
			name: effectiveName,
			description: effectiveDescription,
		});
		await Promise.all([
			qc.invalidateQueries({ queryKey: ["organization", id] }),
			qc.invalidateQueries({ queryKey: ["organizations"] }),
			qc.invalidateQueries({ queryKey: ["workspaceContext"] }),
		]);
	}

	if (!organization) {
		return null;
	}

	return (
		<AppPage>
			<motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="flex flex-1">
				<AppSurface className="flex flex-1 flex-col gap-6 overflow-auto">
					<AppPageHeader
						eyebrow="Workspace Settings"
						title={organization.name}
						description="Edit the identity of this organization. Ownership and member operations live in adjacent workspace views."
						backHref="/workspace/organizations"
					/>
					<div className="max-w-3xl rounded-[32px] border border-[var(--border-soft)] bg-[var(--surface-secondary)] p-6 shadow-[var(--shadow-card)]">
						<div className="grid gap-4">
							<AppTextField value={effectiveName} onChange={(event) => setName(event.target.value)} />
							<AppTextArea value={effectiveDescription} onChange={(event) => setDescription(event.target.value)} />
							<AppButton type="button" onClick={() => void submit()}>
								Save Workspace
							</AppButton>
						</div>
					</div>
				</AppSurface>
			</motion.div>
		</AppPage>
	);
}
