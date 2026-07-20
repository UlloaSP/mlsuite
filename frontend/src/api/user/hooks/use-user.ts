/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useQuery } from "@tanstack/react-query";
import { userQueryOptions } from "@/api/user/user-queries";

export const useUser = () =>
  useQuery({
    ...userQueryOptions(),
    // Optional: stop retries on 401/403
    retry: (count, err: any) => {
      const status = err?.status ?? err?.response?.status;
      if (status === 401 || status === 403) return false;
      return count < 2;
    },
  });
