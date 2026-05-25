/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { m as motion } from "motion/react";
import { useParams } from "react-router";
import { AppBreadcrumbs, AppCopy, AppEyebrow, AppTitle } from "../../app/components/ui";
import { useGetModels } from "../hooks";

const CREATE_SIGNATURE_HEADER = "Create New Schema";
const CREATE_SIGNATURE_SUBHEADER =
  "Choose a base schema, define the next semantic bump, and edit the UI JSON schema in one view.";

export function CreateSignatureHeader() {
  const { modelId } = useParams<{ modelId: string }>();
  const { data: models = [] } = useGetModels();
  const modelName = models.find((model) => String(model.id) === String(modelId))?.name ?? "Model";

  return (
    <motion.div className="space-y-4">
      <AppBreadcrumbs
        items={[
          { label: "Models", to: "/models" },
          ...(modelId ? [{ label: modelName, to: `/models/${modelId}?tab=signatures` }] : []),
          { label: "Create Schema" },
        ]}
      />
      <div className="space-y-3">
        <AppEyebrow>Schema Studio</AppEyebrow>
        <AppTitle>{CREATE_SIGNATURE_HEADER}</AppTitle>
        <AppCopy className="max-w-3xl">{CREATE_SIGNATURE_SUBHEADER}</AppCopy>
      </div>
    </motion.div>
  );
}
