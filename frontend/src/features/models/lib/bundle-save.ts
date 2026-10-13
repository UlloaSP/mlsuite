/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { Bundle } from "./bundle-types";

/** A bundle can be saved once it has a name. */
export const isBundleSaveable = (bundle: Bundle) =>
  bundle.name.trim() !== "" && !bundle.saved && !bundle.saving;

/**
 * Saves model bundles one at a time and reports whether every save succeeded.
 *
 * Sequential execution avoids overloading analyzer model deserialization while still attempting
 * later bundles after an isolated failure.
 */
export const saveModelBundlesSequentially = async (
  ids: readonly number[],
  save: (id: number) => Promise<boolean>,
): Promise<boolean> => {
  let complete = true;
  for (const id of ids) {
    // react-doctor-disable-next-line react-doctor/async-await-in-loop -- Analyzer deserialization must be serialized to avoid request timeouts.
    if (!(await save(id))) complete = false;
  }
  return complete;
};
