/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Hash } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { AppButton } from "@/shared/ui/AppButton";
import { AppCombobox } from "@/shared/ui/AppCombobox";
import { AppPage } from "@/shared/ui/AppPage";
import { AppPageHeader } from "@/shared/ui/PageHeader";
import { AppSurface } from "@/shared/ui/AppSurface";
import { AppTextArea } from "@/shared/ui/AppTextArea";
import { AppTextField } from "@/shared/ui/AppTextField";
import { AppFieldLabel } from "@/shared/ui/AppFieldLabel";
import { useCreateOrganizationMutation } from "@/features/workspace/api/workspace.mutations";

type OrganizationOwnerCandidate = {
  avatarUrl?: string | null;
  email: string;
  enabled: boolean;
  fullName: string;
  id: number;
};

type Props = {
  currentUserId?: number;
  users: OrganizationOwnerCandidate[];
};

export function CreateOrganizationPage({ currentUserId, users }: Props) {
  const navigate = useNavigate();
  const createOrganization = useCreateOrganizationMutation();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [owner, setOwner] = useState<OrganizationOwnerCandidate | null>(null);
  const ownerInitializedRef = useRef(false);
  const slugEditedRef = useRef(false);
  const ownerItems = useMemo(
    () =>
      users.flatMap((item) =>
        item.enabled
          ? [
              {
                id: item.id,
                label: item.fullName,
                description: item.email,
                avatarUrl: item.avatarUrl,
              },
            ]
          : [],
      ),
    [users],
  );

  useEffect(() => {
    if (!ownerInitializedRef.current && currentUserId && users.length) {
      setOwner(users.find((item) => item.id === currentUserId) ?? null);
      ownerInitializedRef.current = true;
    }
  }, [currentUserId, users]);

  async function submit() {
    const trimmedName = name.trim();
    if (!trimmedName || !owner || createOrganization.isPending) return;
    try {
      await createOrganization.mutateAsync({
        name: trimmedName,
        slug: slug.trim() || undefined,
        description: description.trim() || undefined,
        ownerUserId: owner.id,
      });
      toast.success("Organization created.");
      void navigate("/workspace/organizations");
    } catch (submitError: unknown) {
      toast.error(submitError instanceof Error ? submitError.message : String(submitError));
    }
  }

  const updateName = (value: string) => {
    setName(value);
    if (!slugEditedRef.current) setSlug(slugify(value));
  };

  const updateSlug = (value: string) => {
    slugEditedRef.current = true;
    setSlug(slugify(value));
  };

  return (
    <AppPage>
      <AppSurface className="flex flex-1 flex-col overflow-auto">
        <AppPageHeader
          eyebrow="Superadmin"
          title="Create Organization"
          description="Create an organization and assign its first owner."
          breadcrumbs={[
            { label: "Organizations", to: "/workspace/organizations" },
            { label: "Create Organization" },
          ]}
        />
        <section className="mx-auto w-full max-w-3xl space-y-4">
          <AppFieldLabel label="Name">
            <AppTextField
              value={name}
              onChange={(event) => updateName(event.target.value)}
              placeholder="Northwind AI"
              autoFocus
            />
          </AppFieldLabel>
          <AppFieldLabel label="Slug">
            <AppTextField
              value={slug}
              onChange={(event) => updateSlug(event.target.value)}
              placeholder="northwind-ai"
              prefix={<Hash size={15} className="text-[var(--text-muted)]" />}
            />
          </AppFieldLabel>
          <AppFieldLabel label="Owner">
            <AppCombobox
              value={owner?.id ?? null}
              items={ownerItems}
              placeholder="Search owner"
              emptyLabel="No users found"
              onChange={(item) =>
                setOwner(users.find((candidate) => candidate.id === item?.id) ?? null)
              }
            />
          </AppFieldLabel>
          <AppFieldLabel label="Description">
            <AppTextArea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Short operational summary"
              className="rounded shadow-none [&_textarea]:max-h-64 [&_textarea]:min-h-28 [&_textarea]:resize-y"
            />
          </AppFieldLabel>
          <div className="flex justify-end gap-2">
            <AppButton
              type="button"
              variant="secondary"
              onClick={() => navigate("/workspace/organizations")}
            >
              Cancel
            </AppButton>
            <AppButton
              type="button"
              onClick={() => void submit()}
              disabled={!name.trim() || !owner || createOrganization.isPending}
            >
              {createOrganization.isPending ? "Creating..." : "Create Organization"}
            </AppButton>
          </div>
        </section>
      </AppSurface>
    </AppPage>
  );
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
