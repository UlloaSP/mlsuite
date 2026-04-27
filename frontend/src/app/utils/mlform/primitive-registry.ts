/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { createBuiltinPrimitiveRegistry, type PrimitiveRegistry } from "mlform/primitives";
import { CUSTOM_FIELD_COMPONENT } from "./custom-field";
import { CUSTOM_REPORT_COMPONENT } from "./custom-report";
import { PredictionCustomFieldRendererElement } from "./PredictionCustomFieldRendererElement";
import { PredictionCustomReportRendererElement } from "./PredictionCustomReportRendererElement";

const CUSTOM_FIELD_RENDERER_TAG = "mlsuite-custom-field-renderer";
const CUSTOM_REPORT_RENDERER_TAG = "mlsuite-custom-report-renderer";

const ensurePredictionFieldRenderer = (): void => {
  if (!customElements.get(CUSTOM_FIELD_RENDERER_TAG)) {
    customElements.define(CUSTOM_FIELD_RENDERER_TAG, PredictionCustomFieldRendererElement);
  }
};

const ensurePredictionReportRenderer = (): void => {
  if (!customElements.get(CUSTOM_REPORT_RENDERER_TAG)) {
    customElements.define(CUSTOM_REPORT_RENDERER_TAG, PredictionCustomReportRendererElement);
  }
};

export const createPredictionPrimitiveRegistry = (): PrimitiveRegistry => {
  ensurePredictionFieldRenderer();
  ensurePredictionReportRenderer();
  return createBuiltinPrimitiveRegistry()
    .registerField(CUSTOM_FIELD_COMPONENT, CUSTOM_FIELD_RENDERER_TAG)
    .registerReport(CUSTOM_REPORT_COMPONENT, CUSTOM_REPORT_RENDERER_TAG);
};
