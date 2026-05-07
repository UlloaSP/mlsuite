import { Cpu, HardDrive, ServerCog } from "lucide-react";
import type { ReactNode } from "react";
import {
	AppBadge,
	AppPanel,
	AppSelect,
	cx,
} from "../../../app/components";
import { formatBytes, formatPercent } from "../formatters";
import { labelForServiceHealth, toneForServiceStatus } from "../status";
import type { ServiceStatusDto } from "../types";

type Props = {
	services: ServiceStatusDto[];
	selectedService: string | null;
	onSelect: (serviceName: string) => void;
};

export function ServiceFocusBar({ services, selectedService, onSelect }: Props) {
	const selected = services.find((service) => service.name === selectedService) ?? null;

	return (
		<AppPanel className="rounded-[18px] p-4">
			<div className="grid gap-4 xl:grid-cols-[minmax(240px,340px)_1fr] xl:items-center">
				<label className="grid gap-2">
					<span className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
						service focus
					</span>
					<AppSelect
						value={selectedService ?? ""}
						onChange={(event) => onSelect(event.target.value)}
						className="w-full rounded-[12px]"
					>
						<option value="" disabled>
							Select service
						</option>
						{services.map((service) => (
							<option key={service.name} value={service.name}>
								{service.name}
							</option>
						))}
					</AppSelect>
				</label>
				{selected ? (
					<div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-5">
						<FocusFact
							label="state"
							value={selected.status}
							badgeTone={toneForServiceStatus(selected.status)}
						/>
						<FocusFact label="health" value={labelForServiceHealth(selected.health)} />
						<FocusFact label="uptime" value={selected.uptime ?? "n/a"} />
						<FocusFact label="cpu" value={formatPercent(selected.cpuPercent)} icon={<Cpu size={14} />} />
						<FocusFact label="memory" value={formatBytes(selected.memoryBytes)} icon={<HardDrive size={14} />} />
						<div className="min-w-0 md:col-span-2 2xl:col-span-5">
							<p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
								container / ports
							</p>
							<p className="mt-2 truncate text-sm font-medium text-[var(--text-primary)]">
								{selected.containerName ?? "container missing"}
							</p>
							<p className="mt-1 truncate text-xs text-[var(--text-secondary)]">
								{selected.ports.length ? selected.ports.join(", ") : "no published ports"}
							</p>
						</div>
					</div>
				) : (
					<div className="flex items-center gap-3 rounded-[14px] border border-dashed border-[var(--border-soft)] px-4 py-5 text-sm text-[var(--text-secondary)]">
						<ServerCog size={16} />
						No service selected.
					</div>
				)}
			</div>
		</AppPanel>
	);
}

function FocusFact({
	label,
	value,
	icon,
	badgeTone,
}: {
	label: string;
	value: string;
	icon?: ReactNode;
	badgeTone?: "neutral" | "accent" | "success" | "warning" | "danger";
}) {
	return (
		<div className="min-w-0 rounded-[14px] border border-[var(--border-soft)] bg-[var(--surface-primary)] px-4 py-3">
			<p className="flex items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
				{icon}
				{label}
			</p>
			{badgeTone ? (
				<div className="mt-2">
					<AppBadge tone={badgeTone}>{value}</AppBadge>
				</div>
			) : (
				<p className={cx("mt-2 truncate text-sm font-semibold text-[var(--text-primary)]")}>
					{value}
				</p>
			)}
		</div>
	);
}
