/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { KeyRound } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useIssueApiClientKeyMutation } from "@/features/api-access/api/api-access.mutations";
import { KeySecretPanel } from "@/features/api-access/components/KeySecretPanel";
import { failureMessage } from "@/features/api-access/lib/api-format";
import { AppButton } from "@/shared/ui/AppButton";
import { AppDialog } from "@/shared/ui/AppDialog";
import { AppSpinner } from "@/shared/ui/AppSpinner";
import { AppTextField } from "@/shared/ui/AppTextField";

const NAME_MAX_LENGTH = 80;

type Props = { clientId: number; clientName: string; open: boolean; onClose: () => void };

/**
 * Issues one key and shows its secret once. The secret lives only in this dialog, so closing
 * it forgets it; while it is shown, the dialog closes only by saying it was stored.
 */
export function IssueKeyDialog({ clientId, clientName, open, onClose }: Props) {
  const issue = useIssueApiClientKeyMutation(clientId);
  const [issued, setIssued] = useState<{ name: string; secret: string } | null>(null);

  const close = () => {
    issue.reset();
    setIssued(null);
    onClose();
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = new FormData(event.currentTarget).get("name");
    if (typeof name !== "string" || !name.trim()) return;
    try {
      const result = await issue.mutateAsync({ name: name.trim() });
      setIssued({ name: result.key.name, secret: result.secret });
      // The mutation would keep the secret in its own state for as long as this dialog is mounted.
      issue.reset();
    } catch {
      // The dialog shows the API's words and keeps the name for a retry.
    }
  };

  return (
    <AppDialog
      open={open}
      busy={issue.isPending || issued !== null}
      error={issue.error ? failureMessage(issue.error) : undefined}
      onClose={close}
      title={`Issue a key for ${clientName}`}
      description="Name the key after where it is used, so it can be replaced and revoked on its own."
      onSubmit={issued ? undefined : (event) => void submit(event)}
      footer={
        issued ? null : (
          <>
            <AppButton type="button" variant="secondary" onClick={close}>
              Cancel
            </AppButton>
            <AppButton type="submit" disabled={issue.isPending}>
              {issue.isPending ? <AppSpinner size={16} /> : <KeyRound size={16} />}
              Issue key
            </AppButton>
          </>
        )
      }
    >
      {issued ? (
        <KeySecretPanel name={issued.name} secret={issued.secret} onDismiss={close} />
      ) : (
        <div className="grid gap-2">
          <label htmlFor="api-key-name" className="text-sm font-semibold text-fg">
            Key name
          </label>
          <AppTextField
            id="api-key-name"
            name="name"
            placeholder="Production"
            maxLength={NAME_MAX_LENGTH}
            required
          />
        </div>
      )}
    </AppDialog>
  );
}
