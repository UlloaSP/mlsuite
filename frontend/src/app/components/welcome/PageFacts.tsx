/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { BookmarkVisitFacts } from "./BookmarkVisitFacts";
import { InferenceVisitFacts } from "./InferenceVisitFacts";
import { InferencesCatalogFacts } from "./facts/InferencesCatalogFacts";
import { InfrastructureFacts } from "./facts/InfrastructureFacts";
import { ModelFacts } from "./facts/ModelFacts";
import { ModelsCatalogFacts } from "./facts/ModelsCatalogFacts";
import { OrganizationsFacts } from "./facts/OrganizationsFacts";
import { PluginsFacts } from "./facts/PluginsFacts";
import { PredictCatalogFacts } from "./facts/PredictCatalogFacts";
import { ReviewFacts } from "./facts/ReviewFacts";
import { SchemaFacts } from "./facts/SchemaFacts";
import { SchemasCatalogFacts } from "./facts/SchemasCatalogFacts";
import { UsersFacts } from "./facts/UsersFacts";

/**
 * The live facts of the page a member left, chosen by its path: the record it
 * shows (a model, a schema, a draft, an inference) or, for a catalog, what the
 * catalog holds. Paths with nothing better to say render nothing.
 */
export function PageFacts({ path }: { path: string }) {
  const match = (pattern: RegExp) => pattern.exec(path);
  let found: RegExpExecArray | null;

  if (path === "/predict") return <PredictCatalogFacts />;
  if ((found = match(/^\/predict\/([^/]+)$/))) return <BookmarkVisitFacts bookmarkId={found[1]} />;
  if (path === "/models") return <ModelsCatalogFacts />;
  if ((found = match(/^\/models\/(?!create$)([^/]+)$/))) return <ModelFacts modelId={found[1]} />;
  if (path === "/schemas") return <SchemasCatalogFacts />;
  if ((found = match(/^\/schemas\/(?!create$)([^/]+)\/drafts\/([^/]+)/))) {
    return <SchemaFacts schemaId={found[1]} draftId={found[2]} />;
  }
  if ((found = match(/^\/schemas\/(?!create$)([^/]+)\/versions\/([^/]+)$/))) {
    return <SchemaFacts schemaId={found[1]} versionId={found[2]} />;
  }
  if ((found = match(/^\/schemas\/(?!create$)([^/]+)/))) return <SchemaFacts schemaId={found[1]} />;
  if (path === "/inferences") return <InferencesCatalogFacts />;
  if ((found = match(/^\/inferences\/([^/]+)/)))
    return <InferenceVisitFacts inferenceId={found[1]} />;
  if ((found = match(/^\/review(?:\/([^/]+))?(?:\/runs\/([^/]+))?$/))) {
    return <ReviewFacts reviewId={found[1]} reviewRunId={found[2]} />;
  }
  if (path.startsWith("/plugins")) return <PluginsFacts />;
  if (path.startsWith("/workspace/organizations")) return <OrganizationsFacts />;
  if (path.startsWith("/admin/users")) return <UsersFacts />;
  if (path.startsWith("/admin/infrastructure")) return <InfrastructureFacts />;
  return null;
}
