/**
 * Corporate Fetch Wrapper – ‘Cookies’ edition
 *
 * Consolidated HTTP client built on top of the Fetch API.
 * ▸ Propagates cookies cross‑origin (SameSite=None) via `credentials: 'include'`.
 * ▸ Centralises response handling (2xx, 4xx, 5xx) behind a single access point.
 * ▸ Exposes hooks for global network errors and re‑authentication flows.
 * ▸ Written in strict TypeScript for safer integrations going forward.
 */

export interface ErrorPayload {
	globalError?: string;
	fieldErrors?: Record<string, string>;
}

type NetworkErrorHandler = () => void;
type ReauthenticationHandler = () => void;

let networkErrorCallback: NetworkErrorHandler = () => {};
let reauthenticationCallback: ReauthenticationHandler | null = null;

/**
 * Registers a global handler that will be fired on low‑level connectivity issues
 * (e.g. DNS failure, CORS blockage, server unreachable).
 */
export const initNetworkErrorHandler = (cb: NetworkErrorHandler): void => {
	networkErrorCallback = cb;
};

/**
 * Sets a callback to be invoked automatically whenever a 401 (Unauthorized)
 * is detected. Typical use case: launch a silent refresh or redirect to login.
 */
export const setReauthenticationCallback = (
	cb: ReauthenticationHandler,
): void => {
	reauthenticationCallback = cb;
};

type HttpMethod =
	| "GET"
	| "POST"
	| "PUT"
	| "PATCH"
	| "DELETE"
	| "OPTIONS"
	| "HEAD";

/**
 * Builds a `RequestInit` object that enforces cookie propagation and negotiates
 * the appropriate content type depending on the supplied body.
 *
 * @param method – HTTP verb. Defaults to 'GET'.
 * @param body   – Either `FormData` (sent as multipart) or a plain object
 *                 (serialised as JSON).
 */
export const config = (
	method: HttpMethod = "GET",
	body?: FormData | Record<string, unknown>,
): RequestInit => {
	const headers: Record<string, string> = {};
	let cfgBody: BodyInit | undefined;

	if (body !== undefined) {
		if (body instanceof FormData) {
			// Browser takes care of boundary & content‑type.
			cfgBody = body;
		} else {
			headers["Content-Type"] = "application/json";
			cfgBody = JSON.stringify(body);
		}
	}

	return {
		method,
		credentials: "include", // ⇒ cookies travel with the request
		headers: Object.keys(headers).length > 0 ? headers : undefined,
		body: cfgBody,
	};
};

// ---------------------------------------------------------------------------
// Internal helpers – not exported
// ---------------------------------------------------------------------------

const isJson = (r: Response): boolean =>
	r.headers.get("content-type")?.includes("application/json") ?? false;

/**
 * Handles successful responses (2xx).
 * • If `onSuccess` is supplied, forwards the parsed payload.
 * • For 204 No Content, simply fires the callback without arguments.
 */
const handleOk = <T>(r: Response, onSuccess?: (data?: T) => void): boolean => {
	if (!r.ok) return false;
	if (!onSuccess) return true;

	if (r.status === 204) {
		onSuccess();
		return true;
	}

	if (isJson(r)) {
		r.json().then(onSuccess as unknown as (value: unknown) => void);
	}
	return true;
};

/**
 * Handles client‑side errors (4xx).
 * • Triggers re‑authentication on 401 if a handler is present.
 * • For JSON error payloads, forwards structured information to `onErrors`.
 */
const handle4xx = (
	r: Response,
	onErrors?: (errors: ErrorPayload) => void,
): boolean => {
	if (r.status < 400 || r.status >= 500) return false;

	if (r.status === 401 && reauthenticationCallback) {
		reauthenticationCallback();
		return true;
	}

	if (!isJson(r)) throw new Error("NetworkError");

	if (onErrors) {
		r.json().then((payload: ErrorPayload) => {
			if (payload.globalError || payload.fieldErrors) {
				onErrors(payload);
			}
		});
	}
	return true;
};

/** Orchestrates the response‑handling chain. */
const handleResponse = <T>(
	r: Response,
	onSuccess?: (data?: T) => void,
	onErrors?: (errors: ErrorPayload) => void,
): void => {
	if (handleOk<T>(r, onSuccess)) return;
	if (handle4xx(r, onErrors)) return;
	throw new Error("NetworkError");
};

// ---------------------------------------------------------------------------
//  appFetch – single entry point for REST calls
// ---------------------------------------------------------------------------

/**
 * Executes a REST request against the back‑end.
 *
 * @template T Expected type of a successful JSON payload.
 * @param path       Relative URL (e.g. `/users/42`).
 * @param options    Custom `RequestInit` overrides. `credentials` is enforced
 *                   to be `'include'` regardless of caller input.
 * @param onSuccess  Callback for 2xx responses. Receives parsed payload of type T.
 * @param onErrors   Callback for business errors (4xx with JSON body).
 */
export const appFetch = <T = unknown>(
	path: string,
	options: RequestInit = {},
	onSuccess?: (data?: T) => void,
	onErrors?: (errors: ErrorPayload) => void,
): Promise<void> => {
	const finalOptions: RequestInit = {
		credentials: "include",
		...options,
		headers: {
			...(options.headers || {}),
		},
	};

	return fetch(`${import.meta.env.VITE_BACKEND_URL}${path}`, finalOptions)
		.then((r) => handleResponse<T>(r, onSuccess, onErrors))
		.catch(networkErrorCallback);
};
