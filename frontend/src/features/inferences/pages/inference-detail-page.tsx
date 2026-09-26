import { ExternalLink } from "lucide-react";
import { useEffect } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import { useWorkspaceContext } from "@/capabilities/workspace-context/workspace-context";
import {
  type InferenceCatalogItemDto,
  useInferenceCatalog,
} from "@/features/inferences/api/inference-api";
import { InferenceReviewStatusSection } from "@/features/inferences/components/InferenceReviewStatusSection";
import { formatTimestamp } from "@/shared/lib/date-time";
import { AppBadge } from "@/shared/ui/AppBadge";
import { AppButton } from "@/shared/ui/AppButton";
import { AppEmptyState } from "@/shared/ui/AppEmptyState";
import { AppPage } from "@/shared/ui/AppPage";
import { AppPageLoader } from "@/shared/ui/AppPageLoader";
import { useStableLoading } from "@/shared/ui/useStableLoading";
import { AppPanel } from "@/shared/ui/AppPanel";
import { AppSurface } from "@/shared/ui/AppSurface";
import { AppPageHeader } from "@/shared/ui/PageHeader";

const statusTone = (status: InferenceCatalogItemDto["status"]) =>
  status === "SUCCESS" ? "success" : status === "PARTIAL_SUCCESS" ? "warning" : "danger";

const dataHref = (item: InferenceCatalogItemDto) =>
  item.bookmarkId == null
    ? `/schemas/${item.schemaId}/versions/${item.schemaVersionId}`
    : `/schemas/${item.schemaId}/bookmarks/${item.bookmarkId}/runs/${item.id}`;

export function InferenceDetailPage() {
  const { inferenceId = "" } = useParams<{ inferenceId: string }>();
  const [searchParams] = useSearchParams();
  const catalog = useInferenceCatalog();
  const showLoader = useStableLoading(catalog.isLoading);
  const { data: workspace } = useWorkspaceContext();
  const item = catalog.data?.find((candidate) => String(candidate.id) === inferenceId);
  const canManageReviews = workspace?.permissions.canManageReviews ?? false;
  const reviewRequested = searchParams.get("section") === "reviews";

  useEffect(() => {
    if (reviewRequested && item) document.getElementById("reviews")?.scrollIntoView();
  }, [item, reviewRequested]);

  if (showLoader) {
    return <AppPageLoader label="Loading inference..." />;
  }

  if (catalog.error || !item) {
    return (
      <AppPage>
        <AppSurface className="flex-1">
          <AppEmptyState
            title="Inference unavailable"
            description="It may have been deleted or belong to another organization."
          />
        </AppSurface>
      </AppPage>
    );
  }

  return (
    <AppPage>
      <AppSurface className="flex-1 space-y-6 overflow-auto">
        <AppPageHeader
          title={item.name}
          breadcrumbs={[{ label: "Inferences", to: "/inferences" }, { label: item.name }]}
          actions={
            <Link to={dataHref(item)}>
              <AppButton variant="secondary">
                Open inference data
                <ExternalLink size={15} />
              </AppButton>
            </Link>
          }
        />
        <AppPanel>
          <dl className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            <div>
              <dt className="text-2xs font-semibold uppercase tracking-eyebrow text-fg-muted">
                Status
              </dt>
              <dd className="mt-2">
                <AppBadge tone={statusTone(item.status)}>{item.status}</AppBadge>
              </dd>
            </div>
            <div>
              <dt className="text-2xs font-semibold uppercase tracking-eyebrow text-fg-muted">
                Schema
              </dt>
              <dd className="mt-2 font-medium text-fg">{item.schemaName}</dd>
              <dd className="mt-1 text-sm text-fg-secondary">
                {item.schemaVersionName} · v{item.schemaVersion}
              </dd>
            </div>
            <div>
              <dt className="text-2xs font-semibold uppercase tracking-eyebrow text-fg-muted">
                Bookmark
              </dt>
              <dd className="mt-2 text-fg">{item.bookmarkName ?? "None"}</dd>
            </div>
            <div>
              <dt className="text-2xs font-semibold uppercase tracking-eyebrow text-fg-muted">
                Updated
              </dt>
              <dd className="mt-2 text-fg">{formatTimestamp(item.updatedAt ?? item.createdAt)}</dd>
            </div>
          </dl>
        </AppPanel>
        {canManageReviews ? (
          <InferenceReviewStatusSection inferenceId={item.id} inferenceName={item.name} />
        ) : reviewRequested ? (
          <AppEmptyState
            title="Review management unavailable"
            description="You do not have permission to manage reviews in this organization."
          />
        ) : null}
      </AppSurface>
    </AppPage>
  );
}
