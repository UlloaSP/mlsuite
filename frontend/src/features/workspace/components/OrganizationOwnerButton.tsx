import { toast } from "sonner";
import type { OrganizationCatalogItemDto } from "@/features/workspace/api/workspace.types";

export function OrganizationOwnerButton({ item }: { item: OrganizationCatalogItemDto }) {
  const owner = item.ownerName || item.ownerEmail || "No owner";
  return (
    <button
      type="button"
      onClick={() => toast.info("Not available yet.")}
      className="flex w-fit max-w-full items-center gap-2 rounded px-1 py-1 text-left hover:bg-[var(--surface-muted)]"
    >
      {item.ownerAvatarUrl ? (
        <img src={item.ownerAvatarUrl} alt="" className="size-7 shrink-0 rounded object-cover" />
      ) : (
        <span className="grid size-7 shrink-0 place-items-center rounded bg-[var(--accent-quiet)] text-xs font-semibold text-[var(--accent-primary-strong)]">
          {owner.slice(0, 1).toUpperCase()}
        </span>
      )}
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-[var(--text-primary)]">
          {owner}
        </span>
        {item.ownerEmail ? (
          <span className="block truncate text-xs text-[var(--text-secondary)]">
            {item.ownerEmail}
          </span>
        ) : null}
      </span>
    </button>
  );
}
