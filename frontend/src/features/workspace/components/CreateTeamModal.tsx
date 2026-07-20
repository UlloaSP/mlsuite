import { useState } from "react";
import { AppButton } from "@/shared/ui/AppButton";
import { AppSelect } from "@/shared/ui/AppSelect";
import { AppTextArea } from "@/shared/ui/AppTextArea";
import { AppTextField } from "@/shared/ui/AppTextField";
import type { createTeam } from "@/features/workspace/api/teams.api";

export function CreateTeamModal({
  members,
  onClose,
  onCreate,
}: {
  members: Array<{ id: number; fullName: string; email: string }>;
  onClose: () => void;
  onCreate: (payload: Parameters<typeof createTeam>[1]) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [lead, setLead] = useState("");
  const [quota, setQuota] = useState("");
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 p-4">
      <div className="w-full max-w-[560px] rounded-[20px] bg-white p-6 shadow-[var(--shadow-card)]">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold">Create New Team</h2>
            <p className="text-sm text-[var(--text-secondary)]">
              Create a team and optional lead/quota.
            </p>
          </div>
          <button type="button" onClick={onClose}>
            x
          </button>
        </div>
        <div className="grid gap-4">
          <AppTextField
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g., NLP Research Team"
          />
          <AppTextArea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="What does this team work on?"
          />
          <AppSelect
            value={lead}
            onValueChange={setLead}
            options={[
              { value: "", label: "No lead" },
              ...members.map((member) => ({
                value: String(member.id),
                label: `${member.fullName} - ${member.email}`,
              })),
            ]}
          />
          <AppTextField
            value={quota}
            onChange={(event) => setQuota(event.target.value)}
            placeholder="Monthly inference quota"
            type="number"
          />
          <div className="flex justify-end gap-3">
            <AppButton variant="secondary" onClick={onClose}>
              Cancel
            </AppButton>
            <AppButton
              disabled={!name.trim()}
              onClick={() =>
                onCreate({
                  name,
                  description,
                  leadMembershipId: lead ? Number(lead) : undefined,
                  monthlyInferenceQuota: quota ? Number(quota) : undefined,
                })
              }
            >
              Create Team
            </AppButton>
          </div>
        </div>
      </div>
    </div>
  );
}
