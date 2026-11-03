/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Link, type LinkComponent } from "@tanstack/react-router";

/**
 * The app's link. The router marks an active link `aria-current="page"`, and by default a link
 * is active on every page below it; only a link to the very address shown is the current page,
 * so a "back to schemas" link on a schema is not announced as one.
 */
export const AppLink: LinkComponent<"a"> = (props) => (
  <Link activeOptions={{ exact: true }} {...props} />
);
