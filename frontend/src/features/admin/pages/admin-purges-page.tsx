import { toast } from "sonner";
import { useUser } from "@/capabilities/workspace-context/session";
import { usePurgeJobs, useRetryPurge } from "@/features/admin/api/purge-jobs.queries";
import { PurgeJobEntry } from "@/features/admin/components/PurgeJobEntry";
import { CatalogResourcePage } from "@/shared/ui/catalog/CatalogResourcePage";
import { useCatalogControls } from "@/shared/ui/catalog/useCatalogControls";
import { NotFoundError } from "@/shared/ui/RouteStatusPage";
import { SECTION_ICONS } from "@/shared/ui/section-icons";

type PurgeFilter = "all" | "open" | "completed";
type PurgeSort = "newest";

const FILTERS: Array<{ value: PurgeFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "completed", label: "Completed" },
];
const SORT_OPTIONS: Array<{ value: PurgeSort; label: string }> = [
  { value: "newest", label: "Newest" },
];

/** Every purge asked for on this instance; those under way read again until they end. */
export function AdminPurgesPage() {
  const { data: user, error } = useUser();
  const controls = useCatalogControls<PurgeFilter, PurgeSort>({
    filters: FILTERS.map(({ value }) => value),
    initialFilter: "all",
    initialSort: "newest",
    sorts: SORT_OPTIONS.map(({ value }) => value),
  });
  const canView = user?.systemRole === "SUPERADMIN";
  const pageQuery = usePurgeJobs(controls.search, controls.filter, canView);
  const retry = useRetryPurge();
  const Icon = SECTION_ICONS.purges;

  return (
    <CatalogResourcePage
      accessDenied={!canView || Boolean(error)}
      accessFallback={<NotFoundError />}
      controls={controls}
      header={{
        title: "Purges",
        description:
          "Cascade deletions of organizations, users, schemas and models. They run on the server, resume after a restart, and can be retried if they fail.",
        breadcrumbs: [{ label: "Purges" }],
      }}
      isActionPending={retry.isPending}
      loadingLabel="Loading purges…"
      filterLabel="Filter purges"
      filters={FILTERS}
      placeholder="Search by what was purged"
      query={pageQuery}
      sortLabel="Sort purges"
      sortOptions={SORT_OPTIONS}
      emptyIcon={<Icon size={22} />}
      emptyTitle="No purges yet"
      filteredEmptyTitle="No matching purges"
      emptyDescription="A purge starts from the actions of an organization, user, schema or model."
      filteredEmptyDescription="Try another search term or filter."
      renderItem={(job) => (
        <PurgeJobEntry
          key={job.id}
          disabled={retry.isPending}
          job={job}
          onRetry={() =>
            retry.mutate(job.id, {
              onSuccess: () => toast.success("Purge retried."),
              onError: (failure) => toast.error(failure.message),
            })
          }
        />
      )}
    />
  );
}
