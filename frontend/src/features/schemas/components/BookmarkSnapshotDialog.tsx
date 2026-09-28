/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Tag } from "lucide-react";
import { toast } from "sonner";
import type { SchemaVersionDto } from "@/features/schemas/api/schema-types";
import { useCreateSchemaBookmarkMutation } from "@/features/schemas/api/schema-mutations";
import { SchemaChangeNameDialog } from "@/features/schemas/components/SchemaChangeNameDialog";
import { schemaVersionId } from "@/features/schemas/lib/version-selection";

type Props = {
  schemaId: string;
  /** The snapshot to bookmark; the dialog is open while one is set. */
  version: SchemaVersionDto | null;
  onClose: () => void;
};

export function BookmarkSnapshotDialog({ schemaId, version, onClose }: Props) {
  const mutation = useCreateSchemaBookmarkMutation(schemaId);

  const create = async (name: string) => {
    if (!version) return;
    try {
      await mutation.mutateAsync({ name, versionId: schemaVersionId(version) });
      onClose();
      toast.success("Bookmark saved");
    } catch {
      // The dialog shows the mutation error and stays open for a retry.
    }
  };

  return (
    <SchemaChangeNameDialog
      defaultName={version ? version.name.toLowerCase().replace(/\s+/g, "-") : ""}
      description={version ? `${version.name} · v${version.version}` : "Snapshot"}
      fieldLabel="Bookmark name"
      open={Boolean(version)}
      error={mutation.error?.message}
      pending={mutation.isPending}
      placeholder="production"
      submitIcon={Tag}
      submitLabel="Save bookmark"
      title="Bookmark snapshot"
      onClose={() => {
        mutation.reset();
        onClose();
      }}
      onConfirm={(name) => void create(name)}
    />
  );
}
