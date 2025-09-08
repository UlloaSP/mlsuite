import { FileDown } from "lucide-react";
import { motion } from "motion/react";
import { useMemo } from "react";
import type { TargetDto } from "../api/modelService";

export type ExportButtonProps = {
    name: string;
    inputs: Map<string, unknown>;
    targs: TargetDto[];
};

export function ExportButton({ name, inputs, targs }: ExportButtonProps) {
    // ---------- internals (no external props) ----------
    const delimiter = ","; // keep CSV canonical; Excel-safe via BOM below

    const meta = useMemo(() => {
        const uuid =
            typeof crypto !== "undefined" && "randomUUID" in crypto
                ? crypto.randomUUID()
                : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        const ts = new Date().toISOString();
        return { request_id: uuid, timestamp: ts, model_name: name };
    }, [name]);

    const sanitizeFile = (s: string) =>
        (s || "prediction")
            .replace(/[^a-z0-9\-_.]+/gi, "_")
            .replace(/_{2,}/g, "_")
            .slice(0, 80);

    const file = `${sanitizeFile(name)}_${meta.timestamp.slice(0, 10)}.csv`;

    const isPlainObject = (v: unknown) =>
        v !== null && typeof v === "object" && !Array.isArray(v) && !(v instanceof Date);

    const flatten = (obj: unknown, prefix = ""): Record<string, unknown> => {
        const out: Record<string, unknown> = {};
        if (Array.isArray(obj)) {
            obj.forEach((v, i) => {
                Object.assign(out, flatten(v, prefix ? `${prefix}.${i}` : String(i)));
            });
        } else if (isPlainObject(obj)) {
            Object.entries(obj as Record<string, unknown>).forEach(([k, v]) => {
                Object.assign(out, flatten(v, prefix ? `${prefix}.${k}` : k));
            });
        } else {
            out[prefix || "value"] = obj as unknown;
        }
        return out;
    };

    const toCell = (v: unknown): string => {
        if (v === null || v === undefined) return "";
        if (v instanceof Date) return v.toISOString();
        if (typeof v === "object") return JSON.stringify(v);
        return String(v);
    };

    const csvEscape = (s: string, sep: string) => {
        let v = s;
        if (v.includes('"')) v = v.replace(/"/g, '""');
        if (v.includes(sep) || v.includes("\n") || v.includes("\r")) v = `"${v}"`;
        return v;
    };

    const { headers, row } = useMemo(() => {
        // input.* (flattened + alpha)
        const flatInputs = flatten(inputs ?? {});
        const inputKeys = Object.keys(flatInputs).sort();
        const inputHeader = inputKeys;
        const inputRow = inputKeys.map((k) => toCell(flatInputs[k]));

        // targets sorted by order asc
        const sortedTargs = [...(targs ?? [])].sort(
            (a, b) => Number(a.order) - Number(b.order)
        );
        const targetHeader = sortedTargs.map((t) => `target_${t.order}`);
        const targetRow = sortedTargs.map((t) => toCell(t.value));

        return {
            headers: [...inputHeader, ...targetHeader],
            row: [...inputRow, ...targetRow],
        };
    }, [inputs, targs]);

    const hasData = headers.length > 0;

    const handleExport = () => {
        if (!hasData) return;
        const BOM = "\uFEFF"; // Excel-friendly
        const headerLine = headers.map((h) => csvEscape(h, delimiter)).join(delimiter);
        const rowLine = row.map((c) => csvEscape(c, delimiter)).join(delimiter);
        const content = `${BOM}${headerLine}\n${rowLine}`;

        const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = file;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        // release as soon as click resolves
        setTimeout(() => URL.revokeObjectURL(url), 0);
    };

    // ---------- UI ----------
    return (
        <motion.button
            type="button"
            aria-label="Export prediction to CSV"
            onClick={handleExport}
            disabled={!hasData}
            initial={false}
            whileHover={{ scale: hasData ? 1.015 : 1, y: hasData ? -1 : 0 }}
            whileTap={{ scale: hasData ? 0.985 : 1, y: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className={[
                // base container
                "group inline-flex w-full items-center justify-center gap-2 rounded-md px-4 py-3",
                "text-sm font-medium outline-none transition-shadow",
                // light theme
                "bg-white text-gray-900 ring-1 ring-violet-400/40 shadow-sm shadow-violet-500/10",
                "hover:shadow-md hover:shadow-violet-500/20",
                // dark theme
                "dark:bg-gray-900 dark:text-white dark:ring-violet-400/35",
                // focus state
                "focus-visible:ring-2 focus-visible:ring-violet-500/60",
                // fancy glow
                "relative isolate overflow-hidden",
                "after:absolute after:inset-0 after:-z-10 after:rounded-[inherit]",
                "after:bg-violet-500/15 dark:after:bg-violet-500/20 after:blur-xl after:opacity-0 group-hover:after:opacity-100",
                // disabled
                !hasData ? "opacity-60 cursor-not-allowed hover:shadow-none" : "",
            ].join(" ")}
        >
            <FileDown size={18} className="opacity-90 group-hover:opacity-100" />
            <span>Export to CSV</span>
        </motion.button>
    );
}
