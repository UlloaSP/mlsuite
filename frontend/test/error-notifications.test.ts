import { beforeEach, describe, expect, test, vi } from "vite-plus/test";
import { emitErrorFromUnknown } from "@/shared/api/error-notifications";
import { HttpError } from "@/shared/api/http";

const toasts = vi.hoisted(() => ({ error: vi.fn() }));
vi.mock("@/shared/ui/toast", () => ({ toast: toasts }));

const refusal = (status: number, message: string) =>
  new HttpError({ timestamp: "2026-11-09T00:00:00Z", status, message, path: "/api/x/1" });

describe("unowned failure toasts", () => {
  beforeEach(() => toasts.error.mockReset());

  test("say what the server said, never its status or path", () => {
    emitErrorFromUnknown(refusal(404, "Schema review unavailable"));

    expect(toasts.error).toHaveBeenCalledWith("Schema review unavailable");
    expect(JSON.stringify(toasts.error.mock.calls)).not.toMatch(/404|\/api\//);
  });

  test("a request that never reached the server says so in plain words", () => {
    emitErrorFromUnknown(refusal(0, "Network Error"));
    emitErrorFromUnknown(new TypeError("boom"));

    expect(toasts.error.mock.calls).toEqual([
      ["The server could not be reached. Check your connection and try again."],
      ["The server could not be reached. Check your connection and try again."],
    ]);
  });
});
