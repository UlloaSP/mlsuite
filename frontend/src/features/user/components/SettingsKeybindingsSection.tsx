/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { RotateCcw } from "lucide-react";
import { useAtom } from "jotai";
import { useState, type KeyboardEvent } from "react";
import { AppButton } from "@/shared/ui/AppButton";
import { AppKbd } from "@/shared/ui/AppKbd";
import { AppKbdGroup } from "@/shared/ui/AppKbdGroup";
import {
  bindingFromKeyboardEvent,
  DEFAULT_SHORTCUTS,
  reservedShortcutReason,
  shortcutBindingsAtom,
  shortcutLabels,
  shortcutSignature,
  SHORTCUT_ACTIONS,
  type ShortcutId,
} from "@/shared/ui/shortcut-state";

export function SettingsKeybindingsSection() {
  const [bindings, setBindings] = useAtom(shortcutBindingsAtom);
  const [recording, setRecording] = useState<ShortcutId | null>(null);
  const [error, setError] = useState("");

  const record = (id: ShortcutId, event: KeyboardEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.key === "Escape") {
      setRecording(null);
      setError("");
      return;
    }
    const binding = bindingFromKeyboardEvent(event.nativeEvent);
    if (!binding) {
      if (!["Control", "Meta", "Alt", "Shift"].includes(event.key)) {
        setError("Use Ctrl, Cmd, or Alt with one key.");
      }
      return;
    }
    const reservedReason = reservedShortcutReason(binding);
    if (reservedReason) {
      setError(reservedReason);
      return;
    }
    const conflict = SHORTCUT_ACTIONS.find(
      (action) =>
        action.id !== id && shortcutSignature(bindings[action.id]) === shortcutSignature(binding),
    );
    if (conflict) {
      setError(`Already assigned to ${conflict.label}. Choose another shortcut.`);
      return;
    }
    setBindings({ ...bindings, [id]: binding });
    setRecording(null);
    setError("");
  };

  return (
    <section aria-labelledby="keybindings-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2
            id="keybindings-heading"
            className="text-xl font-semibold tracking-[-0.02em] text-[var(--text-primary)]"
          >
            Keybindings
          </h2>
          <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
            Select a binding, then press its replacement. Escape cancels recording.
          </p>
        </div>
        <AppButton
          variant="secondary"
          className="px-3 py-2"
          onClick={() => setBindings(DEFAULT_SHORTCUTS)}
        >
          <RotateCcw size={15} /> Reset all
        </AppButton>
      </div>

      <div className="mt-6 divide-y divide-[var(--border-soft)] border-y border-[var(--border-soft)]">
        {SHORTCUT_ACTIONS.map((action) => (
          <div key={action.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">{action.label}</h3>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">{action.description}</p>
            </div>
            <button
              type="button"
              className="min-w-36 rounded border border-[var(--border-soft)] bg-[var(--surface-secondary)] px-3 py-2 text-sm text-[var(--text-primary)] transition hover:border-[var(--border-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
              aria-label={`Change ${action.label} shortcut`}
              onClick={() => {
                setRecording(action.id);
                setError("");
              }}
              onKeyDown={(event) =>
                recording === action.id ? record(action.id, event) : undefined
              }
            >
              {recording === action.id ? (
                "Press shortcut"
              ) : (
                <AppKbdGroup className="justify-center">
                  {shortcutLabels(bindings[action.id]).map((label) => (
                    <AppKbd key={label}>{label}</AppKbd>
                  ))}
                </AppKbdGroup>
              )}
            </button>
          </div>
        ))}
      </div>
      <p className="mt-3 min-h-5 text-sm text-[var(--danger-text)]" aria-live="polite">
        {error}
      </p>
    </section>
  );
}
