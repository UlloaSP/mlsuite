/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useGrantApiClientBookmarkMutation } from "@/features/api-access/api/api-access.mutations";
import { useApiAccessBookmarks } from "@/features/api-access/api/api-access.queries";
import { failureMessage } from "@/features/api-access/lib/api-format";
import { AppButton } from "@/shared/ui/AppButton";
import { AppDialog } from "@/shared/ui/AppDialog";
import { AppEmptyState } from "@/shared/ui/AppEmptyState";
import { AppLoadingState } from "@/shared/ui/AppLoadingState";
import { AppCombobox } from "@/shared/ui/AppCombobox";
import { AppSpinner } from "@/shared/ui/AppSpinner";
import type { ApiClientDto } from "@/shared/api/openapi.gen";

type Props = { client: ApiClientDto; open: boolean; onClose: () => void };

/**
 * Gives the client one more bookmark to run. Any bookmark of an active schema may be given,
 * public or not; one clients cannot run yet says why, and runs once its snapshot allows it.
 */
export function GrantBookmarkDialog({ client, open, onClose }: Props) {
  const bookmarks = useApiAccessBookmarks(open);
  const grant = useGrantApiClientBookmarkMutation(client.client.id);
  const [selected, setSelected] = useState<number | null>(null);
  const given = new Set(client.bookmarks.map((bookmark) => bookmark.id));
  const items = (bookmarks.data ?? [])
    .filter((bookmark) => !given.has(bookmark.id))
    .map((bookmark) => ({
      id: bookmark.id,
      label: `${bookmark.schemaName} › ${bookmark.name}`,
      description: bookmark.refusal ? "Cannot run yet" : bookmark.modelName,
    }));
  const chosen = bookmarks.data?.find((bookmark) => bookmark.id === selected);

  const close = () => {
    grant.reset();
    setSelected(null);
    onClose();
  };

  const save = async () => {
    if (!chosen) return;
    try {
      await grant.mutateAsync(chosen.id);
      toast.success(`${client.client.name} may run ${chosen.name}`);
      close();
    } catch {
      // The dialog shows the API's words.
    }
  };

  return (
    <AppDialog
      open={open}
      busy={grant.isPending}
      error={grant.error ? failureMessage(grant.error) : undefined}
      onClose={close}
      title={`Give ${client.client.name} a bookmark`}
      description="The client may run the bookmark's model through the API whether or not the bookmark is public."
      footer={
        <>
          <AppButton type="button" variant="secondary" onClick={close}>
            Cancel
          </AppButton>
          <AppButton disabled={!chosen || grant.isPending} onClick={() => void save()}>
            {grant.isPending ? <AppSpinner size={16} /> : <Plus size={16} />}
            Give bookmark
          </AppButton>
        </>
      }
    >
      {bookmarks.isLoading ? (
        <AppLoadingState compact label="Loading bookmarks…" />
      ) : bookmarks.error ? (
        <AppEmptyState
          compact
          title="Bookmarks did not load"
          description={failureMessage(bookmarks.error)}
        />
      ) : items.length === 0 ? (
        <AppEmptyState
          compact
          title="No bookmark left to give"
          description="The client already has every bookmark of an active schema."
        />
      ) : (
        <div className="grid gap-2">
          <AppCombobox
            aria-label="Bookmark"
            placeholder="Search bookmarks"
            value={selected}
            items={items}
            onChange={(item) => setSelected(item?.id ?? null)}
          />
          {chosen?.refusal ? <p className="text-xs text-warning-fg">{chosen.refusal}</p> : null}
        </div>
      )}
    </AppDialog>
  );
}
