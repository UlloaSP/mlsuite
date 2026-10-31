/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { PencilLine, Save, Trash2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import {
  useDeleteApiClientMutation,
  useUpdateApiClientMutation,
} from "@/features/api-access/api/api-access.mutations";
import {
  ApiClientFormDialog,
  type ApiClientDetails,
} from "@/features/api-access/components/ApiClientFormDialog";
import { failureMessage } from "@/features/api-access/lib/api-format";
import { AppButton } from "@/shared/ui/AppButton";
import { AppInlineAlert } from "@/shared/ui/AppInlineAlert";
import { useActionDialog } from "@/shared/ui/use-action-dialog";
import type { ApiClientDto } from "@/shared/api/openapi.gen";

/** Renaming and deleting a client; only members who manage API access see this tab. */
export function ApiClientSettingsTab({ client }: { client: ApiClientDto }) {
  const navigate = useNavigate();
  const update = useUpdateApiClientMutation(client.client.id);
  const remove = useDeleteApiClientMutation();
  const { confirm, dialog } = useActionDialog();
  const [editing, setEditing] = useState(false);

  const save = async (details: ApiClientDetails) => {
    try {
      await update.mutateAsync(details);
      setEditing(false);
      toast.success("Client updated");
    } catch {
      // The dialog shows the API's words and keeps the input for a retry.
    }
  };

  const askDelete = async () => {
    const confirmed = await confirm({
      title: `Delete ${client.client.name}?`,
      description: `Its ${client.keys.length === 1 ? "key stops" : "keys stop"} working at once and its access is removed. Its past calls stay in the request log and its runs stay in Inferences.`,
      confirmLabel: "Delete client",
      danger: true,
    });
    if (!confirmed) return;
    try {
      await remove.mutateAsync(client.client.id);
      toast.success(`${client.client.name} was deleted`);
      void navigate("/api-access/clients");
    } catch {
      // The tab shows the mutation error.
    }
  };

  return (
    <div className="grid max-w-2xl gap-6">
      <section aria-label="Details" className="grid gap-3">
        <h2 className="text-sm font-semibold text-fg">Details</h2>
        <p className="text-sm text-fg-secondary">
          Runs this client makes carry its name as their author; a new name applies to later runs.
        </p>
        <div>
          <AppButton variant="secondary" onClick={() => setEditing(true)}>
            <PencilLine size={16} />
            Edit name and description
          </AppButton>
        </div>
      </section>
      <section aria-label="Delete client" className="grid gap-3 border-t border-line pt-6">
        <h2 className="text-sm font-semibold text-fg">Delete client</h2>
        {remove.error ? <AppInlineAlert>{failureMessage(remove.error)}</AppInlineAlert> : null}
        <div>
          <AppButton variant="danger" disabled={remove.isPending} onClick={() => void askDelete()}>
            <Trash2 size={16} />
            Delete client
          </AppButton>
        </div>
      </section>
      <ApiClientFormDialog
        title="Edit client"
        summary="The name is unique in this workspace whatever its case."
        defaults={{ name: client.client.name, description: client.client.description }}
        open={editing}
        pending={update.isPending}
        error={update.error ? failureMessage(update.error) : undefined}
        submitIcon={Save}
        submitLabel="Save changes"
        onClose={() => {
          update.reset();
          setEditing(false);
        }}
        onConfirm={(details) => void save(details)}
      />
      {dialog}
    </div>
  );
}
