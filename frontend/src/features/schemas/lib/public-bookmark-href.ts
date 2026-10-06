/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

/** The public page of a published bookmark, the same for visitors and members. */
export const publicBookmarkHref = (publicId: string) => `/explore/${encodeURIComponent(publicId)}`;
