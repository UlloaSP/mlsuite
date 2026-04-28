import { BrainCircuit } from "lucide-react";
import { Link } from "react-router";

export function AppHeaderBrand() {
	return (
		<Link
			to="/workspace"
			className="inline-flex items-center gap-3 rounded-full border border-[var(--border-soft)] bg-[var(--surface-primary)] px-4 py-2 shadow-[var(--shadow-card)]"
		>
			<div className="grid size-9 place-items-center rounded-full bg-[var(--text-primary)] text-[var(--text-inverse)]">
				<BrainCircuit size={18} />
			</div>
			<div>
				<p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-secondary)]">
					MLSuite
				</p>
				<p className="text-sm font-semibold text-[var(--text-primary)]">Workspace AI</p>
			</div>
		</Link>
	);
}
