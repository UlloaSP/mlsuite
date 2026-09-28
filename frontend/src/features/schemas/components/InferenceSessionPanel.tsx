/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Save, Trash2 } from "lucide-react";
import { AppButton } from "@/shared/ui/AppButton";
import { useActionDialog } from "@/shared/ui/use-action-dialog";
import { InferenceSessionEntryRow } from "@/features/schemas/components/InferenceSessionEntryRow";
import {
  canSaveSessionEntry,
  type useInferenceSession,
} from "@/features/schemas/lib/use-inference-session";

type Props = {
  session: ReturnType<typeof useInferenceSession>;
  selectedKey: string | null;
  onSelect: (key: string) => void;
};

/** Every run of this visit, newest first, to name, keep, or throw away. */
export function InferenceSessionPanel({ session, selectedKey, onSelect }: Props) {
  const { entries } = session;
  const savable = entries.filter(canSaveSessionEntry).length;
  const actionDialog = useActionDialog();
  const discardAll = async () => {
    const unsaved = session.unsavedCount;
    if (
      unsaved > 0 &&
      !(await actionDialog.confirm({
        title: "Discard the session?",
        description: `${unsaved} unsaved inference${unsaved === 1 ? " is" : "s are"} lost. Saved ones stay in the history.`,
        confirmLabel: "Discard all",
        danger: true,
      }))
    )
      return;
    session.discardAll();
  };

  return (
    <aside
      aria-label="Inference session"
      className="flex max-h-96 w-full shrink-0 flex-col rounded-card border border-line bg-surface-muted lg:max-h-none lg:w-80"
    >
      <header className="flex items-baseline justify-between gap-2 border-b border-line px-4 py-3">
        <h2 className="text-sm font-semibold text-fg">Session</h2>
        <span className="text-xs text-fg-muted">
          {session.unsavedCount > 0 ? `${session.unsavedCount} unsaved` : "All saved"}
        </span>
      </header>
      <div className="app-scroll min-h-0 flex-1 overflow-y-auto p-3">
        {entries.length === 0 ? (
          <p className="px-1 py-2 text-sm text-fg-muted">
            Each run appears here. Name it, then save it to the bookmark&apos;s history or remove
            it.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {entries.map((entry) => (
              <InferenceSessionEntryRow
                key={entry.key}
                entry={entry}
                selected={entry.key === selectedKey}
                onSelect={() => onSelect(entry.key)}
                onRename={(name) => session.rename(entry.key, name)}
                onSave={() => void session.save(entry)}
                onRemove={() => session.remove(entry.key)}
              />
            ))}
          </ul>
        )}
      </div>
      {entries.length > 0 ? (
        <footer className="flex gap-2 border-t border-line p-3">
          <AppButton
            size="sm"
            variant="secondary"
            className="flex-1"
            onClick={() => void discardAll()}
          >
            <Trash2 size={14} />
            Discard all
          </AppButton>
          <AppButton
            size="sm"
            className="flex-1"
            disabled={savable === 0}
            onClick={() => void session.saveAll()}
          >
            <Save size={14} />
            Save all{savable > 0 ? ` (${savable})` : ""}
          </AppButton>
        </footer>
      ) : null}
      {actionDialog.dialog}
    </aside>
  );
}
