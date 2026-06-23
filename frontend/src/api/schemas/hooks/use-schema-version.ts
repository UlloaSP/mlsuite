/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useQuery } from "@tanstack/react-query";
import * as schemaApi from "../services";
import { SCHEMA_VERSION_QUERY_KEY } from "./query-keys";

export const useSchemaVersion = (versionId?: string) =>
  useQuery({
    queryKey: SCHEMA_VERSION_QUERY_KEY(versionId ?? ""),
    queryFn: () => schemaApi.getSchemaVersion(versionId ?? ""),
    enabled: Boolean(versionId),
  });
