/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { beforeEach, describe, expect, it, vi, type Mock } from "vite-plus/test";

const appFetch = vi.fn();

vi.mock("../src/app/api/appFetch", () => ({ appFetch }));

describe("artifact inspection service", () => {
  beforeEach(() => {
    appFetch.mockReset();
  });

  it("posts artifact file to analyzer inspection endpoint", async () => {
    const { inspectArtifact } = await import("../src/models/api/artifactService");
    const file = new File(["x"], "artifact.joblib");
    (appFetch as Mock).mockResolvedValue({ kind: "dataframe", fileName: "artifact.joblib" });

    const result = await inspectArtifact(file);

    expect(result.kind).toBe("dataframe");
    expect(appFetch).toHaveBeenCalledWith("/api/analyzer/artifacts/inspect", {
      method: "POST",
      body: expect.any(FormData),
    });
  });

  it("propagates inspection errors", async () => {
    const { inspectArtifact } = await import("../src/models/api/artifactService");
    const error = new Error("bad artifact");
    (appFetch as Mock).mockRejectedValue(error);

    await expect(inspectArtifact(new File(["x"], "artifact.joblib"))).rejects.toBe(error);
  });

  it("posts model and dataframe files to artifact match endpoint", async () => {
    const { matchArtifacts } = await import("../src/models/api/artifactService");
    (appFetch as Mock).mockResolvedValue({ models: [], dataframes: [] });

    await matchArtifacts({
      models: [new File(["x"], "model.joblib")],
      dataframes: [new File(["x"], "data.joblib")],
    });

    expect(appFetch).toHaveBeenCalledWith("/api/analyzer/artifacts/match", {
      method: "POST",
      body: expect.any(FormData),
    });
  });
});
