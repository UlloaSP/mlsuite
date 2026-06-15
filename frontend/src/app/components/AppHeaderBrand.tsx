import { Link } from "react-router";
import { MLSuiteMark } from "./MLSuiteMark";

export function AppHeaderBrand() {
  return (
    <Link to="/workspace" className="inline-flex items-center gap-4 px-4 py-2">
      <MLSuiteMark size={44} />
      <p className="text-[28px] font-bold leading-none text-[var(--text-primary)]">MLSuite</p>
    </Link>
  );
}
