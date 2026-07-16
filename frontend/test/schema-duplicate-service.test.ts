/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { beforeEach, describe, expect, it, vi, type Mock } from "vite-plus/test";
import { duplicateSchema } from "../src/api/schemas/services/duplicate-schema";

const { appFetch } = vi.hoisted(() => ({ appFetch: vi.fn() }));

vi.mock("../src/api/core/services/app-fetch", () => ({ appFetch }));

describe("schema duplicate service", () => {
  beforeEach(() => {
    appFetch.mockReset();
  });

  it("sends the selected snapshot id", async () => {
    (appFetch as Mock).mockResolvedValue({ id: "6", name: "Risk Copy" });

    await duplicateSchema({ id: "5", name: "Risk Copy", versionId: "8" });

    expect(appFetch).toHaveBeenCalledWith("/api/schemas/5/duplicate?name=Risk+Copy&versionId=8", {
      method: "POST",
    });
  });

  it("keeps latest-snapshot fallback when no snapshot id is supplied", async () => {
    (appFetch as Mock).mockResolvedValue({ id: "6", name: "Risk Copy" });

    await duplicateSchema({ id: "5", name: "Risk Copy" });

    expect(appFetch).toHaveBeenCalledWith("/api/schemas/5/duplicate?name=Risk+Copy", {
      method: "POST",
    });
  });

  it("propagates duplication errors", async () => {
    const error = new Error("Snapshot outside schema");
    (appFetch as Mock).mockRejectedValue(error);

    let caught: unknown;
    try {
      await duplicateSchema({ id: "5", name: "Risk Copy", versionId: "8" });
    } catch (cause) {
      caught = cause;
    }

    expect(caught).toBe(error);
  });
});
