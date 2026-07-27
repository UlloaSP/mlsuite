import { useQueries } from "@tanstack/react-query";
import { FileDown } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { prepareSchemaVersionDtoForUse } from "@/capabilities/mlform/binding-rebase";
import { useCurrentOrganizationId } from "@/capabilities/workspace-context/workspace-context";
import { predictionRunQueryOptions, useSchemaVersion } from "@/features/schemas/api/schema-queries";
import { AppButton } from "@/shared/ui/AppButton";
import { SchemaRunExportDialog } from "./SchemaRunExportDialog";

export type InferenceExportCandidate = {
  id: number;
  schemaName: string;
  schemaVersionId: number;
  schemaVersionName: string;
  schemaVersion: number;
};

type Group = {
  versionId: string;
  label: string;
  runIds: string[];
};

const groupsOf = (items: InferenceExportCandidate[]): Group[] => {
  const groups = new Map<string, Group>();
  items.forEach((item) => {
    const versionId = String(item.schemaVersionId);
    const group = groups.get(versionId);
    if (group) group.runIds.push(String(item.id));
    else {
      groups.set(versionId, {
        versionId,
        label: `${item.schemaName} · ${item.schemaVersionName} · v${item.schemaVersion}`,
        runIds: [String(item.id)],
      });
    }
  });
  return [...groups.values()];
};

export function OrganizationInferenceExportButton({
  items,
}: {
  items: InferenceExportCandidate[];
}) {
  const organizationId = useCurrentOrganizationId() ?? "none";
  const groups = useMemo(() => groupsOf(items), [items]);
  const [selectedVersionId, setSelectedVersionId] = useState<string>();
  const group = groups.find((item) => item.versionId === selectedVersionId);
  const version = useSchemaVersion(selectedVersionId);
  const runQueries = useQueries({
    queries: (group?.runIds ?? []).map((runId) => predictionRunQueryOptions(organizationId, runId)),
  });
  const runs = runQueries.flatMap((query) => (query.data ? [query.data] : []));
  const failed = Boolean(group) && (version.isError || runQueries.some((query) => query.isError));
  const ready =
    Boolean(group && version.data) &&
    runQueries.length > 0 &&
    runQueries.every((query) => query.isSuccess);
  const preparedVersion = useMemo(
    () => (version.data ? prepareSchemaVersionDtoForUse(version.data) : undefined),
    [version.data],
  );

  useEffect(() => {
    if (failed) toast.error("Could not prepare inference export.");
  }, [failed]);

  const selectGroup = (versionId: string) => {
    if (versionId === selectedVersionId) {
      void version.refetch();
      runQueries.forEach((query) => void query.refetch());
    }
    setSelectedVersionId(versionId);
  };

  const button = (
    <AppButton
      type="button"
      variant="secondary"
      disabled={items.length === 0 || (Boolean(group) && !failed && !ready)}
      onClick={() => {
        if (groups.length === 1) selectGroup(groups[0].versionId);
      }}
    >
      <FileDown size={16} />
      {group && !failed && !ready ? "Preparing export..." : "Export to CSV"}
    </AppButton>
  );

  return (
    <>
      {groups.length > 1 ? (
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>{button}</DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={8}
              className="z-50 max-h-80 min-w-72 overflow-auto rounded border border-[var(--border-soft)] bg-[var(--surface-primary)] p-2 shadow-[var(--shadow-hover)]"
            >
              {groups.map((item) => (
                <DropdownMenu.Item
                  key={item.versionId}
                  onSelect={() => selectGroup(item.versionId)}
                  className="cursor-pointer rounded px-3 py-2.5 text-sm font-medium text-[var(--text-primary)] outline-none hover:bg-[var(--surface-muted)] focus:bg-[var(--surface-muted)]"
                >
                  {item.label}
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      ) : (
        button
      )}
      {ready && preparedVersion ? (
        <SchemaRunExportDialog
          open
          runs={runs}
          version={preparedVersion}
          onClose={() => setSelectedVersionId(undefined)}
        />
      ) : null}
    </>
  );
}
