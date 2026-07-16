/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Ellipsis, Pencil, Share2, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { OrganizationMembershipRowDto } from "../../api/workspace/dtos";
import { AppButton, AppIconButton, cx } from "../../app/components";

export function OrganizationCardMenu({
  disabled,
  onDelete,
  onEditDescription,
  onEditName,
  onEditSlug,
  onTransferOwner,
}: {
  disabled: boolean;
  onDelete: () => void;
  onEditDescription: () => void;
  onEditName: () => void;
  onEditSlug: () => void;
  onTransferOwner: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, []);
  const items = [
    { label: "Edit name", icon: Pencil, onClick: onEditName },
    { label: "Edit slug", icon: Pencil, onClick: onEditSlug },
    { label: "Edit description", icon: Pencil, onClick: onEditDescription },
    { label: "Transfer owner", icon: Share2, onClick: onTransferOwner },
    { label: "Delete", icon: Trash2, onClick: onDelete, danger: true },
  ];
  return (
    <div ref={ref} className="relative">
      <AppIconButton
        type="button"
        aria-label="Organization actions"
        disabled={disabled}
        className="size-8 rounded"
        onClick={() => setOpen((current) => !current)}
      >
        <Ellipsis size={16} />
      </AppIconButton>
      {open ? (
        <div className="absolute right-0 top-[calc(100%+0.5rem)] z-20 min-w-[190px] rounded border border-[var(--border-soft)] bg-[var(--surface-primary)] p-2 shadow-[var(--shadow-hover)]">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                type="button"
                className={cx(
                  "flex w-full items-center gap-3 rounded px-3 py-2.5 text-left text-sm font-medium hover:bg-[var(--surface-muted)]",
                  item.danger && "text-[var(--danger-text)] hover:bg-[var(--danger-quiet)]",
                )}
                onClick={() => {
                  item.onClick();
                  setOpen(false);
                }}
              >
                <Icon size={15} />
                {item.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function DeleteDialog({
  disabled,
  name,
  onCancel,
  onConfirm,
}: {
  disabled: boolean;
  name: string;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 p-4">
      <div className="w-full max-w-sm rounded border border-[var(--border-soft)] bg-[var(--surface-primary)] p-5 shadow-[var(--shadow-hover)]">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Delete organization?</h2>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          {name} will be deleted only if it has no models, schemas, plugins, teams, invitations, or
          audit events.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <AppButton type="button" variant="secondary" onClick={onCancel} disabled={disabled}>
            Cancel
          </AppButton>
          <AppButton
            type="button"
            variant="danger"
            disabled={disabled}
            onClick={() => void onConfirm()}
          >
            Delete
          </AppButton>
        </div>
      </div>
    </div>
  );
}

export function TransferOwnerDialog({
  disabled,
  members,
  onCancel,
  onConfirm,
}: {
  disabled: boolean;
  members: OrganizationMembershipRowDto[];
  onCancel: () => void;
  onConfirm: (membershipId: number) => Promise<void>;
}) {
  const [selected, setSelected] = useState("");
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 p-4">
      <div className="w-full max-w-sm rounded border border-[var(--border-soft)] bg-[var(--surface-primary)] p-5 shadow-[var(--shadow-hover)]">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Transfer owner</h2>
        <select
          value={selected}
          onChange={(event) => setSelected(event.target.value)}
          className="mt-4 w-full rounded border border-[var(--border-soft)] bg-[var(--surface-primary)] px-3 py-2 text-sm text-[var(--text-primary)]"
        >
          <option value="">Select member</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.fullName} - {member.email}
            </option>
          ))}
        </select>
        <div className="mt-5 flex justify-end gap-2">
          <AppButton type="button" variant="secondary" onClick={onCancel} disabled={disabled}>
            Cancel
          </AppButton>
          <AppButton
            type="button"
            disabled={disabled || !selected}
            onClick={() => void onConfirm(Number(selected))}
          >
            Transfer
          </AppButton>
        </div>
      </div>
    </div>
  );
}
