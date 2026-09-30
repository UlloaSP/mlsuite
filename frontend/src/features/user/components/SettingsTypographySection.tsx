/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useAtom } from "jotai";
import { AppSelect } from "@/shared/ui/AppSelect";
import { AppSwitch } from "@/shared/ui/AppSwitch";
import { INTERFACE_FONTS, MONOSPACE_FONTS } from "@/shared/ui/font-catalog";
import { INTERFACE_SIZES, MONOSPACE_SIZES, typographyAtom } from "@/shared/ui/typography-state";
import { FontChoiceGrid } from "./FontChoiceGrid";

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
      <h2 id="typography-heading" className="text-xl font-semibold tracking-[-0.02em] text-fg">
        Typography
      </h2>
      <p className="mt-1 text-sm leading-6 text-fg-secondary">
        Tune interface and code text without changing content density rules.
      </p>

      <div className="mt-7 grid min-w-0 grid-cols-1 gap-8">
        <div className="min-w-0">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-fg">Interface font</h3>
              <p className="mt-1 text-sm text-fg-secondary">Navigation, forms, labels, and copy.</p>
            </div>
            <AppSelect
              aria-label="Interface font size"
              value={String(typography.interfaceSize)}
              options={sizeOptions(INTERFACE_SIZES)}
              onValueChange={(value) => update("interfaceSize", Number(value))}
            />
          </div>
          <div className="mt-4">
            <FontChoiceGrid
              fonts={INTERFACE_FONTS}
              name="interface-font"
              sample="Review model outputs"
              value={typography.interfaceFont}
              onChange={(value) => update("interfaceFont", value)}
            />
          </div>
          <div className="mt-3 rounded-xl border border-line bg-surface-subtle p-5">
            <p className="max-w-[68ch] leading-7 text-fg">
              Use a schema to validate inputs, run inference, and review model outputs before
              saving.
            </p>
          </div>
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-fg">Monospace font</h3>
              <p className="mt-1 text-sm text-fg-secondary">Code, diffs, editors, and terminals.</p>
            </div>
            <AppSelect
              aria-label="Monospace font size"
              value={String(typography.monospaceSize)}
              options={sizeOptions(MONOSPACE_SIZES)}
              onValueChange={(value) => update("monospaceSize", Number(value))}
            />
          </div>
          <div className="mt-4">
            <FontChoiceGrid
              fonts={MONOSPACE_FONTS}
              name="monospace-font"
              sample="run(schema, input) => 0.98"
              value={typography.monospaceFont}
              onChange={(value) => update("monospaceFont", value)}
            />
          </div>
          <pre
            data-code-block
            className="app-scroll mt-3 overflow-auto rounded-xl border border-line bg-surface-inverse p-5 font-mono text-code text-fg-inverse"
          >
            <code>{`const prediction = await run(schema, input);\nreturn prediction.results;`}</code>
          </pre>
        </div>

        <AppSwitch
          className="border-t border-line pt-5"
          label="Word wrap"
          description="Wrap long lines in code editors and previews."
          checked={typography.wordWrap}
          onChange={(checked) => update("wordWrap", checked)}
        />
      </div>
    </section>
  );
}
