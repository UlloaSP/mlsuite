/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { ArrowRight, FileCode } from "lucide-react";
import { AppBadge, cx } from "../../app/components";
import type { SignatureDto } from "../api/modelService";
import { formatTimestamp, getSignatureVersionLabel } from "../utils";

type SignatureListItemProps = {
  item: SignatureDto;
  onOpen: () => void;
};

export function SignatureListItem({ item, onOpen }: SignatureListItemProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cx(
        "grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-4 rounded-[22px] border border-[var(--border-soft)] bg-[var(--surface-primary)] p-5 text-left shadow-[var(--shadow-card)] transition",
        "hover:border-[var(--text-primary)] hover:shadow-[var(--shadow-hover)]",
      )}
    >
      <div className="flex size-12 items-center justify-center rounded-2xl bg-[var(--surface-muted)] text-[var(--accent-primary)]">
        <FileCode size={18} />
      </div>

      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-base font-semibold text-[var(--text-primary)]">
            {getSignatureVersionLabel(item)}
          </p>
          <AppBadge tone="success">active</AppBadge>
        </div>
        <p className="text-sm font-medium text-[var(--text-secondary)]">{item.name}</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--text-muted)]">
          <span>Created {formatTimestamp(item.createdAt)}</span>
          <span>{item.origin ? "Based on previous version" : "Initial version"}</span>
        </div>
      </div>

      <div className="flex size-10 items-center justify-center rounded-full text-[var(--text-muted)]">
        <ArrowRight size={16} />
      </div>
    </button>
  );
}
