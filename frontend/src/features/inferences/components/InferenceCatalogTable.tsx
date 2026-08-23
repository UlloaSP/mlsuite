import { useNavigate } from "react-router";
import { formatTimestamp, getPredictionShortId } from "@/capabilities/prediction-runtime/data/model-utils";
import type { InferenceCatalogItemDto } from "@/features/inferences/api/inference-api";
import { AppBadge } from "@/shared/ui/AppBadge";
import { AppPanel } from "@/shared/ui/AppPanel";
import { InferenceActionsMenu } from "./InferenceActionsMenu";

const statusTone = (status: InferenceCatalogItemDto["status"]) =>
  status === "SUCCESS" ? "success" : status === "PARTIAL_SUCCESS" ? "warning" : "danger";

const inferenceHref = (item: InferenceCatalogItemDto) => `/inferences/${item.id}`;

type Props = {
  canDelete: boolean;
  canManageReviews: boolean;
  deletePending: boolean;
  items: InferenceCatalogItemDto[];
  onDelete: (item: InferenceCatalogItemDto) => void;
};

export function InferenceCatalogTable({
  canDelete,
  canManageReviews,
  deletePending,
  items,
  onDelete,
}: Props) {
  const navigate = useNavigate();
  const open = (item: InferenceCatalogItemDto) => navigate(inferenceHref(item));

  return (
    <AppPanel className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead className="bg-[var(--surface-secondary)]">
            <tr className="text-left text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">
              <th className="px-5 py-4">Inference</th>
              <th className="px-5 py-4">Schema</th>
              <th className="px-5 py-4">Bookmark</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4">Updated</th>
              <th className="px-5 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.id}
                role="link"
                tabIndex={0}
                onClick={() => open(item)}
                onKeyDown={(event) => {
                  if (
                    event.currentTarget === event.target &&
                    (event.key === "Enter" || event.key === " ")
                  ) {
                    event.preventDefault();
                    open(item);
                  }
                }}
                className="cursor-pointer border-t border-[var(--border-soft)] text-sm transition hover:bg-[var(--surface-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent-primary)] focus-visible:outline-offset-[-2px]"
              >
                <td className="px-5 py-4">
                  <p className="font-medium text-[var(--text-primary)]">{item.name}</p>
                  <p className="mt-1 font-mono text-xs text-[var(--text-muted)]">
                    {getPredictionShortId(String(item.id))}
                  </p>
                </td>
                <td className="px-5 py-4">
                  <p className="text-[var(--text-primary)]">{item.schemaName}</p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    {item.schemaVersionName} · v{item.schemaVersion}
                  </p>
                </td>
                <td className="px-5 py-4 text-[var(--text-secondary)]">
                  {item.bookmarkName ?? "—"}
                </td>
                <td className="px-5 py-4">
                  <AppBadge tone={statusTone(item.status)}>{item.status}</AppBadge>
                </td>
                <td className="px-5 py-4 text-[var(--text-secondary)]">
                  {formatTimestamp(item.updatedAt ?? item.createdAt)}
                </td>
                <td className="px-5 py-4 text-right">
                  {canDelete || canManageReviews ? (
                    <div className="flex justify-end">
                      <InferenceActionsMenu
                        canDelete={canDelete}
                        canManageReviews={canManageReviews}
                        disabled={deletePending}
                        inferenceName={item.name}
                        onDelete={() => onDelete(item)}
                        onReviewStatus={() => navigate(`${inferenceHref(item)}?section=reviews`)}
                      />
                    </div>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppPanel>
  );
}
