import { Activity, Clock3, ShieldEllipsis } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import {
	AppBadge,
	AppCopy,
	AppEyebrow,
	AppSectionTitle,
	AppToolbar,
} from "../../../app/components";
import { formatTimestamp } from "../formatters";

type Props = {
	streamConnected: boolean;
	lastUpdated: string | null;
	selectedService: string | null;
};

export function InfrastructureTopBar({
	streamConnected,
	lastUpdated,
	selectedService,
}: Props) {
	return (
		<AppToolbar className="sticky top-0 z-10 rounded-[28px] border-white/70 bg-[linear-gradient(135deg,_rgba(255,255,255,0.96),_rgba(255,247,244,0.92))] backdrop-blur">
			<div className="space-y-2">
				<AppEyebrow>Infrastructure</AppEyebrow>
				<div className="flex flex-wrap items-center gap-3">
					<AppSectionTitle className="text-[2rem] leading-none md:text-[2.35rem]">
						Control dashboard
					</AppSectionTitle>
					<AppBadge tone="accent">
						<ShieldEllipsis size={12} />
						superadmin
					</AppBadge>
				</div>
				<AppCopy className="max-w-3xl leading-6">
					Host telemetry, managed services, logs, and shell access in one operational view.
				</AppCopy>
			</div>
			<div className="flex flex-wrap items-center gap-3">
				<MetaChip
					icon={<Activity size={14} />}
					label="socket"
					value={streamConnected ? "live" : "reconnecting"}
					tone={streamConnected ? "success" : "warning"}
				/>
				<MetaChip
					icon={<Clock3 size={14} />}
					label="last update"
					value={lastUpdated ? formatTimestamp(lastUpdated) : "waiting"}
				/>
				{selectedService ? <MetaChip label="focus" value={selectedService} /> : null}
				<Link
					to="/admin/users"
					className="inline-flex items-center justify-center rounded-full border border-[var(--border-soft)] bg-[var(--surface-primary)] px-4 py-3 text-sm font-medium text-[var(--text-primary)] shadow-[var(--shadow-card)] transition hover:border-[var(--text-primary)] hover:bg-[var(--surface-muted)]"
				>
					User Admin
				</Link>
			</div>
		</AppToolbar>
	);
}

function MetaChip({
	icon,
	label,
	value,
	tone = "neutral",
}: {
	icon?: ReactNode;
	label: string;
	value: string;
	tone?: "neutral" | "accent" | "success" | "warning" | "danger";
}) {
	return (
		<div className="rounded-[22px] border border-[var(--border-soft)] bg-[var(--surface-primary)] px-4 py-3 shadow-[var(--shadow-card)]">
			<p className="flex items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
				{icon}
				{label}
			</p>
			<div className="mt-2">
				<AppBadge tone={tone}>{value}</AppBadge>
			</div>
		</div>
	);
}
