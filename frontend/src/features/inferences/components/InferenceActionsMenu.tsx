import { ClipboardCheck, Ellipsis, Trash2 } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { AppIconButton } from "@/shared/ui/AppIconButton";

type Props = {
  canDelete: boolean;
  canManageReviews: boolean;
  disabled?: boolean;
  inferenceName: string;
  onDelete: () => void;
  onReviewStatus: () => void;
};

export function InferenceActionsMenu({
  canDelete,
  canManageReviews,
  disabled,
  inferenceName,
  onDelete,
  onReviewStatus,
}: Props) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <AppIconButton
          type="button"
          disabled={disabled}
          aria-label={`Open actions for ${inferenceName}`}
          onClick={(event) => event.stopPropagation()}
        >
          <Ellipsis size={18} />
        </AppIconButton>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          onClick={(event) => event.stopPropagation()}
          className="z-50 min-w-44 rounded border border-[var(--border-soft)] bg-[var(--surface-primary)] p-2 shadow-[var(--shadow-hover)]"
        >
          {canManageReviews ? (
            <DropdownMenu.Item
              onSelect={onReviewStatus}
              className="flex cursor-pointer items-center gap-3 rounded px-3 py-2.5 text-sm font-medium text-[var(--text-primary)] outline-none hover:bg-[var(--surface-muted)] focus:bg-[var(--surface-muted)]"
            >
              <ClipboardCheck size={15} />
              Review status
            </DropdownMenu.Item>
          ) : null}
          {canDelete ? (
            <DropdownMenu.Item
              onSelect={onDelete}
              className="flex cursor-pointer items-center gap-3 rounded px-3 py-2.5 text-sm font-medium text-[var(--danger-text)] outline-none hover:bg-[var(--danger-quiet)] focus:bg-[var(--danger-quiet)]"
            >
              <Trash2 size={15} />
              Delete
            </DropdownMenu.Item>
          ) : null}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
