import { AppButton } from "@/shared/ui/AppButton";

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
    <div className="fixed inset-0 z-(--z-overlay) grid place-items-center bg-overlay p-4">
      <div className="w-full max-w-sm rounded border border-line bg-surface p-5 shadow-hover">
        <h2 className="text-lg font-semibold text-fg">Delete organization?</h2>
        <p className="mt-2 text-sm text-fg-secondary">
          This permanently deletes {name}. It cannot be undone. Deletion succeeds only after all
          organization resources are removed.
        </p>
        {error ? (
          <p role="alert" className="mt-3 text-sm text-danger-fg">
            {error.message}
          </p>
        ) : null}
        <div className="mt-5 flex justify-end gap-2">
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
        </div>
      </div>
    </div>
  );
}
