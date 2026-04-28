import { Building2 } from "lucide-react";
import { Link } from "react-router";
import { AppCopy, AppPanel, AppSectionTitle } from "../../app/components";
import { RoleBadge } from "./RoleBadge";
import type { OrganizationDto, OrganizationMembershipDto } from "../types";

export function OrganizationCard({
	organization,
	membership,
}: {
	organization: OrganizationDto;
	membership?: OrganizationMembershipDto;
}) {
	return (
		<Link to={`/workspace/organizations/${organization.id}`} className="block">
			<AppPanel className="h-full transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-hover)]">
				<div className="flex items-start justify-between gap-4">
					<div className="space-y-3">
						<div className="grid size-12 place-items-center rounded-full bg-[var(--accent-quiet)] text-[var(--accent-primary-strong)]">
							<Building2 size={20} />
						</div>
						<div className="space-y-1">
							<AppSectionTitle>{organization.name}</AppSectionTitle>
							<AppCopy className="line-clamp-2">
								{organization.description || "Workspace ready for models, plugins, and team coordination."}
							</AppCopy>
						</div>
					</div>
					{membership ? <RoleBadge value={membership.role} /> : null}
				</div>
			</AppPanel>
		</Link>
	);
}
