/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Blocks, BrainCircuit, ClipboardList, Pencil, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { OrganizationCatalogItemDto } from "../../api/workspace/dtos";
import { AppButton, AppCopy, AppIconButton, cx } from "../../app/components";

type OrganizationCatalogTileProps = {
  disabled: boolean;
  item: OrganizationCatalogItemDto;
  onDelete: () => Promise<void> | void;
  onRename: (name: string) => Promise<void> | void;
};

const dashboardItems = [
  { key: "modelCount", label: "Models", icon: BrainCircuit },
  { key: "schemaCount", label: "Schemas", icon: ClipboardList },
  { key: "pluginCount", label: "Plugins", icon: Blocks },
  { key: "memberCount", label: "Members", icon: Users },
] as const;

export function OrganizationCatalogTile({
  disabled,
  item,
  onDelete,
  onRename,
}: OrganizationCatalogTileProps) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const submitName = async () => {
    const nextName = name.trim();
    setEditing(false);
    if (!nextName || nextName === item.name) {
      setName(item.name);
      return;
    }
    try {
      await onRename(nextName);
    } catch {
      setName(item.name);
    }
  };

  return (
    <article className="flex min-h-[232px] flex-col gap-4 rounded border border-[var(--border-soft)] bg-[var(--surface-primary)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex min-w-0 items-center gap-2">
            {editing ? (
              <input
                value={name}
                autoFocus
                onChange={(event) => setName(event.target.value)}
                onBlur={() => void submitName()}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void submitName();
                  if (event.key === "Escape") {
                    setName(item.name);
                    setEditing(false);
                  }
                }}
                className="min-w-0 flex-1 rounded border border-[var(--border-soft)] bg-transparent px-2 py-1 text-lg font-semibold text-[var(--text-primary)] outline-none"
              />
            ) : (
              <button
                type="button"
                disabled={disabled}
                onClick={() => setEditing(true)}
                className="min-w-0 truncate text-left text-lg font-semibold text-[var(--text-primary)] hover:underline"
              >
                {item.name}
              </button>
            )}
            <AppIconButton
              type="button"
              aria-label={`Rename ${item.name}`}
              disabled={disabled}
              className="size-8 rounded"
              onClick={() => setEditing(true)}
            >
              <Pencil size={15} />
            </AppIconButton>
          </div>
          <p className="truncate text-xs font-semibold text-[var(--text-secondary)]">{item.slug}</p>
        </div>
        <AppIconButton
          type="button"
          aria-label={`Delete ${item.name}`}
          disabled={disabled}
          className="size-8 rounded text-[var(--danger-text)] hover:bg-[var(--danger-quiet)]"
          onClick={() => setConfirmOpen(true)}
        >
          <Trash2 size={15} />
        </AppIconButton>
      </div>

      <OwnerButton item={item} />

      <AppCopy className="line-clamp-2 min-h-10">
        {item.description || "Organization ready for models, schemas, plugins, and members."}
      </AppCopy>

      <div className="mt-auto grid grid-cols-2 gap-2">
        {dashboardItems.map((dashboardItem) => {
          const Icon = dashboardItem.icon;
          return (
            <div
              key={dashboardItem.key}
              className="rounded bg-[var(--surface-secondary)] px-3 py-2"
            >
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)]">
                <Icon size={14} />
                {dashboardItem.label}
              </div>
              <p className="mt-1 text-xl font-semibold text-[var(--text-primary)]">
                {item[dashboardItem.key]}
              </p>
            </div>
          );
        })}
      </div>

      {confirmOpen ? (
        <DeleteDialog
          disabled={disabled}
          name={item.name}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={async () => {
            await onDelete();
            setConfirmOpen(false);
          }}
        />
      ) : null}
    </article>
  );
}

function OwnerButton({ item }: { item: OrganizationCatalogItemDto }) {
  const owner = item.ownerName || item.ownerEmail || "No owner";
  const initials = owner.slice(0, 1).toUpperCase();
  return (
    <button
      type="button"
      onClick={() => toast.info("Not available yet.")}
      className="flex w-fit max-w-full items-center gap-2 rounded px-1 py-1 text-left hover:bg-[var(--surface-muted)]"
    >
      {item.ownerAvatarUrl ? (
        <img src={item.ownerAvatarUrl} alt="" className="size-7 shrink-0 rounded object-cover" />
      ) : (
        <span className="grid size-7 shrink-0 place-items-center rounded bg-[var(--accent-quiet)] text-xs font-semibold text-[var(--accent-primary-strong)]">
          {initials}
        </span>
      )}
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-[var(--text-primary)]">
          {owner}
        </span>
        {item.ownerEmail ? (
          <span className="block truncate text-xs text-[var(--text-secondary)]">
            {item.ownerEmail}
          </span>
        ) : null}
      </span>
    </button>
  );
}

function DeleteDialog({
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
            className={cx("border-[var(--danger-quiet)]")}
          >
            Delete
          </AppButton>
        </div>
      </div>
    </div>
  );
}
