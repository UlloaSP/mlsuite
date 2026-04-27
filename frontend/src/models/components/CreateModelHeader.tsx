/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { motion } from "motion/react";
import { AppBreadcrumbs, AppCopy, AppEyebrow, AppTitle } from "../../app/components";

const CREATE_MODEL_HEADER = "Create New Model";
const CREATE_MODEL_SUBHEADER =
  "Start with the model artifact, optionally attach the companion dataframe, and refine the name before publishing it to the catalog.";

export function CreateModelHeader() {
  return (
    <motion.div className="space-y-4">
      <AppBreadcrumbs items={[{ label: "Models", to: "/models" }, { label: "Create Model" }]} />
      <div className="space-y-3">
        <AppEyebrow>Model Studio</AppEyebrow>
        <AppTitle>{CREATE_MODEL_HEADER}</AppTitle>
        <AppCopy className="max-w-3xl">{CREATE_MODEL_SUBHEADER}</AppCopy>
      </div>
    </motion.div>
  );
}
