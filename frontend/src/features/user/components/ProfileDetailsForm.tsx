/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useState, type FormEvent } from "react";
import { useUpdateProfile } from "@/features/user/api/profile-api";
import { requestFailure } from "@/features/user/lib/request-failure";
import { AppButton } from "@/shared/ui/AppButton";
import { AppCopy } from "@/shared/ui/AppCopy";
import { AppFieldLabel } from "@/shared/ui/AppFieldLabel";
import { AppInlineAlert } from "@/shared/ui/AppInlineAlert";
import { AppSpinner } from "@/shared/ui/AppSpinner";
import { AppSwitch } from "@/shared/ui/AppSwitch";
import { AppTextArea } from "@/shared/ui/AppTextArea";
import { AppTextField } from "@/shared/ui/AppTextField";
import type { UserDto } from "@/shared/api/openapi.gen";

const BIO_MAX_LENGTH = 280;
const LINK_SLOTS = [0, 1, 2, 3];

const draftOf = (user: UserDto) => ({
  fullName: user.fullName,
  handle: user.userName,
  bio: user.bio ?? "",
  company: user.company ?? "",
  location: user.location ?? "",
  website: user.website ?? "",
  links: LINK_SLOTS.map((slot) => user.links[slot] ?? ""),
  profilePublic: user.profilePublic,
  profileShowsOrganizations: user.profileShowsOrganizations,
});

/** Everything about them that is text or a choice, saved together. */
export function ProfileDetailsForm({ user }: { user: UserDto }) {
  const [draft, setDraft] = useState(() => draftOf(user));
  const update = useUpdateProfile();
  const set = <K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) => {
    update.reset();
    setDraft((current) => ({ ...current, [key]: value }));
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    update.mutate({ ...draft, links: draft.links.filter((link) => link.trim() !== "") });
  };
  const text = (key: "fullName" | "handle" | "company" | "location" | "website") => ({
    value: draft[key],
    onChange: (event: { target: { value: string } }) => set(key, event.target.value),
  });

  return (
    <form className="grid gap-5" onSubmit={submit}>
      <h2 className="text-xl font-semibold text-fg">Details</h2>
      <AppFieldLabel label="Name">
        <AppTextField required maxLength={150} autoComplete="name" {...text("fullName")} />
      </AppFieldLabel>
      <AppFieldLabel label="Handle">
        <AppTextField required maxLength={39} autoComplete="username" {...text("handle")} />
      </AppFieldLabel>
      {draft.handle.trim().toLowerCase() !== user.userName ? (
        <AppCopy>
          Your profile moves to the new handle. The old address stops working, and anyone can take
          the old handle.
        </AppCopy>
      ) : null}
      <AppFieldLabel label={`Bio (${draft.bio.length}/${BIO_MAX_LENGTH})`}>
        <AppTextArea
          maxLength={BIO_MAX_LENGTH}
          rows={3}
          value={draft.bio}
          onChange={(event) => set("bio", event.target.value)}
        />
      </AppFieldLabel>
      <div className="grid gap-5 sm:grid-cols-2">
        <AppFieldLabel label="Company">
          <AppTextField maxLength={100} autoComplete="organization" {...text("company")} />
        </AppFieldLabel>
        <AppFieldLabel label="Location">
          <AppTextField maxLength={100} {...text("location")} />
        </AppFieldLabel>
      </div>
      <AppFieldLabel label="Website">
        <AppTextField
          type="url"
          maxLength={255}
          placeholder="https://example.org"
          {...text("website")}
        />
      </AppFieldLabel>
      <div className="grid gap-5 sm:grid-cols-2">
        {LINK_SLOTS.map((slot) => (
          <AppFieldLabel key={slot} label={`Link ${slot + 1}`}>
            <AppTextField
              type="url"
              maxLength={255}
              placeholder="https://"
              value={draft.links[slot]}
              onChange={(event) =>
                set(
                  "links",
                  draft.links.map((link, index) => (index === slot ? event.target.value : link)),
                )
              }
            />
          </AppFieldLabel>
        ))}
      </div>
      <AppSwitch
        checked={draft.profilePublic}
        label="Public profile"
        description="Anyone can open your page, signed in or not. While off, your address answers as if it did not exist."
        onChange={(checked) => set("profilePublic", checked)}
      />
      <AppSwitch
        checked={draft.profileShowsOrganizations}
        label="Show my organizations"
        description="List the organizations you belong to on your public page."
        onChange={(checked) => set("profileShowsOrganizations", checked)}
      />
      {update.isError ? <AppInlineAlert>{requestFailure(update.error)}</AppInlineAlert> : null}
      {update.isSuccess ? (
        <p role="status" className="text-sm text-success-fg">
          Profile saved.
        </p>
      ) : null}
      <AppButton className="justify-self-start" type="submit" disabled={update.isPending}>
        {update.isPending ? <AppSpinner /> : null}
        {update.isPending ? "Saving…" : "Save profile"}
      </AppButton>
    </form>
  );
}
