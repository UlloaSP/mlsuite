import { sourcePages } from "./sources";

const source = (file: (typeof sourcePages)[number]["file"]) => {
  const page = sourcePages.find((entry) => entry.file === file)!;
  return { label: page.label, link: page.route };
};

// Sidebar order follows the ML loop: start, organize, upload and describe, run, review, share, operate.
export const sidebar = [
  {
    label: "Start",
    items: [
      { label: "Overview", slug: "" },
      { label: "Concepts", slug: "start/concepts" },
      { label: "Create an account", slug: "start/account" },
      { label: "Quick start", slug: "start/quick-start" },
      { label: "Find your way around", slug: "start/navigation" },
    ],
  },
  {
    label: "Organizations",
    items: [
      { label: "Organizations", slug: "organizations/overview" },
      { label: "Members and invitations", slug: "organizations/members" },
      { label: "Roles and permissions", slug: "organizations/roles" },
    ],
  },
  {
    label: "Models and schemas",
    items: [
      { label: "Upload models", slug: "models/upload" },
      { label: "Schemas", slug: "schemas/overview" },
      { label: "Change and publish a schema", slug: "schemas/changes" },
      { label: "Bookmarks", slug: "schemas/bookmarks" },
      { label: "Schema reference", slug: "schemas/reference" },
    ],
  },
  {
    label: "Predictions",
    items: [
      { label: "Run predictions", slug: "predictions/run" },
      { label: "Bulk upload", slug: "predictions/bulk-upload" },
      { label: "Inferences", slug: "predictions/inferences" },
      { label: "Export to CSV", slug: "predictions/export" },
    ],
  },
  {
    label: "Feedback",
    items: [
      { label: "Reviews", slug: "feedback/reviews" },
      { label: "Answer a review", slug: "feedback/answer" },
      { label: "Feedback questionnaires", slug: "feedback/questionnaires" },
    ],
  },
  {
    label: "Publishing",
    items: [
      { label: "Publish a bookmark", slug: "publishing/publish" },
      { label: "Explore and public pages", slug: "publishing/public-pages" },
    ],
  },
  {
    label: "API access",
    items: [
      { label: "Clients and keys", slug: "api/clients" },
      { label: "Usage and requests", slug: "api/usage" },
      { label: "Client API reference", slug: "api/reference" },
    ],
  },
  {
    label: "Extend and personalize",
    items: [
      { label: "Plugins", slug: "plugins" },
      { label: "Your account and settings", slug: "account/settings" },
    ],
  },
  {
    label: "Platform administration",
    items: [
      { label: "Organizations and users", slug: "admin/users" },
      { label: "Moderation and API traffic", slug: "admin/moderation" },
      { label: "Infrastructure", slug: "admin/infrastructure" },
    ],
  },
  {
    label: "Self-hosting",
    items: [
      { label: "Run with Docker Compose", slug: "self-hosting/docker-compose" },
      { label: "Configuration", slug: "self-hosting/configuration" },
      { label: "Production rollout", slug: "self-hosting/production" },
      source("docs/RELEASES.md"),
      { label: "Architecture", slug: "self-hosting/architecture" },
      source("SECURITY.md"),
    ],
  },
  {
    label: "Reference",
    items: [{ label: "Limits", slug: "reference/limits" }],
  },
];
