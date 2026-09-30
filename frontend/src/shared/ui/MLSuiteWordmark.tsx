/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

/** Brand wordmark: heavy "ML" + thin "suite"; the margin keeps L and s apart. */
export function MLSuiteWordmark({ suffix = "" }: { suffix?: string }) {
  return (
    <span className="tracking-[-0.04em]">
      <span className="font-extrabold">ML</span>
      <span className="ml-[0.06em] font-extralight">suite{suffix}</span>
    </span>
  );
}
