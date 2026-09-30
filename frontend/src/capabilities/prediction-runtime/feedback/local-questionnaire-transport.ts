/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { SubmitRequest, Transport } from "mlform/runtime";
import { submissionValues } from "@/capabilities/prediction-runtime/feedback/questionnaire-feedback";

export const createLocalQuestionnaireTransport = (): Transport => ({
  async submit(request: SubmitRequest) {
    return {
      raw: submissionValues(request.inputs),
      meta: {},
      reports: [],
    };
  },
});
