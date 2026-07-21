/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Save } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { AppButton } from "@/shared/ui/AppButton";
import { AppPage } from "@/shared/ui/AppPage";
import { AppPageHeader } from "@/shared/ui/PageHeader";
import { AppPanel } from "@/shared/ui/AppPanel";
import { AppSurface } from "@/shared/ui/AppSurface";
import { AppTextField } from "@/shared/ui/AppTextField";
import { SchemaModelSelector } from "@/features/schemas/components/SchemaModelSelector";
import { useCreateSchemaWithInitialVersionMutation } from "@/features/schemas/api/schema-mutations";
import { countVisibleSchemaFields } from "@/features/schemas/lib/one-hot-category";
import { prepareSchemaVersionForSave } from "@/capabilities/mlform/binding-rebase";
import {
  composeSchemaVersion,
  type SchemaSourceModel,
  type SelectedSchemaModel,
} from "@/features/schemas/lib/merge";

type SelectedModel = SelectedSchemaModel;

type Props = {
  isLoading: boolean;
  models: SchemaSourceModel[];
};

export function CreateSchemaPage({ isLoading, models }: Props) {
  const navigate = useNavigate();
  const createSchema = useCreateSchemaWithInitialVersionMutation();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState<SelectedModel[]>([]);

  const composedVersion = useMemo(
    () =>
      composeSchemaVersion(
        "v1",
        selected.map(({ modelId, modelName, model }) => ({ modelId, modelName, model })),
      ),
    [selected],
  );
  const canSubmit = name.trim().length > 0 && selected.length > 0;
  const busy = createSchema.isPending;
  const fieldCount = countVisibleSchemaFields(composedVersion.formSchema);
  const reportCount = Array.isArray(composedVersion.formSchema.reports)
    ? composedVersion.formSchema.reports.length
    : 0;
  const activeModelCount = selected.length;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit || busy) return;
    try {
      const preparedVersion = prepareSchemaVersionForSave(
        composedVersion,
        composedVersion.formSchema,
      );
      const schemaId = (
        await createSchema.mutateAsync({
          schema: {
            name,
            description: description.trim() || undefined,
          },
          initialVersion: {
            ...preparedVersion,
            name: "v1",
          },
        })
      ).id;
      void navigate(`/schemas/${schemaId}`);
    } catch (error) {
      toast.error("Schema create failed", {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  };

  return (
    <AppPage>
      <AppSurface className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden">
        <AppPageHeader
          title="New schema"
          description="Select one or more models to create the generated schema."
          breadcrumbs={[{ label: "Schemas", to: "/schemas" }, { label: "New Schema" }]}
        />
        <form className="flex min-h-0 flex-1 flex-col gap-6" onSubmit={submit}>
          <AppPanel className="shrink-0 space-y-4">
            <div className="grid gap-4 xl:grid-cols-[minmax(260px,1fr)_auto_auto] xl:items-end">
              <div className="space-y-3">
                <AppTextField
                  value={name}
                  placeholder="Schema name"
                  required
                  onChange={(event) => setName(event.target.value)}
                  className="w-full"
                />
                <textarea
                  value={description}
                  aria-label="Schema description"
                  placeholder="Schema description"
                  onChange={(event) => setDescription(event.target.value)}
                  className="min-h-24 w-full resize-y rounded border border-[var(--border-soft)] bg-[var(--surface-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
                />
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="min-w-20 rounded bg-[var(--surface-muted)] p-3">
                  <p className="text-2xl font-semibold">{activeModelCount}</p>
                  <p className="text-xs text-[var(--text-secondary)]">Models</p>
                </div>
                <div className="min-w-20 rounded bg-[var(--surface-muted)] p-3">
                  <p className="text-2xl font-semibold">{fieldCount}</p>
                  <p className="text-xs text-[var(--text-secondary)]">Fields</p>
                </div>
                <div className="min-w-20 rounded bg-[var(--surface-muted)] p-3">
                  <p className="text-2xl font-semibold">{reportCount}</p>
                  <p className="text-xs text-[var(--text-secondary)]">Reports</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 xl:justify-end">
                <AppButton
                  type="submit"
                  disabled={!canSubmit || busy || isLoading}
                  className="min-w-[220px]"
                >
                  <Save size={16} />
                  Create schema
                </AppButton>
              </div>
            </div>
          </AppPanel>
          <div className="min-h-0 flex-1 overflow-hidden">
            <SchemaModelSelector models={models} value={selected} onChange={setSelected} />
          </div>
        </form>
      </AppSurface>
    </AppPage>
  );
}
