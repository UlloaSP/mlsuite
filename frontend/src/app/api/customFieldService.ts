/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "./appFetch";

export interface CustomFieldDto {
	id: string;
	fileName: string;
	contentType: string;
	sizeBytes: number;
	createdAt: string;
	updatedAt: string;
	active: boolean;
	source: string;
}

export const getCustomFields = async (): Promise<CustomFieldDto[]> =>
	appFetch<CustomFieldDto[]>("/api/custom-field/all");

export const getActiveCustomFields = async (): Promise<CustomFieldDto[]> =>
	appFetch<CustomFieldDto[]>("/api/custom-field/active");

export const uploadCustomField = async (file: File): Promise<CustomFieldDto> => {
	const formData = new FormData();
	formData.append("file", file);
	return appFetch<CustomFieldDto>("/api/custom-field/upload", {
		method: "POST",
		body: formData,
	});
};

export const activateCustomField = async (id: string): Promise<CustomFieldDto> =>
	appFetch<CustomFieldDto>(`/api/custom-field/activate?id=${encodeURIComponent(id)}`, {
		method: "POST",
	});

export const deactivateCustomField = async (id: string): Promise<void> => {
	await appFetch(`/api/custom-field/deactivate?id=${encodeURIComponent(id)}`, {
		method: "POST",
	});
};

export const deactivateAllCustomFields = async (): Promise<void> => {
	await appFetch("/api/custom-field/deactivate-all", {
		method: "POST",
	});
};

export const deleteCustomField = async (id: string): Promise<void> => {
	await appFetch(`/api/custom-field/delete?id=${encodeURIComponent(id)}`, {
		method: "POST",
	});
};
