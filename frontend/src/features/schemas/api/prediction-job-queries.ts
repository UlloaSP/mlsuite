/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { mutationOptions, queryOptions, useMutation, useQuery } from "@tanstack/react-query";
import { useCurrentOrganizationId } from "@/capabilities/workspace-context/workspace-context";
import { organizationQueryKey } from "@/shared/api/organization-query-key";
import type { CreatePredictionJobRequest, PredictionJobDto } from "@/shared/api/openapi.gen";
import {
  cancelPredictionJob,
  deletePredictionJob,
  getPredictionJobFailures,
  getPredictionJobs,
  retryPredictionJob,
  startPredictionJob,
} from "./prediction-job-api";

/** How often an open job's progress is read while its list is shown. */
export const PREDICTION_JOB_POLL_MS = 2000;

const jobsKey = (organizationId: number | string, bookmarkId: string) =>
  [...organizationQueryKey(organizationId), "predictionJobs", { bookmarkId }] as const;

export const isOpenJob = (job: PredictionJobDto) =>
  job.status === "QUEUED" || job.status === "RUNNING";

/** A bookmark's bulk jobs, newest first, read again while any of them is still open. */
export const predictionJobsQueryOptions = (organizationId: number | string, bookmarkId: string) =>
  queryOptions({
    queryKey: jobsKey(organizationId, bookmarkId),
    queryFn: ({ signal }) => getPredictionJobs(bookmarkId, signal),
    meta: { errorHandledLocally: true },
    refetchInterval: (query) =>
      query.state.data?.some(isOpenJob) ? PREDICTION_JOB_POLL_MS : false,
  });

export const usePredictionJobs = (bookmarkId: string, enabled = true) =>
  useQuery({
    ...predictionJobsQueryOptions(useCurrentOrganizationId() ?? "none", bookmarkId),
    enabled,
  });

export const predictionJobFailuresQueryOptions = (organizationId: number | string, jobId: number) =>
  queryOptions({
    queryKey: [...organizationQueryKey(organizationId), "predictionJobFailures", { jobId }],
    queryFn: ({ signal }) => getPredictionJobFailures(jobId, signal),
    meta: { errorHandledLocally: true },
  });

export const usePredictionJobFailures = (jobId: number, enabled: boolean) =>
  useQuery({
    ...predictionJobFailuresQueryOptions(useCurrentOrganizationId() ?? "none", jobId),
    enabled,
  });

/** Cancels, retries or deletes a job; the bookmark's list is read again whatever happens. */
const predictionJobActionMutation = (organizationId: number | string, bookmarkId: string) =>
  mutationOptions({
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
    onSettled: (_data, _error, _variables, _result, { client }) =>
      client.invalidateQueries({ queryKey: jobsKey(organizationId, bookmarkId) }),
  });

export const usePredictionJobAction = (bookmarkId: string) =>
  useMutation(predictionJobActionMutation(useCurrentOrganizationId() ?? "none", bookmarkId));

/** Sends a bulk upload as a job; the bookmark's list is read again whether or not it started. */
const startPredictionJobMutation = (organizationId: number | string, bookmarkId: string) =>
  mutationOptions({
    // The upload that asked says why a job did not start.
    meta: { errorHandledLocally: true },
    mutationFn: (request: CreatePredictionJobRequest) => startPredictionJob(bookmarkId, request),
    onSettled: (_job, _error, _request, _result, { client }) =>
      client.invalidateQueries({ queryKey: jobsKey(organizationId, bookmarkId) }),
  });

export const useStartPredictionJob = (bookmarkId: string) =>
  useMutation(startPredictionJobMutation(useCurrentOrganizationId() ?? "none", bookmarkId));
