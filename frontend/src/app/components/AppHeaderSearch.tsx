import { Search, Slash } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { SearchResultsPanel } from "../../search/components/SearchResultsPanel";
import { useDebouncedValue, useSearchResults } from "../../search/hooks";

const isTypingTarget = (target: EventTarget | null) =>
	target instanceof HTMLElement &&
		(target.tagName === "INPUT" ||
			target.tagName === "TEXTAREA" ||
			target.tagName === "SELECT" ||
			target.isContentEditable);

export function AppHeaderSearch() {
	const navigate = useNavigate();
	const ref = useRef<HTMLDivElement | null>(null);
	const inputRef = useRef<HTMLInputElement | null>(null);
	const [query, setQuery] = useState("");
	const [open, setOpen] = useState(false);
	const [activeIndex, setActiveIndex] = useState(0);
	const debouncedQuery = useDebouncedValue(query);
	const { data, isFetching } = useSearchResults(debouncedQuery);

	const flatResults = useMemo(
		() => (data?.groups ?? []).flatMap((group) => group.results),
		[data?.groups],
	);

	useEffect(() => {
		const onPointer = (event: PointerEvent) => {
			if (!ref.current?.contains(event.target as Node)) {
				setOpen(false);
			}
		};
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "/" && !isTypingTarget(event.target)) {
				event.preventDefault();
				inputRef.current?.focus();
				setOpen(true);
			}
			if (event.key === "Escape") {
				setOpen(false);
			}
		};
		window.addEventListener("pointerdown", onPointer);
		window.addEventListener("keydown", onKeyDown);
		return () => {
			window.removeEventListener("pointerdown", onPointer);
			window.removeEventListener("keydown", onKeyDown);
		};
	}, []);

	useEffect(() => {
		setActiveIndex(0);
	}, [debouncedQuery, data?.groups]);

	const showPanel = open && (query.trim().length >= 2 || isFetching);

	return (
		<div ref={ref} className="relative w-full max-w-2xl">
			<label className="sr-only" htmlFor="global-search">
				Global search
			</label>
			<div className="flex items-center gap-3 rounded-full border border-[var(--border-soft)] bg-[var(--surface-primary)] px-4 py-3 shadow-[var(--shadow-card)]">
				<Search size={16} className="text-[var(--text-muted)]" />
				<input
					ref={inputRef}
					id="global-search"
					value={query}
					onFocus={() => setOpen(true)}
					onChange={(event) => {
						setQuery(event.target.value);
						setOpen(true);
					}}
					onKeyDown={(event) => {
						if (!flatResults.length) {
							return;
						}
						if (event.key === "ArrowDown") {
							event.preventDefault();
							setActiveIndex((value) => Math.min(value + 1, flatResults.length - 1));
						}
						if (event.key === "ArrowUp") {
							event.preventDefault();
							setActiveIndex((value) => Math.max(value - 1, 0));
						}
						if (event.key === "Enter") {
							event.preventDefault();
							const result = flatResults[activeIndex];
							if (result) {
								setOpen(false);
								void navigate(result.href);
							}
						}
					}}
					placeholder="Search models, teams, plugins, schemas..."
					className="w-full bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
				/>
				<div className="hidden items-center gap-1 rounded-full border border-[var(--border-soft)] px-2 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)] md:inline-flex">
					<Slash size={12} />
					Search
				</div>
			</div>
			{showPanel ? (
				<SearchResultsPanel
					groups={data?.groups ?? []}
					activeIndex={activeIndex}
					onHover={setActiveIndex}
					onSelect={() => setOpen(false)}
					loading={isFetching}
				/>
			) : null}
		</div>
	);
}
