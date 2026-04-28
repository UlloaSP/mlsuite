import { AppHeaderBrand } from "./AppHeaderBrand";
import { AppHeaderProfileMenu } from "./AppHeaderProfileMenu";
import { AppHeaderSearch } from "./AppHeaderSearch";
import { AppHeaderWorkspaceSwitcher } from "./AppHeaderWorkspaceSwitcher";

export function AppHeader() {
	return (
		<header className="shrink-0 border-b border-[var(--border-soft)] bg-[var(--surface-secondary)]/95 px-4 py-3 backdrop-blur-xl">
			<div className="mx-auto flex max-w-[1800px] items-center gap-3">
				<div className="flex shrink-0 items-center gap-3">
					<AppHeaderBrand />
					<div className="hidden xl:block">
						<AppHeaderWorkspaceSwitcher />
					</div>
				</div>
				<div className="min-w-0 flex-1">
					<AppHeaderSearch />
				</div>
				<div className="shrink-0">
					<AppHeaderProfileMenu />
				</div>
			</div>
			<div className="mt-3 xl:hidden">
				<AppHeaderWorkspaceSwitcher />
			</div>
		</header>
	);
}
