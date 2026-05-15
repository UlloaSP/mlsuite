import { useLayoutEffect, useState, type RefObject } from "react";

type SectionRefs = {
	open: boolean;
	count: number;
	sectionRef: RefObject<HTMLElement | null>;
	headerRef: RefObject<HTMLElement | null>;
	listRef: RefObject<HTMLElement | null>;
};

type UseReviewTrayLayoutParams = {
	bodyRef: RefObject<HTMLElement | null>;
	revision: SectionRefs;
	pending: SectionRefs;
};

type ReviewTrayListHeights = {
	revision: number;
	pending: number;
};

const visibleListHeight = (section: SectionRefs) =>
	section.open && section.count > 0 ? (section.listRef.current?.scrollHeight ?? 0) : 0;

const sectionChromeHeight = (section: SectionRefs) => {
	const element = section.sectionRef.current;
	const header = section.headerRef.current;
	if (!element || !header) return 0;
	const styles = window.getComputedStyle(element);
	return header.offsetHeight
		+ Number.parseFloat(styles.paddingTop || "0")
		+ Number.parseFloat(styles.paddingBottom || "0")
		+ Number.parseFloat(styles.borderTopWidth || "0")
		+ Number.parseFloat(styles.borderBottomWidth || "0");
};

const splitHeights = (available: number, revisionNatural: number, pendingNatural: number): ReviewTrayListHeights => {
	if (revisionNatural + pendingNatural <= available) {
		return { revision: revisionNatural, pending: pendingNatural };
	}
	if (revisionNatural === 0) {
		return { revision: 0, pending: available };
	}
	if (pendingNatural === 0) {
		return { revision: available, pending: 0 };
	}
	const half = available / 2;
	if (revisionNatural <= half) {
		return { revision: revisionNatural, pending: available - revisionNatural };
	}
	if (pendingNatural <= half) {
		return { revision: available - pendingNatural, pending: pendingNatural };
	}
	return { revision: half, pending: available - half };
};

export function useReviewTrayLayout({
	bodyRef,
	revision,
	pending,
}: UseReviewTrayLayoutParams): ReviewTrayListHeights {
	const [heights, setHeights] = useState<ReviewTrayListHeights>({ revision: 0, pending: 0 });

	useLayoutEffect(() => {
		const body = bodyRef.current;
		if (!body) return;

		let frame = 0;
		const measure = () => {
			const styles = window.getComputedStyle(body);
			const gap = Number.parseFloat(styles.rowGap || "0");
			const available = Math.max(
				0,
				body.clientHeight - gap - sectionChromeHeight(revision) - sectionChromeHeight(pending),
			);
			const next = splitHeights(available, visibleListHeight(revision), visibleListHeight(pending));
			setHeights((current) =>
				Math.abs(current.revision - next.revision) < 1 && Math.abs(current.pending - next.pending) < 1
					? current
					: next,
			);
		};
		const schedule = () => {
			window.cancelAnimationFrame(frame);
			frame = window.requestAnimationFrame(measure);
		};
		const observer = new ResizeObserver(schedule);
		for (const element of [
			body,
			revision.sectionRef.current,
			revision.headerRef.current,
			revision.listRef.current,
			pending.sectionRef.current,
			pending.headerRef.current,
			pending.listRef.current,
		]) {
			if (element) observer.observe(element);
		}
		schedule();
		window.addEventListener("resize", schedule);
		return () => {
			window.cancelAnimationFrame(frame);
			window.removeEventListener("resize", schedule);
			observer.disconnect();
		};
	}, [bodyRef, pending, revision]);

	return heights;
}
