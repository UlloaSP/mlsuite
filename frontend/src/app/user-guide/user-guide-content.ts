/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

export type GuideContent = { title: string; description: string };

// Keys are the `data-user-guide-item` values rendered by the sidebar. The tour
// follows DOM order, so copy for the main menu reads top to bottom as the ML loop.
export const SIDEBAR_INTRO: GuideContent = {
  title: "Welcome to MLsuite",
  description:
    "This short tour covers the navigation. The menu follows the ML loop in order: models, schemas, inferences, then review. Hold Alt at any time to reveal a number shortcut on each entry.",
};

export const GUIDE_CONTENT: Record<string, GuideContent> = {
  brand: {
    title: "Home",
    description: "Return to your home page from anywhere.",
  },
  "workspace-switcher": {
    title: "Active organization",
    description:
      "Everything you see belongs to the active organization. Open this menu for its overview, members, invitations, roles, and settings, or to switch organization.",
  },
  "nav:Organizations": {
    title: "Organizations",
    description: "Create and administer every organization on this MLsuite instance.",
  },
  "nav:Models": {
    title: "Models",
    description:
      "Start here. Upload trained artifacts; MLsuite inspects and stores each one so every prediction traces back to the exact model that produced it.",
  },
  "nav:Schemas": {
    title: "Schemas",
    description:
      "A schema is the contract for a model: it generates the input form, maps fields for the runtime, and shapes reports and exports. Published changes become immutable snapshots.",
  },
  "nav:Inferences": {
    title: "Inferences",
    description:
      "Every prediction run, with its inputs, outputs, reports, feedback status, and the model and schema that produced it.",
  },
  "nav:Plugins": {
    title: "Plugins",
    description:
      "Add catalog plugins that extend forms and reports, and configure them for this organization.",
  },
  "nav:Review": {
    title: "Review",
    description:
      "Validate and correct prediction results. Reviews close the loop by turning predictions into evaluation and retraining data.",
  },
  "nav:Users": {
    title: "Users",
    description: "Manage platform accounts and their system roles.",
  },
  "nav:Infra": {
    title: "Infrastructure",
    description:
      "Monitor services, tail logs, open a terminal, and review alerts for this deployment.",
  },
  "global-search": {
    title: "Global search",
    description:
      "Jump to models, schemas, snapshots, and bookmarks without leaving the page you are on.",
  },
  "toggle-sidebar": {
    title: "Sidebar size",
    description: "Collapse the sidebar to icons for more room. Shortcuts keep working either way.",
  },
  "user-menu": {
    title: "Your account",
    description:
      "Your profile and notifications, plus personal settings: color scheme, themes, fonts, layout, fullscreen, and keybindings. Sign out from here too.",
  },
  "user-guide": {
    title: "That's the tour",
    description:
      "Replay it here whenever you need it. Every shortcut can be changed in Settings → Keybindings.",
  },
};

/** The guide button closes the tour, whatever its position in the sidebar. */
export const CLOSING_STEP = "user-guide";
