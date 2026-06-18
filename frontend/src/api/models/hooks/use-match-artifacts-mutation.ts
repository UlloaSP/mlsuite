/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useMutation } from "@tanstack/react-query";
import * as artifactApi from "../services";
import { MATCH_ARTIFACTS_QUERY_KEY } from "./query-keys";

export function useMatchArtifactsMutation() {
  return useMutation({
    mutationKey: MATCH_ARTIFACTS_QUERY_KEY,
    mutationFn: (request: artifactApi.MatchArtifactsRequest) => artifactApi.matchArtifacts(request),
  });
}
