/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { schemaVersionName } from "@/features/schemas/lib/version-selection";
import { Tag } from "lucide-react";
import { toast } from "sonner";
import { useCreateSchemaBookmarkMutation } from "@/features/schemas/api/schema-mutations";
import {
  BookmarkDetailsDialog,
  type BookmarkDetails,
} from "@/features/schemas/components/BookmarkDetailsDialog";
import type { SchemaVersionDto } from "@/shared/api/openapi.gen";

type Props = {
  schemaId: string;
  /** The snapshot to bookmark; the dialog is open while one is set. */
  version: SchemaVersionDto | null;
  onClose: () => void;
};

export function BookmarkSnapshotDialog({ schemaId, version, onClose }: Props) {
  const mutation = useCreateSchemaBookmarkMutation(schemaId);

  const create = async (details: BookmarkDetails) => {
    if (!version) return;
    try {
      await mutation.mutateAsync({ ...details, versionId: version.id });
      onClose();
      toast.success("Bookmark saved");
    } catch {
      // The dialog shows the mutation error and stays open for a retry.
    }
  };

  return (
    <BookmarkDetailsDialog
      title="Bookmark snapshot"
      summary={version ? `${schemaVersionName(version)} · v${version.version}` : "Snapshot"}
      defaultName={version ? schemaVersionName(version).toLowerCase().replace(/\s+/g, "-") : ""}
      defaultDescription=""
      open={Boolean(version)}
      error={mutation.error?.message}
      pending={mutation.isPending}
      submitIcon={Tag}
      submitLabel="Save bookmark"
      onClose={() => {
        mutation.reset();
        onClose();
      }}
      onConfirm={(details) => void create(details)}
    />
  );
}
