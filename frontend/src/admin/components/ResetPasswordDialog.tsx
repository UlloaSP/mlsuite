import { Eye, EyeOff, KeyRound, X } from "lucide-react";
import { useState } from "react";
import {
  AppButton,
  AppCopy,
  AppIconButton,
  AppPanel,
  AppSectionTitle,
  AppTextField,
} from "../../app/components";

export function ResetPasswordDialog({
  fullName,
  isPending,
  onClose,
  onSubmit,
}: {
  fullName: string;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (password: string) => void;
}) {
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const canSubmit = password.length >= 10 && !isPending;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/35 p-4">
      <AppPanel className="w-full max-w-[460px] rounded-[24px] bg-[var(--surface-primary)] p-0">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border-soft)] px-5 py-4">
          <div className="min-w-0">
            <AppSectionTitle>Reset Password</AppSectionTitle>
            <AppCopy className="mt-1 leading-6">{fullName}</AppCopy>
          </div>
          <AppIconButton type="button" aria-label="Close reset password dialog" onClick={onClose}>
            <X size={18} />
          </AppIconButton>
        </div>
        <div className="grid gap-4 p-5">
          <div className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
              New password
            </span>
            <div className="flex items-center gap-2">
              <AppTextField
                required
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
                className="shrink-0 border-[var(--border-soft)] bg-[var(--surface-primary)]"
              >
                {visible ? <EyeOff size={18} /> : <Eye size={18} />}
              </AppIconButton>
            </div>
          </div>
          <div className="flex flex-wrap justify-end gap-3">
            <AppButton type="button" variant="secondary" onClick={onClose}>
              Cancel
            </AppButton>
            <AppButton type="button" disabled={!canSubmit} onClick={() => onSubmit(password)}>
              <KeyRound size={16} /> Reset
            </AppButton>
          </div>
        </div>
      </AppPanel>
    </div>
  );
}
