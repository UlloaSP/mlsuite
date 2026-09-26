/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import {
  Blocks,
  BrainCircuit,
  Building2,
  FileJson2,
  GitCommitHorizontal,
  GitCompareArrows,
  MessageSquareText,
  ServerCog,
  ShieldCheck,
  Sparkles,
  Tags,
  Users,
  type LucideIcon,
} from "lucide-react";

/**
 * One icon per product section, used wherever the section appears: navigation,
 * overview, catalogs, and search. Collapsed navigation shows only these, so
 * each must be distinct.
 */
export const SECTION_ICONS = {
  organizations: Building2,
  members: Users,
  models: BrainCircuit,
  schemas: FileJson2,
  changes: GitCompareArrows,
  bookmarks: Tags,
  snapshots: GitCommitHorizontal,
  inferences: Sparkles,
  plugins: Blocks,
  reviews: MessageSquareText,
  users: ShieldCheck,
  infrastructure: ServerCog,
} as const satisfies Record<string, LucideIcon>;
