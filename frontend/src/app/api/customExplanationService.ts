/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "./appFetch";

export interface CustomExplanationDto {
	id: string;
	fileName: string;
	contentType: string;
	sizeBytes: number;
	createdAt: string;
	updatedAt: string;
	active: boolean;
	source: string;
}

export const getCustomExplanations = async (): Promise<CustomExplanationDto[]> =>
	appFetch<CustomExplanationDto[]>("/api/custom-explanation/all");

export const getActiveCustomExplanations = async (): Promise<CustomExplanationDto[]> =>
	appFetch<CustomExplanationDto[]>("/api/custom-explanation/active");

export const uploadCustomExplanation = async (
	file: File,
): Promise<CustomExplanationDto> => {
	const formData = new FormData();
	formData.append("file", file);
	return appFetch<CustomExplanationDto>("/api/custom-explanation/upload", {
		method: "POST",
		body: formData,
	});
};

export const activateCustomExplanation = async (
	id: string,
): Promise<CustomExplanationDto> =>
	appFetch<CustomExplanationDto>(
		`/api/custom-explanation/activate?id=${encodeURIComponent(id)}`,
		{
			method: "POST",
		},
	);

export const deactivateCustomExplanation = async (id: string): Promise<void> => {
	await appFetch(`/api/custom-explanation/deactivate?id=${encodeURIComponent(id)}`, {
		method: "POST",
	});
};

export const deactivateAllCustomExplanations = async (): Promise<void> => {
	await appFetch("/api/custom-explanation/deactivate-all", {
		method: "POST",
	});
};

export const deleteCustomExplanation = async (id: string): Promise<void> => {
	await appFetch(`/api/custom-explanation/delete?id=${encodeURIComponent(id)}`, {
		method: "POST",
	});
};
