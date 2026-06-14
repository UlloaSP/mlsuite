import { Link } from "react-router";
import { MLSuiteMark } from "./MLSuiteMark";

export function AppHeaderBrand() {
  return (
    <Link
      to="/workspace"
      className="inline-flex items-center gap-3 rounded border border-[var(--border-soft)] bg-[var(--surface-primary)] px-4 py-2 shadow-[var(--shadow-card)]"
    >
      <MLSuiteMark size={20} />
      <p className="text-xs font-semibold tracking-[0.22em] text-[var(--text-secondary)]">
        MLSuite
      </p>
    </Link>
  );
}
