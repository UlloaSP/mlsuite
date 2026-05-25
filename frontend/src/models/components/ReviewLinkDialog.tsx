import { Copy, Link2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AppButton, AppIconButton, AppTextField } from "../../app/components/ui-controls";
import {
  useCreateReviewLinkMutation,
  useReviewLinks,
  useRevokeReviewLinkMutation,
} from "../../review/hooks";
import type { PredictionDto, SignatureDto } from "../api/modelService";
import { formatTimestamp, getPredictionTimestamp } from "../utils";

type ReviewLinkDialogProps = {
  open: boolean;
  onClose: () => void;
  modelId: string;
  signature: SignatureDto;
  predictions: PredictionDto[];
  statusByPredictionId: Map<string, "COMPLETED" | "PENDING">;
};

const defaultExpiryDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date.toISOString().slice(0, 10);
};

const reviewUrl = (token?: string | null) =>
  token ? `${window.location.origin}/review/${token}` : "";

export function ReviewLinkDialog({
  open,
  onClose,
  modelId,
  signature,
  predictions,
}: ReviewLinkDialogProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expiresAt, setExpiresAt] = useState(defaultExpiryDate);
  const createMutation = useCreateReviewLinkMutation(modelId, signature.id);
  const revokeMutation = useRevokeReviewLinkMutation(modelId, signature.id);
  const { data: links = [] } = useReviewLinks(modelId, signature.id);
  const activeLinks = useMemo(
    () => links.filter((link) => !link.revokedAt && new Date(link.expiresAt) > new Date()),
    [links],
  );
  const selectedCount = selectedIds.size;
  const selectedPredictions = useMemo(
    () => predictions.filter((prediction) => selectedIds.has(prediction.id)),
    [predictions, selectedIds],
  );

  // react-doctor-disable-next-line react-doctor/no-cascading-set-state, react-doctor/no-derived-state, react-doctor/no-adjust-state-on-prop-change -- Opening dialog resets selection and expiry as one modal initialization.
  useEffect(() => {
    if (!open) return;
    // react-doctor-disable-next-line react-doctor/no-derived-state, react-doctor/no-adjust-state-on-prop-change -- Modal selection is editable local draft initialized from visible predictions.
    setSelectedIds(new Set(predictions.map((prediction) => prediction.id)));
    // react-doctor-disable-next-line react-doctor/no-adjust-state-on-prop-change -- Modal expiry resets when opening a fresh share dialog.
    setExpiresAt(defaultExpiryDate());
  }, [open, predictions]);

  if (!open) return null;

  const toggleSelection = (predictionId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(predictionId)) next.delete(predictionId);
      else next.add(predictionId);
      return next;
    });
  };

  const createLink = async () => {
    const expiry = new Date(`${expiresAt}T23:59:59.000Z`).toISOString();
    await createMutation.mutateAsync({
      modelId,
      signatureId: signature.id,
      predictionIds: [...selectedIds],
      expiresAt: expiry,
    });
    toast.success("Review link created");
  };

  const copy = async (value: string) => {
    await navigator.clipboard.writeText(value);
    toast.success("Review link copied");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <div className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg bg-[var(--surface-primary)] text-[var(--text-primary)] shadow-[var(--shadow-hover)]">
        <header className="flex items-start justify-between gap-4 border-b border-[var(--border-soft)] px-6 py-5">
          <div>
            <h2 className="text-2xl font-semibold">Share review link</h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {selectedCount} of {predictions.length} visible predictions selected.
            </p>
          </div>
          <AppIconButton type="button" aria-label="Close" onClick={onClose} className="rounded-md">
            <X size={18} />
          </AppIconButton>
        </header>
        <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="min-h-0 border-r border-[var(--border-soft)] px-6 py-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                Predictions
              </p>
              <div className="flex gap-2">
                <AppButton
                  type="button"
                  variant="secondary"
                  className="rounded-md px-3 py-2"
                  onClick={() => setSelectedIds(new Set(predictions.map((item) => item.id)))}
                >
                  Select all
                </AppButton>
                <AppButton
                  type="button"
                  variant="ghost"
                  className="rounded-md px-3 py-2"
                  onClick={() => setSelectedIds(new Set())}
                >
                  Deselect all
                </AppButton>
              </div>
            </div>
            <div className="max-h-[58vh] overflow-auto border-y border-[var(--border-soft)]">
              {predictions.map((prediction) => {
                const selected = selectedIds.has(prediction.id);
                return (
                  <button
                    key={prediction.id}
                    type="button"
                    onClick={() => toggleSelection(prediction.id)}
                    className={`grid w-full grid-cols-[auto_minmax(0,1fr)_160px] items-center gap-4 border-b border-[var(--border-soft)] px-3 py-3 text-left transition last:border-b-0 ${selected ? "bg-[var(--accent-quiet)]" : "hover:bg-[var(--surface-muted)]"}`}
                  >
                    <span
                      className={`grid size-6 place-items-center rounded-md border text-sm font-semibold ${selected ? "border-[var(--accent-primary)] bg-[var(--accent-primary)] text-white" : "border-[var(--border-strong)] text-transparent"}`}
                    >
                      ✓
                    </span>
                    <span className="min-w-0 truncate text-sm font-semibold">
                      {prediction.name}
                    </span>
                    <span className="text-sm text-[var(--text-secondary)]">
                      {formatTimestamp(getPredictionTimestamp(prediction))}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
          <aside className="min-h-0 space-y-5 overflow-auto px-6 py-5">
            <div className="flex gap-3">
              <AppTextField
                type="date"
                value={expiresAt}
                onChange={(event) => setExpiresAt(event.currentTarget.value)}
                className="min-w-0 flex-1 rounded-md"
              />
              <AppButton
                type="button"
                disabled={selectedPredictions.length === 0 || createMutation.isPending}
                onClick={() => void createLink()}
                className="rounded-md px-4"
              >
                <Link2 size={16} />
                Generate
              </AppButton>
            </div>
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                Links
              </p>
              <div className="divide-y divide-[var(--border-soft)] border-y border-[var(--border-soft)]">
                {activeLinks.map((link) => {
                  const url = reviewUrl(link.token);
                  return (
                    <div key={link.id} className="space-y-2 py-4">
                      <p className="text-sm font-semibold">{link.predictionCount} predictions</p>
                      <p className="text-xs text-[var(--text-secondary)]">
                        Created {formatTimestamp(link.createdAt)} · Expires{" "}
                        {formatTimestamp(link.expiresAt)}
                      </p>
                      <div className="flex gap-2">
                        <AppButton
                          type="button"
                          variant="secondary"
                          disabled={!url}
                          onClick={() => void copy(url)}
                          className="rounded-md px-3 py-2"
                        >
                          <Copy size={15} />
                          Copy
                        </AppButton>
                        <AppButton
                          type="button"
                          variant="danger"
                          disabled={Boolean(link.revokedAt) || revokeMutation.isPending}
                          onClick={() => revokeMutation.mutate(link.id)}
                          className="rounded-md px-3 py-2"
                        >
                          {link.revokedAt ? "Revoked" : "Revoke"}
                        </AppButton>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
