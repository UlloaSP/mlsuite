/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useId } from "react";
import { AppSelect } from "@/shared/ui/AppSelect";
import type { PublicBookmarkExampleDto } from "@/shared/api/openapi.gen";

/**
 * The curated examples of a public bookmark. Choosing one loads its inputs into the form,
 * where they stay editable; the selection only records which example the form started from.
 */
export function PublicBookmarkExampleSelect({
  examples,
  value,
  onChange,
}: {
  examples: readonly PublicBookmarkExampleDto[];
  /** The id of the example the form was loaded from, if any. */
  value: string | undefined;
  onChange: (exampleId: string) => void;
}) {
  const labelId = useId();
  const hintId = useId();

  return (
    <div className="grid gap-2">
      <span id={labelId} className="text-sm font-semibold text-fg-secondary">
        Start from an example
      </span>
      <AppSelect
        aria-labelledby={labelId}
        aria-describedby={hintId}
        className="w-full text-left sm:w-80"
        options={examples.map((example) => ({ label: example.name, value: example.id }))}
        placeholder="Choose an example"
        value={value}
        onValueChange={onChange}
      />
      <p id={hintId} className="text-xs text-fg-muted">
        Loading an example replaces what is in the form. You can edit every value afterwards.
      </p>
    </div>
  );
}
