/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useAtom } from "jotai";
import { AppSelect } from "@/shared/ui/AppSelect";
import {
  INTERFACE_FONTS,
  INTERFACE_SIZES,
  MONOSPACE_FONTS,
  MONOSPACE_SIZES,
  typographyAtom,
  type InterfaceFont,
  type MonospaceFont,
} from "@/shared/ui/typography-state";

const sizeOptions = (values: readonly number[]) =>
  values.map((value) => ({ label: `${value} px`, value: String(value) }));

export function SettingsTypographySection() {
  const [typography, setTypography] = useAtom(typographyAtom);
  const update = <TKey extends keyof typeof typography>(
    key: TKey,
    value: (typeof typography)[TKey],
  ) => setTypography({ ...typography, [key]: value });

  return (
    <section aria-labelledby="typography-heading">
      <h2
        id="typography-heading"
        className="text-xl font-semibold tracking-[-0.02em] text-[var(--text-primary)]"
      >
        Typography
      </h2>
      <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
        Tune interface and code text without changing content density rules.
      </p>

      <div className="mt-7 grid min-w-0 grid-cols-1 gap-8">
        <div className="min-w-0">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-[var(--text-primary)]">Interface font</h3>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Navigation, forms, labels, and copy.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <AppSelect
                aria-label="Interface font"
                value={typography.interfaceFont}
                options={[...INTERFACE_FONTS]}
                onValueChange={(value) => update("interfaceFont", value as InterfaceFont)}
              />
              <AppSelect
                aria-label="Interface font size"
                value={String(typography.interfaceSize)}
                options={sizeOptions(INTERFACE_SIZES)}
                onValueChange={(value) => update("interfaceSize", Number(value))}
              />
            </div>
          </div>
          <div className="mt-3 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-secondary)] p-5">
            <p className="max-w-[68ch] leading-7 text-[var(--text-primary)]">
              Use a schema to validate inputs, run inference, and review model outputs before
              saving.
            </p>
          </div>
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-[var(--text-primary)]">Monospace font</h3>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Code, diffs, editors, and terminals.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <AppSelect
                aria-label="Monospace font"
                value={typography.monospaceFont}
                options={[...MONOSPACE_FONTS]}
                onValueChange={(value) => update("monospaceFont", value as MonospaceFont)}
              />
              <AppSelect
                aria-label="Monospace font size"
                value={String(typography.monospaceSize)}
                options={sizeOptions(MONOSPACE_SIZES)}
                onValueChange={(value) => update("monospaceSize", Number(value))}
              />
            </div>
          </div>
          <pre
            data-code-block
            className="app-scroll mt-3 overflow-auto rounded-xl border border-[var(--border-soft)] bg-[var(--surface-inverse)] p-5 text-[length:var(--code-font-size)] leading-6 text-[var(--text-inverse)] [font-family:var(--font-mono)]"
          >
            <code>{`const prediction = await run(schema, input);\nreturn prediction.results;`}</code>
          </pre>
        </div>

        <label className="flex items-center justify-between gap-5 border-t border-[var(--border-soft)] pt-5">
          <span>
            <span className="block text-sm font-semibold text-[var(--text-primary)]">
              Word wrap
            </span>
            <span className="mt-1 block text-sm text-[var(--text-secondary)]">
              Wrap long lines in code editors and previews.
            </span>
          </span>
          <input
            type="checkbox"
            className="peer sr-only"
            checked={typography.wordWrap}
            onChange={(event) => update("wordWrap", event.target.checked)}
          />
          <span className="relative h-6 w-11 shrink-0 rounded-full bg-[var(--border-strong)] transition peer-checked:bg-[var(--accent-primary)] peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--accent-primary)] peer-focus-visible:ring-offset-2 after:absolute after:left-1 after:top-1 after:size-4 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-5" />
        </label>
      </div>
    </section>
  );
}
