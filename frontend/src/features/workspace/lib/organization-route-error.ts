import { isHttpError } from "@/shared/api/http";

export const organizationRouteErrorStatus = (error: unknown): 0 | 403 | 404 | 500 => {
  if (!isHttpError(error)) return 500;
  if (error.status === 0 || error.status === 403 || error.status === 404) return error.status;
  return 500;
};
