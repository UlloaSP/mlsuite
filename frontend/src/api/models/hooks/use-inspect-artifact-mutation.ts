/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useMutation } from "@tanstack/react-query";
import * as artifactApi from "../services";
import { INSPECT_ARTIFACT_QUERY_KEY } from "./query-keys";

export function useInspectArtifactMutation() {
  return useMutation({
    mutationKey: INSPECT_ARTIFACT_QUERY_KEY,
    mutationFn: (artifact: File) => artifactApi.inspectArtifact(artifact),
  });
}
