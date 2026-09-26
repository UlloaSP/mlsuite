import { AppButton } from "@/shared/ui/AppButton";
import { AppDialog } from "@/shared/ui/AppDialog";

export function DeleteOrganizationDialog({
  disabled,
  error,
  name,
  onCancel,
  onConfirm,
}: {
  disabled: boolean;
  error?: Error | null;
  name: string;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}) {
  return (
    <AppDialog
      open
      busy={disabled}
      onClose={onCancel}
      title="Delete organization?"
      description={`This permanently deletes ${name}. It cannot be undone. Deletion succeeds only after all organization resources are removed.`}
      footer={
        <>
          <AppButton type="button" variant="secondary" onClick={onCancel} disabled={disabled}>
            Cancel
          </AppButton>
          <AppButton
            type="button"
            variant="danger"
            disabled={disabled}
            onClick={() => void onConfirm().catch(() => undefined)}
          >
            Delete permanently
          </AppButton>
        </>
      }
    >
      {error ? (
        <p role="alert" className="text-sm text-danger-fg">
          {error.message}
        </p>
      ) : null}
    </AppDialog>
  );
}
