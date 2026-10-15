/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Ban } from "lucide-react";
import type { FormEvent } from "react";
import { AppButton } from "@/shared/ui/AppButton";
import { AppDialog } from "@/shared/ui/AppDialog";
import { AppSpinner } from "@/shared/ui/AppSpinner";
import { AppTextArea } from "@/shared/ui/AppTextArea";
import type { AdminApiClientDto } from "@/shared/api/openapi.gen";

const REASON_MAX_LENGTH = 400;

type Props = {
  client: AdminApiClientDto;
  pending: boolean;
  error?: string;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
};

/** Suspends a client with the reason its organization is shown; the platform alone undoes it. */
export function SuspendClientDialog({ client, pending, error, onCancel, onConfirm }: Props) {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const reason = new FormData(event.currentTarget).get("reason");
    if (typeof reason === "string" && reason.trim()) onConfirm(reason.trim());
  };

  return (
    <AppDialog
      open
      busy={pending}
      error={error}
      onClose={onCancel}
      title={`Suspend ${client.name}?`}
      description={`Every call of this client is refused at once, and ${client.organizationName} cannot give it new keys or bookmarks until you reinstate it. The suspension is kept in the organization's audit log.`}
      onSubmit={submit}
      footer={
        <>
          <AppButton type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </AppButton>
          <AppButton type="submit" variant="danger" disabled={pending}>
            {pending ? <AppSpinner size={16} /> : <Ban size={16} />}
            Suspend client
          </AppButton>
        </>
      }
    >
      <div className="grid gap-2">
        <label htmlFor="suspension-reason" className="text-sm font-semibold text-fg">
          Reason
        </label>
        <AppTextArea
          id="suspension-reason"
          name="reason"
          placeholder="Calls far beyond fair use since 14 Oct; contact the platform team."
          maxLength={REASON_MAX_LENGTH}
          rows={3}
          required
        />
        <p className="text-xs leading-5 text-fg-muted">
          The organization reads this on the client.
        </p>
      </div>
    </AppDialog>
  );
}
