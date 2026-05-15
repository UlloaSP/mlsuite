import { LogOut } from "lucide-react";
import { useAtom } from "jotai";
import type { ReactNode } from "react";
import { themeWithHtmlAtom } from "../../app/atoms";
import { AppButton } from "../../app/components";
import { useLogout } from "../../user/hooks";

type ReviewShellProps = {
	title?: string;
	subtitle?: string;
	showLogout?: boolean;
	children: ReactNode;
};

export function ReviewShell({ title = "External Review", subtitle, showLogout = true, children }: ReviewShellProps) {
	const [theme] = useAtom(themeWithHtmlAtom);
	const logout = useLogout();
	return (
		<div className={`min-h-screen bg-[var(--page-bg)] text-[var(--text-primary)] ${theme === "dark" ? "dark" : ""}`}>
			<header className="sticky top-0 z-20 border-b border-[var(--border-soft)] bg-[var(--surface-primary)]/95 px-6 py-4 backdrop-blur">
				<div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
					<div>
						<p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-primary)]">External Review</p>
						<h1 className="text-xl font-semibold">{title}</h1>
						{subtitle ? <p className="text-sm text-[var(--text-secondary)]">{subtitle}</p> : null}
					</div>
					{showLogout ? (
						<AppButton type="button" variant="ghost" onClick={() => logout.mutate()}>
							<LogOut size={16} />
							Logout
						</AppButton>
					) : null}
				</div>
			</header>
			<main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
		</div>
	);
}
