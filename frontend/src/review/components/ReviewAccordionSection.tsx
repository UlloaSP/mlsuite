import { ChevronDown, ChevronUp } from "lucide-react";
import type { ReactNode } from "react";

type ReviewAccordionSectionProps = {
	title: string;
	open: boolean;
	onToggle: () => void;
	children: ReactNode;
};

export function ReviewAccordionSection({
	title,
	open,
	onToggle,
	children,
}: ReviewAccordionSectionProps) {
	return (
		<section className="border border-[var(--border-strong)] bg-[var(--surface-primary)]">
			<button type="button" onClick={onToggle} className="flex w-full items-center justify-between p-4 text-left">
				<h3 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h3>
				{open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
			</button>
			{open ? <div className="border-t border-[var(--border-soft)] p-4">{children}</div> : null}
		</section>
	);
}
