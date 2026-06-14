import { Link } from "react-router";
import { MLSuiteMark } from "./MLSuiteMark";

export function AppHeaderBrand() {
  return (
    <Link to="/workspace" className="inline-flex items-center gap-3px-4 py-2">
      <MLSuiteMark size={30} />
      <p className="text-xl font-semibold text-[var(--text-secondary)]">MLSuite</p>
    </Link>
  );
}
