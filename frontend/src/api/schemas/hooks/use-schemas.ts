/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useQuery } from "@tanstack/react-query";
import * as schemaApi from "../services";
import { SCHEMAS_QUERY_KEY } from "./query-keys";

export const useSchemas = () =>
  useQuery({ queryKey: SCHEMAS_QUERY_KEY, queryFn: schemaApi.getSchemas });
