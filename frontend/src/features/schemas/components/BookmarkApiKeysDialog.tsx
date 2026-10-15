/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { isHttpError } from "@/shared/api/http";
import {
  useCreateBookmarkApiKeyMutation,
  useRevokeBookmarkApiKeyMutation,
} from "@/features/schemas/api/schema-mutations";
import { useBookmarkApiKeys } from "@/features/schemas/api/schema-queries";
import { BookmarkApiDocsPanel } from "@/features/schemas/components/BookmarkApiDocsPanel";
import { BookmarkApiKeyForm } from "@/features/schemas/components/BookmarkApiKeyForm";
import { BookmarkApiKeyList } from "@/features/schemas/components/BookmarkApiKeyList";
import { BookmarkApiKeySecret } from "@/features/schemas/components/BookmarkApiKeySecret";
import { apiDocsMarkdown } from "@/features/schemas/lib/bookmark-api-docs";
import { useBookmarkApiDocs } from "@/features/schemas/lib/use-bookmark-api-docs";
import { AppButton } from "@/shared/ui/AppButton";
import { AppDialog } from "@/shared/ui/AppDialog";
import { AppEmptyState } from "@/shared/ui/AppEmptyState";
import { AppLoadingState } from "@/shared/ui/AppLoadingState";
import { AppSegmentedControl } from "@/shared/ui/AppSegmentedControl";
import { cx } from "@/shared/ui/cx";
import { useActionDialog } from "@/shared/ui/use-action-dialog";
import type { BookmarkApiKeyDto, SchemaBookmarkDto } from "@/shared/api/openapi.gen";

type Tab = "keys" | "docs";

const TABS = [
  { value: "keys", label: "Keys" },
  { value: "docs", label: "API docs" },
] as const;

type Props = {
  bookmark: SchemaBookmarkDto;
  open: boolean;
  onClose: () => void;
};

const failure = (error: unknown) =>
  isHttpError(error) ? error.message : "The request failed. Try again.";

async function copyText(text: string, copied: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(copied);
  } catch {
    toast.error("Could not copy", { description: "Select the text in the preview and copy it." });
  }
}

/**
 * The API keys of a bookmark, one per consumer that runs its model over HTTP, and the
 * documentation of the endpoint they open. A secret is shown only when its key is created and
 * lives only in this dialog, so closing it forgets it.
 */
export function BookmarkApiKeysDialog({ bookmark, open, onClose }: Props) {
  const [tab, setTab] = useState<Tab>("keys");
  const keys = useBookmarkApiKeys(open ? bookmark.id : undefined);
  const api = useBookmarkApiDocs(bookmark, open && tab === "docs");
  const create = useCreateBookmarkApiKeyMutation(bookmark.id);
  const revoke = useRevokeBookmarkApiKeyMutation(bookmark.id);
  const { confirm, dialog } = useActionDialog();
  const [name, setName] = useState("");
  const [issued, setIssued] = useState<{ name: string; secret: string } | null>(null);
  const error = create.error ?? revoke.error;

  const close = () => {
    create.reset();
    revoke.reset();
    setName("");
    setIssued(null);
    setTab("keys");
    onClose();
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    revoke.reset();
    try {
      const result = await create.mutateAsync({ name: name.trim() });
      setIssued({ name: result.key.name, secret: result.secret });
      // The mutation would keep the secret in its own state for as long as this dialog is mounted.
      create.reset();
      setName("");
    } catch {
      // The dialog shows the mutation error and keeps the name for a retry.
    }
  };

  const askRevoke = async (apiKey: BookmarkApiKeyDto) => {
    const confirmed = await confirm({
      title: `Revoke ${apiKey.name}?`,
      description: `Requests that use this key stop working immediately. This cannot be undone: ${apiKey.name} needs a new key to run ${bookmark.name} again.`,
      confirmLabel: "Revoke",
      danger: true,
    });
    if (!confirmed) return;
    create.reset();
    try {
      await revoke.mutateAsync(apiKey.id);
      toast.success(`${apiKey.name} was revoked`);
    } catch {
      // The dialog shows the mutation error.
    }
  };

  const { docs } = api;
  return (
    <>
      <AppDialog
        open={open}
        size="xl"
        busy={create.isPending}
        onClose={close}
        title={`API keys of ${bookmark.name}`}
        description="Each key lets one consumer run this bookmark's model over HTTP without signing in. Keys never expire; revoke the ones you no longer trust."
        error={error ? failure(error) : undefined}
        footer={
          <>
            {tab === "docs" ? (
              <>
                <AppButton
                  variant="secondary"
                  disabled={!docs?.curl}
                  onClick={() => docs?.curl && void copyText(docs.curl, "cURL example copied")}
                >
                  Copy cURL
                </AppButton>
                <AppButton
                  variant="secondary"
                  disabled={!docs}
                  onClick={() => docs && void copyText(apiDocsMarkdown(docs), "Docs copied")}
                >
                  Copy docs
                </AppButton>
              </>
            ) : null}
            <AppButton disabled={create.isPending} onClick={close}>
              Close
            </AppButton>
          </>
        }
      >
        <div className="grid gap-5">
          <AppSegmentedControl
            size="md"
            label="Section"
            options={TABS}
            value={tab}
            onChange={setTab}
          />
          {tab === "docs" ? (
            api.isLoading ? (
              <AppLoadingState compact label="Loading the API docs…" />
            ) : api.error ? (
              <AppEmptyState
                compact
                title="The API docs did not load"
                description={failure(api.error)}
                action={
                  <AppButton variant="secondary" onClick={() => void api.refetch()}>
                    Try again
                  </AppButton>
                }
              />
            ) : docs ? (
              <BookmarkApiDocsPanel docs={docs} />
            ) : null
          ) : null}
          {/* The keys stay mounted so a fresh secret survives a look at the docs. */}
          <div className={cx("gap-5", tab === "keys" ? "grid" : "hidden")}>
            {bookmark.visibility === "PUBLIC" ? null : (
              <p className="text-sm leading-6 text-fg-secondary">
                This bookmark is private. Its keys can be created now but work only while it is
                published.
              </p>
            )}
            {issued ? (
              <BookmarkApiKeySecret
                name={issued.name}
                secret={issued.secret}
                onDismiss={() => setIssued(null)}
              />
            ) : null}
            <BookmarkApiKeyForm
              name={name}
              pending={create.isPending}
              onNameChange={setName}
              onSubmit={(event) => void submit(event)}
            />
            <BookmarkApiKeyList
              keys={keys.data}
              isLoading={keys.isLoading}
              error={keys.error ? failure(keys.error) : undefined}
              disabled={revoke.isPending}
              onRetry={() => void keys.refetch()}
              onRevoke={(target) => void askRevoke(target)}
            />
          </div>
        </div>
      </AppDialog>
      {dialog}
    </>
  );
}
