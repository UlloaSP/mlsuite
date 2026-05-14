import { X } from "lucide-react";
import { AppButton, AppCopy, AppIconButton, AppPanel, AppSectionTitle } from "../../app/components";
import { InviteForm } from "./InviteForm";
import type { RoleDefinitionDto, TeamDto } from "../types";

export function InviteDialog({
	teams,
	roleOptions,
	onClose,
	onSubmit,
}: {
	teams: TeamDto[];
	roleOptions: RoleDefinitionDto[];
	onClose: () => void;
	onSubmit: (payload: { email: string; roleDefinitionId: number; teamId?: number }) => Promise<void>;
}) {
	return (
		<div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/35 p-4">
			<AppPanel className="w-full max-w-[560px] rounded-[24px] bg-[var(--surface-primary)] p-0">
				<div className="flex items-start justify-between gap-4 border-b border-[var(--border-soft)] px-5 py-4">
					<div className="min-w-0">
						<AppSectionTitle>Create Invitation</AppSectionTitle>
						<AppCopy className="mt-1 leading-6">Send workspace access with a starting role.</AppCopy>
					</div>
					<AppIconButton type="button" aria-label="Close invitation dialog" onClick={onClose}>
						<X size={18} />
					</AppIconButton>
				</div>
				<div className="max-h-[calc(100vh-12rem)] overflow-y-auto p-5">
					{roleOptions.length > 0 ? (
						<InviteForm teams={teams} roleOptions={roleOptions} onSubmit={onSubmit} />
					) : (
						<div className="space-y-4">
							<AppCopy>No assignable roles available.</AppCopy>
							<AppButton type="button" variant="secondary" onClick={onClose}>Close</AppButton>
						</div>
					)}
				</div>
			</AppPanel>
		</div>
	);
}
