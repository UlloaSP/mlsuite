import { useState } from "react";
import { toast } from "sonner";
import { AppButton } from "@/shared/ui/AppButton";
import { AppDialog } from "@/shared/ui/AppDialog";
import { AppInlineAlert } from "@/shared/ui/AppInlineAlert";
import { AppLoadingState } from "@/shared/ui/AppLoadingState";
import { AppTextField } from "@/shared/ui/AppTextField";
import { usePurgePreview, useRequestPurge, type PurgeScope } from "./purge-api";
import { PurgeCounts } from "./PurgeCounts";

const CONSEQUENCES: Record<PurgeScope, string> = {
  ORGANIZATION:
    "Everything below is destroyed for good, with its stored files. Members return to their personal accounts.",
  USER: "The account closes now. Its personal account and everything below are destroyed for good; what it wrote in organizations stays, under Deleted user.",
  SCHEMA:
    "Everything below is destroyed for good, however it is used. Models stay, and may be bound again.",
  MODEL:
    "Every snapshot that binds this model cannot run without it, so each goes with its inferences, reviews, bookmarks and changes. Snapshots that do not bind it stay.",
};

/** Previews a purge with real counts and asks for it once the target's exact name is typed back. */
export function PurgeDialog({
  onClose,
  scope,
  targetId,
}: {
  onClose: () => void;
  scope: PurgeScope;
  targetId: number;
}) {
  const preview = usePurgePreview(scope, targetId);
  const request = useRequestPurge();
  const [typed, setTyped] = useState("");
  const confirmation = preview.data?.confirmation;
  const refusal = preview.data?.refusal;
  const ready = Boolean(confirmation) && typed === confirmation && !refusal;

  const submit = () =>
    request.mutate(
      { scope, targetId, confirmation: typed },
      {
        onSuccess: () => {
          toast.success("Purge started. Follow it in Purges.");
          onClose();
        },
      },
    );

  return (
    <AppDialog
      open
      busy={request.isPending}
      error={request.error?.message}
      onClose={onClose}
      title={preview.data ? `Purge ${preview.data.targetLabel}?` : "Purge"}
      description={CONSEQUENCES[scope]}
      onSubmit={(event) => {
        event.preventDefault();
        if (ready) submit();
      }}
      footer={
        <>
          <AppButton type="button" variant="secondary" onClick={onClose}>
            Cancel
          </AppButton>
          <AppButton type="submit" variant="danger" disabled={!ready || request.isPending}>
            {request.isPending ? "Starting…" : "Purge permanently"}
          </AppButton>
        </>
      }
    >
      {preview.isLoading ? (
        <AppLoadingState label="Counting what would be destroyed…" rows={3} />
      ) : null}
      {preview.error ? <AppInlineAlert>{preview.error.message}</AppInlineAlert> : null}
      {preview.data ? (
        <div className="flex flex-col gap-4">
          <PurgeCounts counts={preview.data.counts} />
          {refusal ? (
            <AppInlineAlert>{refusal}</AppInlineAlert>
          ) : (
            <div className="flex flex-col gap-1.5">
              <p className="text-sm text-fg-secondary">
                Type <span className="font-mono text-fg">{confirmation}</span> to confirm.
              </p>
              <AppTextField
                aria-label={`Type ${confirmation} to confirm`}
                autoComplete="off"
                className="w-full"
                value={typed}
                onChange={(event) => setTyped(event.target.value)}
              />
            </div>
          )}
        </div>
      ) : null}
    </AppDialog>
  );
}
