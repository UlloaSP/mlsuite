// types
export interface ErrorPayload {
	globalError?: string;
	fieldErrors?: Record<string, string>;
}

export class AppHttpError extends Error {
	status: number;
	payload?: ErrorPayload;
	constructor(message: string, status: number, payload?: ErrorPayload) {
		super(message);
		this.status = status;
		this.payload = payload;
	}
}

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

/** Query-ready fetcher */
export async function appFetch<T = unknown>(path: string, init?: RequestInit): Promise<T> {
	try {
		const res = await fetch(`${BASE}${path}`, buildInit(init));

		// Success path
		if (res.ok) {
			if (res.status === 204) return undefined as T; // widen T to T | undefined if needed
			if (isJson(res)) return (await res.json()) as T;
			// Non-JSON success
			return undefined as T;
		}

		// Error path
		if (res.status === 401 && reauthCb) reauthCb();

		let payload: ErrorPayload | undefined;
		if (isJson(res)) {
			try { payload = (await res.json()) as ErrorPayload; } catch { /* ignore parse error */ }
		}

		const message =
			payload?.globalError ||
			res.statusText ||
			(res.status >= 500 ? "Server error" : "Request error");

		throw new AppHttpError(message, res.status, payload);
	} catch (e) {
		// Network / CORS / DNS, etc.
		netErrCb();
		// Re-throw so TanStack Query can handle it
		throw e;
	}
}
