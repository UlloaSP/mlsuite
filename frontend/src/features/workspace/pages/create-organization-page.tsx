import type { RemoteComboboxProps } from "@/shared/ui/AppCombobox";
/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Hash } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
import { AppInlineAlert } from "@/shared/ui/AppInlineAlert";
import { cx } from "@/shared/ui/cx";
import { FORM_MAX_WIDTH } from "@/shared/ui/page-layout";

type OrganizationOwnerCandidate = {
  avatarUrl?: string | null;
  email: string;
  enabled: boolean;
  fullName: string;
  id: number;
};

type Props = {
  initialOwner?: OrganizationOwnerCandidate;
  users: OrganizationOwnerCandidate[];
  remote: RemoteComboboxProps<number>;
};

export function CreateOrganizationPage({ initialOwner, users, remote }: Props) {
  const navigate = useNavigate();
  const createOrganization = useCreateOrganizationMutation();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [owner, setOwner] = useState<OrganizationOwnerCandidate | null>(null);
  const [submitError, setSubmitError] = useState<string>();
  const ownerInitializedRef = useRef(false);
  const slugEditedRef = useRef(false);
  const ownerItems = users.map((item) => ({
    id: item.id,
    label: item.fullName,
    description: item.email,
    avatarUrl: item.avatarUrl,
  }));
  useEffect(() => {
    if (!ownerInitializedRef.current && initialOwner) {
      setOwner(initialOwner);
      ownerInitializedRef.current = true;
    }
  }, [initialOwner]);

  async function submit() {
    setSubmitError(undefined);
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
    } catch (error: unknown) {
      setSubmitError(error instanceof Error ? error.message : String(error));
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
      <AppSurface className="flex flex-1 flex-col gap-6 overflow-auto">
        <AppPageHeader
          breadcrumbScope="platform"
          className={FORM_MAX_WIDTH}
          eyebrow="Superadmin"
          title="Create organization"
          description="Create an organization and assign its first owner."
          breadcrumbs={[
            { label: "Organizations", to: "/workspace/organizations" },
            { label: "Create organization" },
          ]}
        />
        <section className={cx(FORM_MAX_WIDTH, "space-y-4")}>
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
              prefix={<Hash size={15} className="text-fg-muted" />}
            />
          </AppFieldLabel>
          <AppFieldLabel label="Owner">
            <AppCombobox
              {...remote}
              selectedItem={
                owner
                  ? {
                      id: owner.id,
                      label: owner.fullName,
                      description: owner.email,
                      avatarUrl: owner.avatarUrl,
                    }
                  : undefined
              }
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
              className="shadow-none [&_textarea]:max-h-64 [&_textarea]:min-h-28 [&_textarea]:resize-y"
            />
          </AppFieldLabel>
          {submitError ? <AppInlineAlert>{submitError}</AppInlineAlert> : null}
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
              {createOrganization.isPending ? "Creating…" : "Create organization"}
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
