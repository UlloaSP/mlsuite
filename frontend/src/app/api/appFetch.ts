/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

// ---- Server contract (exact) ----
export type ErrorDto = {
	timestamp: string;
	status: number;
	message: string;
	path: string;
};

// ---- Single error type for the app ----
export class HttpError extends Error {
	readonly dto: ErrorDto;

	constructor(dto: ErrorDto) {
		super(dto.message);
		this.name = "HttpError";
		this.dto = dto;
	}

	get status() { return this.dto.status; }
	get timestamp() { return this.dto.timestamp; }
	get path() { return this.dto.path; }
}

// Optional helper for narrowing
export const isHttpError = (e: unknown): e is HttpError =>
	e instanceof HttpError;

type ReauthenticationHandler = () => void;
type NetworkErrorHandler = () => void;

let reauthCb: ReauthenticationHandler | null = null;
let netErrCb: NetworkErrorHandler = () => { };

export const setReauthenticationCallback = (cb: ReauthenticationHandler) => (reauthCb = cb);
export const initNetworkErrorHandler = (cb: NetworkErrorHandler) => (netErrCb = cb);

const BASE = import.meta.env.VITE_BACKEND_URL;

const buildInit = (init?: RequestInit): RequestInit => ({
	credentials: "include",
	...init,
	headers: {
		...(init?.headers || {}),
	},
});

const isJson = (res: Response) =>
	res.headers.get("content-type")?.includes("application/json") ?? false;

const nowIso = () => new Date().toISOString();

function fabricateDto(res: Response, path: string, msg: string): ErrorDto {
	return {
		timestamp: nowIso(),
		status: res.status,
		message: msg,
		path: new URL(path, BASE).pathname,
	};
}

function fabricateNetworkDto(path: string, msg = "Network Error"): ErrorDto {
	return {
		timestamp: nowIso(),
		status: 0, // non-HTTP failure
		message: msg,
		path: new URL(path, BASE).pathname,
	};
}

/** Query-ready fetcher that only throws HttpError wrapping ErrorDto */
export async function appFetch<T = unknown>(path: string, init?: RequestInit): Promise<T> {
	try {
		const res = await fetch(`${BASE}${path}`, buildInit(init));

		// Success
		if (res.ok) {
			if (res.status === 204) return undefined as T;
			if (isJson(res)) return (await res.json()) as T;
			return undefined as T;
		}

		// Auth hook
		if (res.status === 401 && reauthCb) reauthCb();

		// Error: prefer server ErrorDto JSON
		if (isJson(res)) {
			const dto = (await res.json()) as ErrorDto;
			throw new HttpError(dto);
		}

		// Fallback: synthesize ErrorDto from Response
		throw new HttpError(fabricateDto(res, path, res.statusText || "Request error"));
	} catch (e) {
		// Network / CORS / DNS, etc.
		netErrCb();
		// If it's already our HttpError, bubble it; otherwise wrap as network HttpError
		if (isHttpError(e)) throw e;
		throw new HttpError(fabricateNetworkDto(path));
	}
}
