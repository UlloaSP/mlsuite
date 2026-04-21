/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "./appFetch";

export interface CustomReportDto {
	id: string;
	fileName: string;
	contentType: string;
	sizeBytes: number;
	createdAt: string;
	updatedAt: string;
	active: boolean;
	source: string;
}

export const getCustomReports = async (): Promise<CustomReportDto[]> =>
	appFetch<CustomReportDto[]>("/api/custom-report/all");

export const getActiveCustomReports = async (): Promise<CustomReportDto[]> =>
	appFetch<CustomReportDto[]>("/api/custom-report/active");

export const uploadCustomReport = async (file: File): Promise<CustomReportDto> => {
	const formData = new FormData();
	formData.append("file", file);
	return appFetch<CustomReportDto>("/api/custom-report/upload", {
		method: "POST",
		body: formData,
	});
};

export const activateCustomReport = async (id: string): Promise<CustomReportDto> =>
	appFetch<CustomReportDto>(`/api/custom-report/activate?id=${encodeURIComponent(id)}`, {
		method: "POST",
	});

export const deactivateCustomReport = async (id: string): Promise<void> => {
	await appFetch(`/api/custom-report/deactivate?id=${encodeURIComponent(id)}`, {
		method: "POST",
	});
};

export const deactivateAllCustomReports = async (): Promise<void> => {
	await appFetch("/api/custom-report/deactivate-all", {
		method: "POST",
	});
};

export const deleteCustomReport = async (id: string): Promise<void> => {
	await appFetch(`/api/custom-report/delete?id=${encodeURIComponent(id)}`, {
		method: "POST",
	});
};
