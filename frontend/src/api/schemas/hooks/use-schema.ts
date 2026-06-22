/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useQuery } from "@tanstack/react-query";
import * as schemaApi from "../services";
import { SCHEMA_QUERY_KEY } from "./query-keys";

export const useSchema = (schemaId?: string) =>
  useQuery({
    queryKey: SCHEMA_QUERY_KEY(schemaId ?? ""),
    queryFn: () => schemaApi.getSchema(schemaId ?? ""),
    enabled: Boolean(schemaId),
  });
