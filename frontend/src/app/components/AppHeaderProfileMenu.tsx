import { ChevronDown, LogOut, User2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { useLogout, useUser } from "../../user/hooks";
import { AppPanel, cx, FOCUS_RING } from "./ui";

export function AppHeaderProfileMenu() {
	const ref = useRef<HTMLDivElement | null>(null);
	const { data: user } = useUser();
	const { mutate: logout } = useLogout();
	const [open, setOpen] = useState(false);

	useEffect(() => {
		const onPointer = (event: PointerEvent) => {
			if (!ref.current?.contains(event.target as Node)) {
				setOpen(false);
			}
		};
		window.addEventListener("pointerdown", onPointer);
		return () => window.removeEventListener("pointerdown", onPointer);
	}, []);

	if (!user) {
		return null;
	}

	const displayName = user.userName || user.fullName || "Guest";

	return (
		<div ref={ref} className="relative">
			<button
				type="button"
				onClick={() => setOpen((value) => !value)}
				className={cx(
					FOCUS_RING,
					"inline-flex items-center gap-3 rounded-full border border-[var(--border-soft)] bg-[var(--surface-primary)] px-3 py-2 shadow-[var(--shadow-card)]",
				)}
			>
				<img
					src={user.avatarUrl}
					alt={displayName}
					className="size-9 rounded-full border border-[var(--border-soft)] object-cover"
					referrerPolicy="no-referrer"
				/>
				<div className="hidden text-left lg:block">
					<p className="text-sm font-semibold text-[var(--text-primary)]">{displayName}</p>
					<p className="text-xs text-[var(--text-secondary)]">{user.email}</p>
				</div>
				<ChevronDown size={16} className="text-[var(--text-muted)]" />
			</button>
			{open ? (
				<AppPanel className="absolute right-0 top-[calc(100%+0.75rem)] z-30 w-[260px] p-3">
					<div className="border-b border-[var(--border-soft)] px-3 pb-3">
						<p className="text-sm font-semibold text-[var(--text-primary)]">{displayName}</p>
						<p className="text-xs text-[var(--text-secondary)]">{user.email}</p>
					</div>
					<div className="mt-3 space-y-1">
						<Link
							to="/profile"
							onClick={() => setOpen(false)}
							className="flex items-center gap-3 rounded-[18px] px-3 py-3 text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--surface-muted)]"
						>
							<User2 size={16} />
							Profile
						</Link>
						<Link
							to="/workspace"
							onClick={() => setOpen(false)}
							className="flex items-center gap-3 rounded-[18px] px-3 py-3 text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--surface-muted)]"
						>
							<User2 size={16} />
							Workspace
						</Link>
					</div>
					<div className="mt-3 border-t border-[var(--border-soft)] pt-3">
						<button
							type="button"
							onClick={() => logout()}
							className="flex w-full items-center gap-3 rounded-[18px] px-3 py-3 text-sm font-medium text-[var(--danger-text)] transition hover:bg-[var(--danger-quiet)]"
						>
							<LogOut size={16} />
							Sign out
						</button>
					</div>
				</AppPanel>
			) : null}
		</div>
	);
}
