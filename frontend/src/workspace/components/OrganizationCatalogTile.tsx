/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Blocks, BrainCircuit, ClipboardList, GitBranch, Users } from "lucide-react";
import { useState } from "react";
import type {
  OrganizationCatalogItemDto,
  OrganizationMembershipRowDto,
} from "../../api/workspace/dtos";
import {
  DeleteDialog,
  OrganizationCardMenu,
  TransferOwnerDialog,
} from "./OrganizationCatalogDialogs";
import { EditableText, OwnerButton, type OrganizationPatch } from "./OrganizationCatalogEditable";

type OrganizationCatalogTileProps = {
  disabled: boolean;
  item: OrganizationCatalogItemDto;
  members: OrganizationMembershipRowDto[];
  onDelete: () => Promise<void> | void;
  onPatch: (patch: OrganizationPatch) => Promise<void> | void;
  onTransferOwner: (membershipId: number) => Promise<void> | void;
};

const dashboardItems = [
  { key: "teamCount", label: "Teams", icon: Users },
  { key: "modelCount", label: "Models", icon: BrainCircuit },
  { key: "schemaCount", label: "Schemas", icon: ClipboardList },
  { key: "pluginCount", label: "Plugins", icon: Blocks },
  { key: "inferenceCount", label: "Inferences", icon: GitBranch },
  { key: "memberCount", label: "Members", icon: Users },
] as const;

export function OrganizationCatalogTile({
  disabled,
  item,
  members,
  onDelete,
  onPatch,
  onTransferOwner,
}: OrganizationCatalogTileProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [editingField, setEditingField] = useState<keyof OrganizationPatch | null>(null);

  return (
    <article className="grid gap-5 rounded border border-[var(--border-soft)] bg-[var(--surface-primary)] p-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(420px,0.9fr)]">
      <div className="min-w-0 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <EditableText
              as="title"
              disabled={disabled}
              editing={editingField === "name"}
              value={item.name}
              onEdit={() => setEditingField("name")}
              onCancel={() => setEditingField(null)}
              onSubmit={(name) => onPatch({ name })}
            />
            <EditableText
              disabled={disabled}
              editing={editingField === "slug"}
              value={item.slug}
              onEdit={() => setEditingField("slug")}
              onCancel={() => setEditingField(null)}
              onSubmit={(slug) => onPatch({ slug })}
            />
          </div>
          <OrganizationCardMenu
            disabled={disabled}
            onDelete={() => setConfirmOpen(true)}
            onEditDescription={() => setEditingField("description")}
            onEditName={() => setEditingField("name")}
            onEditSlug={() => setEditingField("slug")}
            onTransferOwner={() => setTransferOpen(true)}
          />
        </div>
        <OwnerButton item={item} />
        <EditableText
          as="description"
          disabled={disabled}
          editing={editingField === "description"}
          value={
            item.description || "Organization ready for models, schemas, plugins, and members."
          }
          onEdit={() => setEditingField("description")}
          onCancel={() => setEditingField(null)}
          onSubmit={(description) => onPatch({ description })}
        />
      </div>

      <div className="grid content-start gap-2 sm:grid-cols-3">
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
        <div className="rounded bg-[var(--surface-secondary)] px-3 py-2">
          <div className="text-xs font-semibold text-[var(--text-secondary)]">Visibility</div>
          <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
            {item.publicAccess ? "Public" : "Private"}
          </p>
        </div>
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
      {transferOpen ? (
        <TransferOwnerDialog
          disabled={disabled}
          members={members}
          onCancel={() => setTransferOpen(false)}
          onConfirm={async (membershipId) => {
            await onTransferOwner(membershipId);
            setTransferOpen(false);
          }}
        />
      ) : null}
    </article>
  );
}
