// components/ErrorModal.tsx
import { AlertCircle } from "lucide-react";
import { useEffect } from "react";
import type { ErrorDto } from "../api/appFetch";

type Props = {
    open: boolean;
    error?: ErrorDto | null;
    onClose: () => void;
};

export function ErrorModal({ open, error, onClose }: Props) {
    useEffect(() => {
        if (!open) return;
        const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
        window.addEventListener("keydown", h);
        return () => window.removeEventListener("keydown", h);
    }, [open, onClose]);

    if (!open || !error) return null;

    const statusTone =
        error.status >= 500
            ? "bg-red-100 text-red-900 dark:bg-red-950/60 dark:text-red-200"
            : error.status >= 400
                ? "bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200"
                : "bg-slate-100 text-slate-900 dark:bg-slate-950/60 dark:text-slate-200";

    const panelBase =
        "relative w-full max-w-xl rounded-2xl border shadow-2xl outline-none " +
        "bg-white text-slate-900 border-slate-200 " +
        "dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800";

    const labelMuted = "text-xs font-medium text-slate-600 dark:text-neutral-400";
    const valueEmph = "font-medium text-slate-900 dark:text-neutral-100";

    const buttonBase =
        "px-3 py-2 rounded-xl text-sm transition-shadow outline-none ring-0 " +
        "focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-400 " +
        "dark:focus-visible:ring-neutral-500 dark:focus-visible:ring-offset-neutral-900";

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="error-modal-title"
        >
            {/* Backdrop with subtle blur for readability */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Dialog */}
            <div className={panelBase}>
                {/* Header */}
                <div className={`flex items-center gap-3 px-5 py-4 rounded-t-2xl ${statusTone}`}>
                    <AlertCircle className="size-5" aria-hidden />
                    <h2 id="error-modal-title" className="text-base font-semibold">
                        Request failed
                    </h2>
                </div>

                {/* Body */}
                <div className="px-5 py-4 space-y-4">
                    <p className="text-sm leading-relaxed text-slate-800 dark:text-neutral-200">
                        {error.message || "Unexpected error"}
                    </p>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="rounded-xl border border-slate-200 dark:border-neutral-800 p-3 bg-white/70 dark:bg-neutral-900/60">
                            <div className={labelMuted}>Status</div>
                            <div className={valueEmph}>{error.status}</div>
                        </div>
                        <div className="rounded-xl border border-slate-200 dark:border-neutral-800 p-3 bg-white/70 dark:bg-neutral-900/60">
                            <div className={labelMuted}>Path</div>
                            <div className={`${valueEmph} break-all`}>{error.path}</div>
                        </div>
                        <div className="col-span-2 rounded-xl border border-slate-200 dark:border-neutral-800 p-3 bg-white/70 dark:bg-neutral-900/60">
                            <div className={labelMuted}>Timestamp</div>
                            <div className={valueEmph}>{error.timestamp}</div>
                        </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 dark:border-neutral-800 overflow-hidden">
                        <div className="px-3 py-2 text-xs font-medium tracking-wide uppercase text-slate-600 dark:text-neutral-400 bg-slate-50 dark:bg-neutral-800/60 border-b border-slate-200 dark:border-neutral-800">
                            Raw payload (JSON)
                        </div>
                        <pre className="max-h-56 overflow-auto px-3 py-2 text-xs leading-5 font-mono bg-white dark:bg-neutral-900 text-slate-800 dark:text-neutral-200">
                            {JSON.stringify(error, null, 2)}
                        </pre>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-200 dark:border-neutral-800 bg-slate-50/60 dark:bg-neutral-900/60 rounded-b-2xl">
                    <button
                        onClick={onClose}
                        className={`${buttonBase} bg-slate-900 text-white dark:bg-white dark:text-neutral-900 hover:shadow-sm`}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
