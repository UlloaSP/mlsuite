/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useAtom } from "jotai";
import { RotateCcw } from "lucide-react";
import { AppIconButton } from "@/shared/ui/AppIconButton";
import { contrastAtom, type ContrastLevel } from "@/shared/ui/appearance-state";

export function ContrastControl() {
  const [contrast, setContrast] = useAtom(contrastAtom);

  return (
    <div className="grid gap-5 border-t border-[var(--border-soft)] py-8 md:grid-cols-[minmax(0,1fr)_18rem] md:items-center">
      <div>
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-[var(--text-primary)]">Contrast</h3>
          {contrast === 100 ? null : (
            <AppIconButton
              aria-label="Reset contrast to 100 percent"
              className="size-8"
              onClick={() => setContrast(100)}
            >
              <RotateCcw size={15} />
            </AppIconButton>
          )}
        </div>
        <p className="mt-1 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
          Increase separation between text, surfaces, and borders without altering images or status
          colors.
        </p>
      </div>
      <div className="flex items-center gap-4">
        <output
          htmlFor="interface-contrast"
          className="min-w-16 rounded-lg bg-[var(--surface-muted)] px-3 py-2 text-center font-mono text-xs font-semibold text-[var(--text-primary)]"
        >
          {contrast}%
        </output>
        <input
          id="interface-contrast"
          aria-label="Interface contrast"
          aria-valuetext={`${contrast} percent`}
          className="h-8 min-w-0 flex-1 cursor-pointer [accent-color:var(--accent-primary)]"
          max={125}
          min={100}
          step={5}
          type="range"
          value={contrast}
          onChange={(event) => setContrast(Number(event.currentTarget.value) as ContrastLevel)}
        />
      </div>
    </div>
  );
}
