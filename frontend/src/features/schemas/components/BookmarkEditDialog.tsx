/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Save } from "lucide-react";
import { toast } from "sonner";
import { useUpdateSchemaBookmarkMutation } from "@/features/schemas/api/schema-mutations";
import {
  BookmarkDetailsDialog,
  type BookmarkDetails,
} from "@/features/schemas/components/BookmarkDetailsDialog";
import type { SchemaBookmarkDto } from "@/shared/api/openapi.gen";

type Props = {
  bookmark: SchemaBookmarkDto;
  open: boolean;
  onClose: () => void;
};

/** Renames a bookmark and edits its texts; its link, examples and runs stay with it. */
export function BookmarkEditDialog({ bookmark, open, onClose }: Props) {
  const mutation = useUpdateSchemaBookmarkMutation();

  const save = async (details: BookmarkDetails) => {
    try {
      await mutation.mutateAsync({ bookmarkId: bookmark.id, ...details });
      onClose();
      toast.success("Bookmark updated");
    } catch {
      // The dialog shows the mutation error and stays open for a retry.
    }
  };

  return (
    <BookmarkDetailsDialog
      title="Edit bookmark"
      summary={
        bookmark.visibility === "PUBLIC"
          ? "This bookmark is public: its name, description and note change on its public page too."
          : "Runs, examples and links keep pointing to this bookmark under its new name."
      }
      defaultName={bookmark.name}
      defaultDescription={bookmark.description ?? ""}
      defaultPublicationNote={bookmark.publicationNote ?? ""}
      open={open}
      error={mutation.error?.message}
      pending={mutation.isPending}
      submitIcon={Save}
      submitLabel="Save changes"
      onClose={() => {
        mutation.reset();
        onClose();
      }}
      onConfirm={(details) => void save(details)}
    />
  );
}
