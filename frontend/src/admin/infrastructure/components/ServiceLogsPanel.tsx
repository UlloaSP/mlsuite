import { FileText, ScrollText } from "lucide-react";
import { AppBadge, AppPanel, AppSectionTitle } from "../../../app/components";

type Props = {
	serviceName: string | null;
	lines: string[];
	streamConnected: boolean;
};

export function ServiceLogsPanel({ serviceName, lines, streamConnected }: Props) {
	return (
		<AppPanel className="grid h-[520px] max-h-[520px] min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-[20px] border-white/70 bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(247,246,245,0.94))] p-0">
			<div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--border-soft)] px-6 pb-5 pt-6">
				<div>
					<p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
						service logs
					</p>
					<AppSectionTitle className="mt-2 text-[1.45rem]">Tail workspace</AppSectionTitle>
					<p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
						{serviceName ? `Following ${serviceName}` : "Select a service row to follow its live output."}
					</p>
				</div>
				<div className="flex flex-wrap gap-2">
					<AppBadge tone={streamConnected ? "success" : "warning"}>
						<ScrollText size={13} />
						{streamConnected ? "tailing" : "snapshot mode"}
					</AppBadge>
					{serviceName ? (
						<AppBadge tone="accent">
							<FileText size={13} />
							{serviceName}
						</AppBadge>
					) : null}
				</div>
			</div>
			<div className="min-h-0 overflow-hidden bg-[linear-gradient(180deg,_#140d11,_#090709)] p-4">
				<pre className="app-scroll size-full overflow-auto whitespace-pre-wrap rounded-[14px] border border-white/10 bg-black/30 p-5 font-mono text-xs leading-6 text-[#ffd8e0] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
					{lines.length ? lines.join("\n") : "No log lines yet."}
				</pre>
			</div>
		</AppPanel>
	);
}
