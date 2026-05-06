/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "./appFetch";

export interface PluginDto {
	id: string;
	fileName: string;
	contentType: string;
	sizeBytes: number;
	createdAt: string;
	updatedAt: string;
	active: boolean;
	source: string;
}

export const getPlugins = async (): Promise<PluginDto[]> => appFetch<PluginDto[]>("/api/plugins");

export const getActivePlugins = async (): Promise<PluginDto[]> =>
	appFetch<PluginDto[]>("/api/plugins/active");

export const uploadPlugin = async (file: File): Promise<PluginDto> => {
	const formData = new FormData();
	formData.append("file", file);
	return appFetch<PluginDto>("/api/plugins", {
		method: "POST",
		body: formData,
	});
};

export const activatePlugin = async (id: string): Promise<PluginDto> =>
	appFetch<PluginDto>(`/api/plugins/activation?id=${encodeURIComponent(id)}`, {
		method: "PUT",
	});

export const deactivatePlugin = async (id: string): Promise<void> => {
	await appFetch(`/api/plugins/activation?id=${encodeURIComponent(id)}`, {
		method: "DELETE",
	});
};

export const deactivateAllPlugins = async (): Promise<void> => {
	await appFetch("/api/plugins/activations", {
		method: "DELETE",
	});
};

export const deletePlugin = async (id: string): Promise<void> => {
	await appFetch(`/api/plugins?id=${encodeURIComponent(id)}`, {
		method: "DELETE",
	});
};
