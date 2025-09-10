import { HttpError, isHttpError, type ErrorDto } from "../api/appFetch";

type ErrorListener = (dto: ErrorDto) => void;

let listener: ErrorListener | null = null;

export function registerErrorListener(l: ErrorListener) { listener = l; }
export function unregisterErrorListener() { listener = null; }

export function emitErrorFromUnknown(err: unknown) {
    if (listener == null) return;
    if (isHttpError(err)) {
        listener((err as HttpError).dto);
    } else {
        listener({
            timestamp: new Date().toISOString(),
            status: 0,
            message: "Network or unknown error",
            path: typeof window !== "undefined" ? window.location.pathname : "/",
        });
    }
}
