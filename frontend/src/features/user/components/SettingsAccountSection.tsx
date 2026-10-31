import { useState } from "react";
import { useDeleteAccount } from "@/capabilities/workspace-context/session";
import { AppButton } from "@/shared/ui/AppButton";
import { AppDialog } from "@/shared/ui/AppDialog";
import { AppTextField } from "@/shared/ui/AppTextField";

/** The danger zone: closing the account for good, confirmed with its current password. */
export function SettingsAccountSection() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const deletion = useDeleteAccount();
  const close = () => {
    setOpen(false);
    setPassword("");
    deletion.reset();
  };

  return (
    <section aria-labelledby="danger-zone" className="flex flex-col gap-3 py-6">
      <h2 id="danger-zone" className="text-base font-semibold text-danger-fg">
        Danger zone
      </h2>
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-card border border-danger-border p-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-fg">Delete your account</p>
          <p className="text-sm text-fg-secondary">
            Your personal account and everything in it are destroyed for good. What you did in
            organizations stays with them, under &ldquo;Deleted user&rdquo;.
          </p>
        </div>
        <AppButton variant="danger" onClick={() => setOpen(true)}>
          Delete account
        </AppButton>
      </div>
      <AppDialog
        open={open}
        busy={deletion.isPending}
        error={deletion.error?.message}
        onClose={close}
        title="Delete your account?"
        description="You are signed out everywhere at once. This cannot be undone. If you are the only owner of an organization with members or content, transfer or delete it first."
        onSubmit={(event) => {
          event.preventDefault();
          if (password) deletion.mutate(password);
        }}
        footer={
          <>
            <AppButton type="button" variant="secondary" onClick={close}>
              Cancel
            </AppButton>
            <AppButton type="submit" variant="danger" disabled={!password || deletion.isPending}>
              {deletion.isPending ? "Deleting…" : "Delete account"}
            </AppButton>
          </>
        }
      >
        <AppTextField
          aria-label="Current password"
          placeholder="Current password"
          className="w-full"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </AppDialog>
    </section>
  );
}
