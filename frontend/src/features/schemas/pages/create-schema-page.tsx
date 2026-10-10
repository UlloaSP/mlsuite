/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { AppPage } from "@/shared/ui/AppPage";
import { AppPageHeader } from "@/shared/ui/PageHeader";
import { AppSurface } from "@/shared/ui/AppSurface";
import { SchemaCreateSummary } from "@/features/schemas/components/SchemaCreateSummary";
import {
  SchemaModelPicker,
  type SchemaModelCatalog,
} from "@/features/schemas/components/SchemaModelPicker";
import { useCreateSchemaWithInitialVersionMutation } from "@/features/schemas/api/schema-mutations";
import { countVisibleSchemaFields } from "@/features/schemas/lib/one-hot-category";
import { toExecutableSchemaVersion } from "@/capabilities/prediction-runtime/mlform/executable-schema";
import { composeSchemaVersion, type SchemaSourceModel } from "@/features/schemas/lib/merge";

type Props = {
  catalog: SchemaModelCatalog;
  search: string;
  onSearchChange: (search: string) => void;
  initialModels: SchemaSourceModel[];
  isLoading: boolean;
};
export function CreateSchemaPage({
  catalog,
  search,
  onSearchChange,
  initialModels,
  isLoading,
}: Props) {
  const navigate = useNavigate();
  const createSchema = useCreateSchemaWithInitialVersionMutation();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selection, setSelected] = useState<SchemaSourceModel[] | null>(null);
  const [submitError, setSubmitError] = useState<string>();
  const selected = selection ?? initialModels;

  const composedVersion = useMemo(() => composeSchemaVersion("v1", selected), [selected]);
  const canSubmit = name.trim().length > 0 && selected.length > 0;
  const busy = createSchema.isPending;
  const fieldCount = countVisibleSchemaFields(composedVersion.formSchema);
  const reportCount = Array.isArray(composedVersion.formSchema.reports)
    ? composedVersion.formSchema.reports.length
    : 0;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitError(undefined);
    if (!canSubmit || busy) return;
    try {
      const preparedVersion = toExecutableSchemaVersion(composedVersion);
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
      setSubmitError(
        `Schema create failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  };

  return (
    <AppPage>
      <AppSurface className="flex min-h-0 flex-1 flex-col gap-6 overflow-auto lg:overflow-hidden">
        <AppPageHeader
          title="New schema"
          description="Pick the models whose inputs and reports the schema combines, then name it."
          breadcrumbs={[{ label: "Schemas", to: "/schemas" }, { label: "New schema" }]}
        />
        <form className="flex flex-col gap-4 lg:min-h-0 lg:flex-1 lg:flex-row" onSubmit={submit}>
          <SchemaModelPicker
            catalog={catalog}
            search={search}
            onSearchChange={onSearchChange}
            value={selected}
            onChange={setSelected}
          />
          <SchemaCreateSummary
            busy={busy}
            canSubmit={canSubmit && !isLoading}
            description={description}
            error={submitError}
            fieldCount={fieldCount}
            name={name}
            reportCount={reportCount}
            selected={selected}
            onDescriptionChange={setDescription}
            onNameChange={setName}
            onRemove={(id) => setSelected(selected.filter((item) => String(item.id) !== id))}
          />
        </form>
      </AppSurface>
    </AppPage>
  );
}
