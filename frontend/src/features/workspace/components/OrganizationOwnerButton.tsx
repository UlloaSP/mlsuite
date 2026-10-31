import { toast } from "sonner";
import { PersonAvatar } from "@/shared/ui/PersonAvatar";
import type { OrganizationCatalogItemDto } from "@/shared/api/openapi.gen";

export function OrganizationOwnerButton({ item }: { item: OrganizationCatalogItemDto }) {
  const owner = item.ownerName || item.ownerEmail || "No owner";
  return (
    <button
      type="button"
      onClick={() => toast.info("Not available yet.")}
      className="flex w-fit max-w-full items-center gap-2 rounded-control px-1 py-1 text-left hover:bg-surface-muted"
    >
      <PersonAvatar
        avatarUrl={item.ownerAvatarUrl}
        className="size-7 rounded-full text-xs"
        name={owner}
      />
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-fg">{owner}</span>
        {item.ownerEmail ? (
          <span className="block truncate text-xs text-fg-secondary">{item.ownerEmail}</span>
        ) : null}
      </span>
    </button>
  );
}
