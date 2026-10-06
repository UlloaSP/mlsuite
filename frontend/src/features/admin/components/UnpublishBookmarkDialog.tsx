import { AppButton } from "@/shared/ui/AppButton";
import { AppDialog } from "@/shared/ui/AppDialog";
import type { ModeratedBookmarkDto } from "@/shared/api/openapi.gen";

export function UnpublishBookmarkDialog({
  bookmark,
  disabled,
  error,
  onCancel,
  onConfirm,
}: {
  bookmark: ModeratedBookmarkDto;
  disabled: boolean;
  error?: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <AppDialog
      open
      busy={disabled}
      error={error}
      onClose={onCancel}
      title={`Unpublish ${bookmark.name}?`}
      description={`${bookmark.name} of ${bookmark.organizationName} becomes private and its public page stops being available. Nothing is deleted, and members of ${bookmark.organizationName} who may publish can make it public again.`}
      footer={
        <>
          <AppButton type="button" variant="secondary" onClick={onCancel} disabled={disabled}>
            Cancel
          </AppButton>
          <AppButton type="button" variant="danger" disabled={disabled} onClick={onConfirm}>
            Unpublish
          </AppButton>
        </>
      }
    />
  );
}
