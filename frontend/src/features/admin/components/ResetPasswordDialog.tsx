import { Eye, EyeOff, KeyRound } from "lucide-react";
import { useState } from "react";
import { AppButton } from "@/shared/ui/AppButton";
import { AppDialog } from "@/shared/ui/AppDialog";
import { AppIconButton } from "@/shared/ui/AppIconButton";
import { AppTextField } from "@/shared/ui/AppTextField";

export function ResetPasswordDialog({
  fullName,
  isPending,
  error,
  onClose,
  onSubmit,
}: {
  fullName: string;
  isPending: boolean;
  error?: string;
  onClose: () => void;
  onSubmit: (password: string) => void;
}) {
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const canSubmit = password.length >= 10 && !isPending;

  return (
    <AppDialog
      open
      size="md"
      busy={isPending}
      error={error}
      onClose={onClose}
      title="Reset password"
      description={fullName}
      onSubmit={(event) => {
        event.preventDefault();
        if (canSubmit) onSubmit(password);
      }}
      footer={
        <>
          <AppButton type="button" variant="secondary" onClick={onClose}>
            Cancel
          </AppButton>
          <AppButton type="submit" disabled={!canSubmit}>
            <KeyRound size={16} /> Reset
          </AppButton>
        </>
      }
    >
      <div className="grid gap-2">
        <label htmlFor="reset-password" className="text-sm font-semibold text-fg-secondary">
          New password
        </label>
        <div className="flex items-center gap-2">
          <AppTextField
            id="reset-password"
            required
            autoFocus
            type={visible ? "text" : "password"}
            minLength={10}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Minimum 10 characters"
            className="min-w-0 flex-1"
            aria-label="New password"
          />
          <AppIconButton
            type="button"
            aria-label={visible ? "Hide password" : "Show password"}
            onClick={() => setVisible((current) => !current)}
            className="shrink-0 border-line bg-surface"
          >
            {visible ? <EyeOff size={18} /> : <Eye size={18} />}
          </AppIconButton>
        </div>
      </div>
    </AppDialog>
  );
}
