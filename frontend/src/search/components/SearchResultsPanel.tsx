import { AppPanel, AppCopy } from "../../app/components";
import { SearchResultGroup } from "./SearchResultGroup";
import type { SearchGroupDto } from "../types";

export function SearchResultsPanel({
	groups,
	activeIndex,
	onHover,
	onSelect,
	loading,
}: {
	groups: SearchGroupDto[];
	activeIndex: number;
	onHover: (index: number) => void;
	onSelect: () => void;
	loading: boolean;
}) {
	let offset = 0;

	return (
		<AppPanel className="absolute left-0 right-0 top-[calc(100%+0.75rem)] z-30 max-h-[28rem] overflow-y-auto p-3">
			{loading ? (
				<AppCopy className="px-2 py-3">Searching workspace…</AppCopy>
			) : groups.length === 0 ? (
				<AppCopy className="px-2 py-3">No results.</AppCopy>
			) : (
				<div className="space-y-4">
					{groups.map((group) => {
						const groupOffset = offset;
						offset += group.results.length;
						return (
							<SearchResultGroup
								key={group.label}
								group={group}
								activeIndex={activeIndex}
								offset={groupOffset}
								onHover={onHover}
								onSelect={onSelect}
							/>
						);
					})}
				</div>
			)}
		</AppPanel>
	);
}
