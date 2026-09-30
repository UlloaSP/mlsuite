/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Copy } from "lucide-react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { useDuplicateSchemaMutation } from "@/features/schemas/api/schema-mutations";
import { SchemaChangeNameDialog } from "@/features/schemas/components/SchemaChangeNameDialog";
import type { SchemaVersionDto } from "@/shared/api/openapi.gen";

type Props = {
  schemaId: string;
  schemaName?: string;
  /** The snapshot the new schema starts from; the dialog is open while one is set. */
  version: SchemaVersionDto | null;
  onClose: () => void;
};

export function CloneSchemaDialog({ schemaId, schemaName, version, onClose }: Props) {
  const navigate = useNavigate();
  const mutation = useDuplicateSchemaMutation();

  const clone = async (name: string) => {
    if (!version) return;
    try {
      const copy = await mutation.mutateAsync({
        id: schemaId,
        name,
        versionId: version.id,
      });
      onClose();
      toast.success("Schema created from snapshot");
      void navigate(`/schemas/${copy.id}`);
    } catch {
      // The dialog shows the mutation error and stays open for a retry.
    }
  };

  return (
    <SchemaChangeNameDialog
      defaultName={`${schemaName ?? "Schema"} Copy`}
      description={
        version
          ? `Create an independent schema with ${version.name} · v${version.version} as its first snapshot.`
          : "Selected snapshot"
      }
      fieldLabel="Schema name"
      open={Boolean(version)}
      error={mutation.error?.message}
      pending={mutation.isPending}
      placeholder="New schema"
      submitIcon={Copy}
      submitLabel="Create schema"
      title="Create schema from snapshot"
      onClose={() => {
        mutation.reset();
        onClose();
      }}
      onConfirm={(name) => void clone(name)}
    />
  );
}
