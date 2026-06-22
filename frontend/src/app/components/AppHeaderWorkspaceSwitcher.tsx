import { Building2, Check, ChevronsUpDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { AppCopy } from "./AppCopy";
import { AppPanel } from "./AppPanel";
import { useSelectOrganization, useWorkspaceContext } from "../../api/workspace/hooks";
import { cx } from "./cx";
import { FOCUS_RING } from "./focus-ring";

export function AppHeaderWorkspaceSwitcher() {
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement | null>(null);
  const { data: context } = useWorkspaceContext();
  const selectOrganization = useSelectOrganization();
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

  if (!context) {
    return null;
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={cx(
          FOCUS_RING,
          "inline-flex min-w-[220px] items-center justify-between gap-3 rounded-full border border-[var(--border-soft)] bg-[var(--surface-primary)] px-4 py-3 text-left shadow-[var(--shadow-card)]",
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--accent-quiet)] text-[var(--accent-primary-strong)]">
            <Building2 size={16} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
              {context.currentOrganization.name}
            </p>
            <p className="truncate text-xs text-[var(--text-secondary)]">
              {context.currentOrganization.slug}
            </p>
          </div>
        </div>
        <ChevronsUpDown size={16} className="text-[var(--text-muted)]" />
      </button>
      {open ? (
        <AppPanel className="absolute left-0 top-[calc(100%+0.75rem)] z-30 w-[320px] p-3">
          <div className="space-y-1">
            {context.organizations.map((organization) => (
              <button
                key={organization.id}
                type="button"
                className="flex w-full items-center justify-between rounded-[20px] px-4 py-3 text-left transition hover:bg-[var(--surface-muted)]"
                onClick={() => {
                  void selectOrganization.mutateAsync(organization.id).then(() => {
                    setOpen(false);
                    void navigate("/workspace");
                  });
                }}
              >
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                    {organization.name}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)]">{organization.slug}</p>
                </div>
                {organization.id === context.currentOrganization.id ? <Check size={16} /> : null}
              </button>
            ))}
          </div>
          <div className="mt-3 border-t border-[var(--border-soft)] pt-3">
            <Link
              to="/workspace/organizations"
              onClick={() => setOpen(false)}
              className="block rounded-[20px] px-4 py-3 text-sm font-medium text-[var(--accent-primary-strong)] transition hover:bg-[var(--surface-muted)]"
            >
              Manage organizations
            </Link>
            <AppCopy className="px-4 pt-1 text-xs">
              Switch workspace scope for models, teams, and plugins.
            </AppCopy>
          </div>
        </AppPanel>
      ) : null}
    </div>
  );
}
