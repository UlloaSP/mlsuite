import { Building2, ChevronsUpDown } from "lucide-react";
import { motion } from "motion/react";
import { useAtomValue, useSetAtom } from "jotai";
import { useEffect } from "react";
import { useNavigate } from "react-router";
import { sidebarCollapsedAtom } from "../../app/atoms";
import { cx, FOCUS_RING } from "../../app/components";
import { syncCurrentOrganizationAtom } from "../atoms";
import { useSelectOrganization, useWorkspaceContext } from "../hooks";

export function WorkspaceSwitcher() {
	const navigate = useNavigate();
	const collapsed = useAtomValue(sidebarCollapsedAtom);
	const syncCurrentOrganization = useSetAtom(syncCurrentOrganizationAtom);
	const { data: context } = useWorkspaceContext();
	const selectOrganization = useSelectOrganization();

	useEffect(() => {
		syncCurrentOrganization(context?.currentOrganization.id ?? null);
	}, [context?.currentOrganization.id, syncCurrentOrganization]);

	if (!context) {
		return null;
	}

	return (
		<div className="mt-3">
			<label className="sr-only" htmlFor="workspace-switcher">
				Select organization
			</label>
			<div
				className={cx(
					"rounded-[24px] border border-[var(--border-soft)] bg-[var(--surface-secondary)] shadow-[var(--shadow-card)]",
					collapsed ? "p-2" : "p-3",
				)}
			>
				<div className="flex items-center gap-3">
					<div className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--accent-quiet)] text-[var(--accent-primary-strong)]">
						<Building2 size={18} />
					</div>
					{!collapsed ? (
						<div className="min-w-0 flex-1">
							<p className="truncate text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-[var(--text-secondary)]">
								Workspace
							</p>
							<p className="truncate text-sm font-semibold text-[var(--text-primary)]">
								{context.currentOrganization.name}
							</p>
						</div>
					) : null}
				</div>
				{!collapsed ? (
					<motion.div
						initial={{ opacity: 0, y: 6 }}
						animate={{ opacity: 1, y: 0 }}
						className="mt-3"
					>
						<div className="relative">
							<select
								id="workspace-switcher"
								className={cx(
									FOCUS_RING,
									"w-full appearance-none rounded-full border border-[var(--border-soft)] bg-[var(--surface-primary)] px-4 py-3 pr-10 text-sm text-[var(--text-primary)] shadow-[var(--shadow-card)]",
								)}
								value={context.currentOrganization.id}
								onChange={(event) => {
									const organizationId = Number(event.target.value);
									void selectOrganization.mutateAsync(organizationId).then(() => {
										void navigate("/workspace");
									});
								}}
								disabled={selectOrganization.isPending}
							>
								{context.organizations.map((organization) => (
									<option key={organization.id} value={organization.id}>
										{organization.name}
									</option>
								))}
							</select>
							<ChevronsUpDown
								size={16}
								className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
							/>
						</div>
						<button
							type="button"
							onClick={() =>
								navigate(`/workspace/organizations/${context.currentOrganization.id}`)
							}
							className="mt-2 text-sm font-medium text-[var(--accent-primary-strong)] transition hover:text-[var(--accent-primary)]"
						>
							Open workspace
						</button>
					</motion.div>
				) : null}
			</div>
		</div>
	);
}
