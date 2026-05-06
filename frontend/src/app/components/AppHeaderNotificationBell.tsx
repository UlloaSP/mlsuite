import { Bell, Building2, Check, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
	useAcceptInvitation,
	useDeclineInvitation,
	usePendingInvitations,
} from "../../workspace/hooks";
import type { InvitationDto } from "../../workspace/types";
import { AppPanel, cx, FOCUS_RING } from "./ui";

function InvitationItem({ invitation }: { invitation: InvitationDto }) {
	const accept = useAcceptInvitation();
	const decline = useDeclineInvitation();
	const busy = accept.isPending || decline.isPending;

	return (
		<div className="flex items-start gap-3 rounded-[18px] p-3 transition hover:bg-[var(--surface-muted)]">
			<div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent-quiet)]">
				<Building2 size={16} className="text-[var(--accent-primary)]" />
			</div>
			<div className="min-w-0 flex-1">
				<p className="text-sm font-semibold text-[var(--text-primary)]">
					{invitation.organizationName}
				</p>
				<p className="text-xs text-[var(--text-secondary)]">
					Invited as {invitation.role.toLowerCase()}
				</p>
				<div className="mt-2 flex gap-2">
					<button
						type="button"
						disabled={busy}
						onClick={() => accept.mutate(invitation.token)}
						className={cx(
							FOCUS_RING,
							"inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-primary)] px-3 py-1 text-xs font-medium text-[var(--text-inverse)] transition hover:bg-[var(--accent-primary-strong)] disabled:opacity-50",
						)}
					>
						<Check size={12} />
						Accept
					</button>
					<button
						type="button"
						disabled={busy}
						onClick={() => decline.mutate(invitation.token)}
						className={cx(
							FOCUS_RING,
							"inline-flex items-center gap-1.5 rounded-full border border-[var(--border-soft)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)] transition hover:bg-[var(--surface-muted)] disabled:opacity-50",
						)}
					>
						<X size={12} />
						Decline
					</button>
				</div>
			</div>
		</div>
	);
}

export function AppHeaderNotificationBell() {
	const ref = useRef<HTMLDivElement | null>(null);
	const [open, setOpen] = useState(false);
	const { data: invitations = [] } = usePendingInvitations();
	const count = invitations.length;

	useEffect(() => {
		const onPointer = (event: PointerEvent) => {
			if (!ref.current?.contains(event.target as Node)) {
				setOpen(false);
			}
		};
		window.addEventListener("pointerdown", onPointer);
		return () => window.removeEventListener("pointerdown", onPointer);
	}, []);

	return (
		<div ref={ref} className="relative">
			<button
				type="button"
				onClick={() => setOpen((v) => !v)}
				className={cx(
					FOCUS_RING,
					"relative inline-flex size-10 items-center justify-center rounded-full border border-[var(--border-soft)] bg-[var(--surface-primary)] shadow-[var(--shadow-card)] transition hover:bg-[var(--surface-muted)]",
				)}
			>
				<Bell size={18} className="text-[var(--text-secondary)]" />
				{count > 0 && (
					<span className="absolute -right-0.5 -top-0.5 flex size-5 items-center justify-center rounded-full bg-[var(--accent-primary)] text-[10px] font-bold text-[var(--text-inverse)]">
						{count > 9 ? "9+" : count}
					</span>
				)}
			</button>
			{open && (
				<AppPanel className="absolute right-0 top-[calc(100%+0.75rem)] z-30 w-[340px] p-3">
					<p className="px-3 pb-2 text-sm font-semibold text-[var(--text-primary)]">
						Notifications
					</p>
					{count === 0 ? (
						<p className="px-3 py-6 text-center text-sm text-[var(--text-muted)]">
							No pending notifications
						</p>
					) : (
						<div className="max-h-[360px] space-y-1 overflow-y-auto">
							{invitations.map((inv) => (
								<InvitationItem key={inv.id} invitation={inv} />
							))}
						</div>
					)}
				</AppPanel>
			)}
		</div>
	);
}
