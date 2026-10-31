/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCurrentOrganizationId } from "@/capabilities/workspace-context/workspace-context";
import { organizationQueryKey } from "@/shared/api/organization-query-key";
import type { PredictionJobDto } from "@/shared/api/openapi.gen";
import {
  cancelPredictionJob,
  deletePredictionJob,
  getPredictionJobFailures,
  getPredictionJobs,
  retryPredictionJob,
} from "./prediction-job-api";

/** How often an open job's progress is read while its list is shown. */
export const PREDICTION_JOB_POLL_MS = 2000;

const jobsKey = (organizationId: number | string, bookmarkId: string) =>
  [...organizationQueryKey(organizationId), "predictionJobs", { bookmarkId }] as const;

export const isOpenJob = (job: PredictionJobDto) =>
  job.status === "QUEUED" || job.status === "RUNNING";

/** A bookmark's bulk jobs, newest first, read again while any of them is still open. */
export function usePredictionJobs(bookmarkId: string, enabled = true) {
  const organizationId = useCurrentOrganizationId() ?? "none";
  return useQuery({
    queryKey: jobsKey(organizationId, bookmarkId),
    queryFn: ({ signal }) => getPredictionJobs(bookmarkId, signal),
    enabled,
    meta: { errorHandledLocally: true },
    refetchInterval: (query) =>
      query.state.data?.some(isOpenJob) ? PREDICTION_JOB_POLL_MS : false,
  });
}

export function usePredictionJobFailures(jobId: number, enabled: boolean) {
  const organizationId = useCurrentOrganizationId() ?? "none";
  return useQuery({
    queryKey: [...organizationQueryKey(organizationId), "predictionJobFailures", { jobId }],
    queryFn: ({ signal }) => getPredictionJobFailures(jobId, signal),
    enabled,
    meta: { errorHandledLocally: true },
  });
}

/** Cancels, retries or deletes a job; the bookmark's list is read again whatever happens. */
export function usePredictionJobAction(bookmarkId: string) {
  const organizationId = useCurrentOrganizationId() ?? "none";
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      jobId,
      action,
    }: {
      jobId: number;
      action: "cancel" | "retry" | "delete";
    }): Promise<void> => {
      if (action === "cancel") await cancelPredictionJob(jobId);
      else if (action === "retry") await retryPredictionJob(jobId);
      else await deletePredictionJob(jobId);
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: jobsKey(organizationId, bookmarkId) }),
  });
}

export const predictionJobsKey = jobsKey;
