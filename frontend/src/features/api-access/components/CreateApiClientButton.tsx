/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Plus } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { useCreateApiClientMutation } from "@/features/api-access/api/api-access.mutations";
import {
  ApiClientFormDialog,
  type ApiClientDetails,
} from "@/features/api-access/components/ApiClientFormDialog";
import { failureMessage } from "@/features/api-access/lib/api-format";
import { AppButton } from "@/shared/ui/AppButton";

/** Creates a client and opens its page, where its first key is issued. */
export function CreateApiClientButton() {
  const navigate = useNavigate();
  const create = useCreateApiClientMutation();
  const [open, setOpen] = useState(false);

  const close = () => {
    create.reset();
    setOpen(false);
  };

  const save = async (details: ApiClientDetails) => {
    try {
      const created = await create.mutateAsync(details);
      toast.success(`${created.client.name} was created`);
      void navigate(`/api-access/clients/${created.client.id}?tab=keys`);
    } catch {
      // The dialog shows the API's words and keeps the input for a retry.
    }
  };

  return (
    <>
      <AppButton onClick={() => setOpen(true)}>
        <Plus size={16} />
        Create client
      </AppButton>
      <ApiClientFormDialog
        title="Create client"
        summary="A client is one piece of outside software. It calls with its own keys and runs only the bookmarks you give it."
        defaults={{ name: "", description: null }}
        open={open}
        pending={create.isPending}
        error={create.error ? failureMessage(create.error) : undefined}
        submitIcon={Plus}
        submitLabel="Create client"
        onClose={close}
        onConfirm={(details) => void save(details)}
      />
    </>
  );
}
