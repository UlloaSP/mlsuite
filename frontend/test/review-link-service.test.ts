import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import type { Mock } from "vite-plus/test";

const appFetch = vi.fn();

vi.mock("../src/app/api/appFetch", () => ({ appFetch }));

describe("review link service", () => {
	beforeEach(() => {
		appFetch.mockReset();
	});

	it("creates manager links through the review API", async () => {
		const api = await import("../src/review/api/reviewLinkService");
		appFetch.mockResolvedValue({
			id: 123,
			url: "https://ui.test/review/token",
			expiresAt: "2026-06-13T12:00:00Z",
			predictionCount: 2,
		});

		const result = await api.createReviewLink({
			modelId: "7",
			signatureId: "11",
			predictionIds: ["101", "102"],
			expiresAt: "2026-06-13T12:00:00Z",
		});

		expect(result.predictionCount).toBe(2);
		expect(appFetch).toHaveBeenCalledWith("/api/review-links", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				modelId: "7",
				signatureId: "11",
				predictionIds: ["101", "102"],
				expiresAt: "2026-06-13T12:00:00Z",
			}),
		});
	});

	it("uses token-scoped endpoints for review feedback", async () => {
		const api = await import("../src/review/api/reviewLinkService");
		(appFetch as Mock).mockResolvedValue({ id: "55", predictionId: "101" });

		await api.createReviewOutputFeedback("secret-token", {
			predictionId: "101",
			order: 0,
			value: { assessment: "correct" },
		});
		await api.updateReviewExplanationFeedback("secret-token", {
			explanationFeedbackId: "66",
			realValue: { useful: true },
		});
		await api.submitReviewPredictions("secret-token", ["101", "102"]);

		expect(appFetch).toHaveBeenNthCalledWith(1, "/api/review-links/token/secret-token/output-feedback", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				predictionId: "101",
				order: 0,
				value: { assessment: "correct" },
			}),
		});
		expect(appFetch).toHaveBeenNthCalledWith(2, "/api/review-links/token/secret-token/explanation-feedback", {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				explanationFeedbackId: "66",
				realValue: { useful: true },
			}),
		});
		expect(appFetch).toHaveBeenNthCalledWith(3, "/api/review-links/token/secret-token/submit", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ predictionTokens: ["101", "102"] }),
		});
	});

	it("uses opaque selection tokens for review navigation", async () => {
		const selection = await import("../src/review/reviewPredictionSelection");
		const items = [
			{ selectionToken: "opaque-101", prediction: { id: 101 } },
			{ selectionToken: "opaque-202", prediction: { id: 202 } },
		] as never;

		expect(selection.hasReviewPredictionToken(items, "opaque-202")).toBe(true);
		expect(selection.firstReviewPredictionToken(items)).toBe("opaque-101");
	});
});
