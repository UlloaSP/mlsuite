/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useNavigate } from "react-router";
import { useCreateSchemaDraftMutation } from "@/features/schemas/api/schema-draft-mutations";
import { SchemaChangeNameDialog } from "@/features/schemas/components/SchemaChangeNameDialog";
import type { SchemaVersionDto } from "@/shared/api/openapi.gen";

type Props = {
  schemaId: string;
  /** The snapshot the change starts from; the dialog is open while one is set. */
  baseVersion: SchemaVersionDto | null;
  onClose: () => void;
};

export function CreateSchemaChangeDialog({ schemaId, baseVersion, onClose }: Props) {
  const navigate = useNavigate();
  const mutation = useCreateSchemaDraftMutation(schemaId);

  const create = async (name: string) => {
    if (!baseVersion) return;
    try {
      const draft = await mutation.mutateAsync({
        name,
        baseVersionId: baseVersion.id,
      });
      onClose();
      void navigate(`/schemas/${schemaId}/drafts/${draft.id}`);
    } catch {
      // The dialog shows the mutation error and stays open for a retry.
    }
  };

  return (
    <SchemaChangeNameDialog
      defaultName="Update schema"
      description={
        baseVersion ? `${baseVersion.name} · v${baseVersion.version}` : "Selected snapshot"
      }
      open={Boolean(baseVersion)}
      error={mutation.error?.message}
      pending={mutation.isPending}
      submitLabel="Create change"
      title="New change"
      onClose={() => {
        mutation.reset();
        onClose();
      }}
      onConfirm={(name) => void create(name)}
    />
  );
}
