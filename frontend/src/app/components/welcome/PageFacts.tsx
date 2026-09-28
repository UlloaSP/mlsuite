/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { matchPath } from "react-router";
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
  const at = (pattern: string) => matchPath(pattern, path)?.params;
  const bookmark = at("/predict/:bookmarkId");
  const model = at("/models/:modelId");
  const draft = at("/schemas/:schemaId/drafts/:draftId/*");
  const version = at("/schemas/:schemaId/versions/:versionId");
  const schema = at("/schemas/:schemaId/*");
  const inference = at("/inferences/:inferenceId/*");
  const review =
    at("/review") ?? at("/review/:reviewId") ?? at("/review/:reviewId/runs/:reviewRunId");

  if (path === "/predict") return <PredictCatalogFacts />;
  if (bookmark?.bookmarkId) return <BookmarkVisitFacts bookmarkId={bookmark.bookmarkId} />;
  if (path === "/models") return <ModelsCatalogFacts />;
  if (model?.modelId && model.modelId !== "create") return <ModelFacts modelId={model.modelId} />;
  if (path === "/schemas") return <SchemasCatalogFacts />;
  if (draft?.schemaId && draft.schemaId !== "create") {
    return <SchemaFacts schemaId={draft.schemaId} draftId={draft.draftId} />;
  }
  if (version?.schemaId && version.schemaId !== "create") {
    return <SchemaFacts schemaId={version.schemaId} versionId={version.versionId} />;
  }
  if (schema?.schemaId && schema.schemaId !== "create") {
    return <SchemaFacts schemaId={schema.schemaId} />;
  }
  if (path === "/inferences") return <InferencesCatalogFacts />;
  if (inference?.inferenceId) return <InferenceVisitFacts inferenceId={inference.inferenceId} />;
  if (review) return <ReviewFacts reviewId={review.reviewId} reviewRunId={review.reviewRunId} />;
  if (path.startsWith("/plugins")) return <PluginsFacts />;
  if (path.startsWith("/workspace/organizations")) return <OrganizationsFacts />;
  if (path.startsWith("/admin/users")) return <UsersFacts />;
  if (path.startsWith("/admin/infrastructure")) return <InfrastructureFacts />;
  return null;
}
