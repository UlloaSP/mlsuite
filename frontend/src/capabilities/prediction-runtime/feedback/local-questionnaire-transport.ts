/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { SubmitRequest, Transport } from "mlform/runtime";
import type { SubmissionInputRecord } from "mlform/schema";

export const createLocalQuestionnaireTransport = (): Transport => ({
  async submit(request: SubmitRequest) {
    return {
      raw: Object.fromEntries(
        request.inputs.map((input: SubmissionInputRecord) => [
          input.fieldId,
          input.serializedValue,
        ]),
      ),
      meta: {},
      reports: [],
    };
  },
});
