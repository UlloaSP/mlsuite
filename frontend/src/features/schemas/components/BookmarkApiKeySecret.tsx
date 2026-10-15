/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { AppButton } from "@/shared/ui/AppButton";
import { AppTextField } from "@/shared/ui/AppTextField";

type Props = {
  name: string;
  secret: string;
  onDismiss: () => void;
};

/** A key's secret, shown once at creation: the API keeps only its prefix and a hash. */
export function BookmarkApiKeySecret({ name, secret, onDismiss }: Props) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(secret);
      toast.success("API key copied");
    } catch {
      toast.error("Could not copy the key", { description: "Select it and copy it by hand." });
    }
  };

  return (
    <section
      aria-label={`Secret of ${name}`}
      className="grid gap-3 rounded-card border border-line bg-surface-muted p-4"
    >
      <p className="text-sm leading-6 text-fg">
        <strong className="font-semibold">Copy the key for {name} now.</strong> It will not be shown
        again. Store it securely: anyone who has it can run this bookmark's model.
      </p>
      <div className="flex gap-2">
        <AppTextField
          aria-label="API key secret"
          readOnly
          className="min-w-0 flex-1 font-mono"
          value={secret}
          onFocus={(event) => event.currentTarget.select()}
        />
        <AppButton variant="secondary" onClick={() => void copy()}>
          <Copy size={16} />
          Copy
        </AppButton>
      </div>
      <div className="flex justify-end">
        <AppButton size="sm" variant="secondary" onClick={onDismiss}>
          <Check size={14} />I have stored it
        </AppButton>
      </div>
    </section>
  );
}
