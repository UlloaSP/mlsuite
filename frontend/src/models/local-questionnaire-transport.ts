/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { SubmitRequest, Transport } from "mlform/runtime";

export const createLocalQuestionnaireTransport = (): Transport => ({
  async submit(request: SubmitRequest) {
    return {
      raw: request.serializedValues,
      meta: {},
      reports: {},
    };
  },
});
