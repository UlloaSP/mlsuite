import { Laptop, LogOut, Moon, Sun } from "lucide-react";
import { useAtom } from "jotai";
import type { ReactNode } from "react";
import { useParams } from "react-router";
import { themeAtom, themeWithHtmlAtom, type ThemeMode } from "../../app/atoms";
import { AppButton } from "../../app/components";
import { useLogout } from "../../api/user/hooks";

type ReviewShellProps = {
  title?: string;
  showLogout?: boolean;
  children: ReactNode;
};

const nextTheme = (mode: ThemeMode): ThemeMode =>
  mode === "system" ? "light" : mode === "light" ? "dark" : "system";
const themeLabel = (mode: ThemeMode) =>
  mode === "system" ? "System" : mode === "light" ? "Light" : "Dark";
const themeIcon = (mode: ThemeMode) => (mode === "system" ? Laptop : mode === "light" ? Sun : Moon);

export function ReviewShell({
  title = "External Review",
  showLogout = true,
  children,
}: ReviewShellProps) {
  const [theme, setThemeMode] = useAtom(themeWithHtmlAtom);
  const [themeMode] = useAtom(themeAtom);
  const { token = "" } = useParams<{ token: string }>();
  const reviewBase = "review";
  const logout = useLogout(token ? `/${reviewBase}/${token}/login` : "/");
  const ThemeIcon = themeIcon(themeMode);
  return (
    <div
      className={`min-h-screen bg-[var(--page-bg)] text-[var(--text-primary)] ${theme === "dark" ? "dark" : ""}`}
    >
      <header className="sticky top-0 z-20 border-b border-[var(--border-soft)] bg-[var(--surface-primary)]/95 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-5/6 items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-primary)]">
              External Review
            </p>
            <h1 className="text-xl font-semibold">{title}</h1>
          </div>
          {showLogout ? (
            <div className="flex items-center gap-2">
              <AppButton
                type="button"
                variant="ghost"
                onClick={() => setThemeMode(nextTheme(themeMode))}
              >
                <ThemeIcon size={16} />
                {themeLabel(themeMode)}
              </AppButton>
              <AppButton type="button" variant="ghost" onClick={() => logout.mutate()}>
                <LogOut size={16} />
                Logout
              </AppButton>
            </div>
          ) : null}
        </div>
      </header>
      <main className="mx-auto max-w-5/6 px-6 py-8">{children}</main>
    </div>
  );
}
