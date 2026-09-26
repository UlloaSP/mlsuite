import { toast } from "sonner";
import type { OrganizationCatalogItemDto } from "@/features/workspace/api/workspace.types";

export function OrganizationOwnerButton({ item }: { item: OrganizationCatalogItemDto }) {
  const owner = item.ownerName || item.ownerEmail || "No owner";
  return (
    <button
      type="button"
      onClick={() => toast.info("Not available yet.")}
      className="flex w-fit max-w-full items-center gap-2 rounded px-1 py-1 text-left hover:bg-surface-muted"
    >
      {item.ownerAvatarUrl ? (
        <img src={item.ownerAvatarUrl} alt="" className="size-7 shrink-0 rounded object-cover" />
      ) : (
        <span className="grid size-7 shrink-0 place-items-center rounded bg-accent-subtle text-xs font-semibold text-accent-strong">
          {owner.slice(0, 1).toUpperCase()}
        </span>
      )}
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-fg">{owner}</span>
        {item.ownerEmail ? (
          <span className="block truncate text-xs text-fg-secondary">{item.ownerEmail}</span>
        ) : null}
      </span>
    </button>
  );
}
