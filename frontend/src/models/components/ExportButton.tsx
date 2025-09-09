import { useQueries } from "@tanstack/react-query";
import { FileDown } from "lucide-react";
import { motion } from "motion/react";
import { useMemo } from "react";
import type { PredictionDto, TargetDto } from "../api/modelService";
import * as modelApi from "../api/modelService"; // <-- use the fetcher directly
import { GET_TARGETS_QUERY_KEY } from "../hooks";

export type ExportButtonProps = {
	predictions: PredictionDto[];
	delimiter?: string;
};

type NormalizedStatus = "pending" | "completed" | "failed";
const norm = (s: string | undefined | null): NormalizedStatus => {
	const v = String(s ?? "").toLowerCase();
	if (v === "completed") return "completed";
	if (v === "failed") return "failed";
	return "pending";
};

const isPlainObject = (v: unknown) =>
	v !== null && typeof v === "object" && !Array.isArray(v) && !(v instanceof Date);

const toRecord = (
	m: Record<string, unknown>
): Record<string, unknown> => {
	if (m instanceof Map) {
		const out: Record<string, unknown> = {};
		m.forEach((v, k) => (out[k] = v));
		return out;
	}
	return (m ?? {}) as Record<string, unknown>;
};

const flatten = (obj: unknown, prefix = ""): Record<string, unknown> => {
	const out: Record<string, unknown> = {};
	if (Array.isArray(obj)) {
		obj.forEach((v, i) => Object.assign(out, flatten(v, prefix ? `${prefix}.${i}` : String(i))));
	} else if (isPlainObject(obj)) {
		Object.entries(obj as Record<string, unknown>).forEach(([k, v]) =>
			Object.assign(out, flatten(v, prefix ? `${prefix}.${k}` : k))
		);
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

export function ExportButton({ predictions, delimiter = "," }: ExportButtonProps) {
	// -------- meta / file name
	const meta = useMemo(() => {
		const uuid =
			typeof crypto !== "undefined" && "randomUUID" in crypto
				? crypto.randomUUID()
				: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
		const ts = new Date().toISOString();
		const firstName = predictions?.[0]?.name ?? "predictions";
		return { request_id: uuid, timestamp: ts, model_name: firstName };
	}, [predictions]);

	const sanitizeFile = (s: string) =>
		(s || "predictions")
			.replace(/[^a-z0-9\-_.]+/gi, "_")
			.replace(/_{2,}/g, "_")
			.slice(0, 80);

	const file = `${sanitizeFile(meta.model_name)}_${meta.timestamp.slice(0, 10)}.csv`;

	// -------- fetch targets in parallel (NO hooks inside queryFn)
	const targetsQueries = useQueries({
		queries: (predictions ?? []).map((p) => ({
			queryKey: GET_TARGETS_QUERY_KEY({ predictionId: p.id }), // align with your GET_TARGETS_QUERY_KEY if you want cache hits
			queryFn: async () => {
				// modelApi.getTargets returns TargetDto[] (match your hook’s shape)
				const data = await modelApi.getTargets({ predictionId: p.id || "" });
				return Array.isArray(data) ? data : [];
			},
			enabled: Boolean(p?.id),
			staleTime: 5 * 60_000,
			gcTime: 10 * 60_000,
			retry: (count: number, err: any) => {
				const s = err?.status ?? err?.response?.status;
				if (s === 401 || s === 403) return false;
				return count < 2;
			},
			placeholderData: [] as TargetDto[],
		})),
	});

	// -------- build CSV schema (headers) + rows
	const { headers, rows } = useMemo(() => {
		if (!predictions?.length) return { headers: [] as string[], rows: [] as string[][] };

		// Canonical input headers from FIRST prediction
		const firstInputs = toRecord(predictions[0].inputs);
		const flatFirstInputs = flatten(firstInputs);
		const inputKeys = Object.keys(flatFirstInputs).sort();

		// Target headers from first resolved targets (sorted by order)
		let sampleTargets: TargetDto[] | undefined;
		for (const q of targetsQueries) {
			if (Array.isArray(q.data) && q.data.length) {
				sampleTargets = q.data as TargetDto[];
				break;
			}
		}
		const sortedSample = [...(sampleTargets ?? [])].sort(
			(a, b) => Number(a.order) - Number(b.order)
		);
		const targetHeaders = sortedSample.map((t) => `target_${t.order}`);

		const headers = [...inputKeys, ...targetHeaders];

		// Rows: skip pending. completed => data_value; failed => real_value.
		const rows: string[][] = [];
		predictions.forEach((p, idx) => {
			const status = norm((p as any).status);
			if (status === "pending") return;

			const q = targetsQueries[idx];
			const targs: TargetDto[] = (q?.data as TargetDto[]) ?? [];
			if (!targs.length) return; // keep consistent schema (inputs+targets)

			const flatInputs = flatten(toRecord(p.inputs));
			const inputRow = inputKeys.map((k) => toCell(flatInputs[k]));

			const sortedTargs = [...targs].sort((a, b) => Number(a.order) - Number(b.order));
			const targetRow = sortedTargs.map((t) => {
				if (status === "completed") return toCell((t as any).value);
				if (status === "failed") return toCell((t as any).realValue);
				return "";
			});

			rows.push([...inputRow, ...targetRow]);
		});

		return { headers, rows };
	}, [predictions, targetsQueries]);

	const hasData = rows.length > 0 && headers.length > 0;

	const handleExport = () => {
		if (!hasData) return;

		const BOM = "\uFEFF";
		const headerLine = headers.map((h) => csvEscape(h, delimiter)).join(delimiter);
		const contentLines = rows
			.map((r) => r.map((c) => csvEscape(c, delimiter)).join(delimiter))
			.join("\n");
		const content = `${BOM}${headerLine}\n${contentLines}`;

		const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = file;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		setTimeout(() => URL.revokeObjectURL(url), 0);
	};

	return (
		<motion.button
			type="button"
			aria-label="Export predictions to CSV"
			onClick={handleExport}
			disabled={!hasData}
			initial={false}
			whileHover={{ scale: hasData ? 1.015 : 1, y: hasData ? -1 : 0 }}
			whileTap={{ scale: hasData ? 0.985 : 1, y: 0 }}
			transition={{ type: "spring", stiffness: 420, damping: 32 }}
			className={[
				"group inline-flex w-full items-center justify-center gap-2 rounded-md px-4 py-3",
				"text-sm font-medium outline-none transition-shadow",
				"bg-white text-gray-900 ring-1 ring-violet-400/40 shadow-sm shadow-violet-500/10",
				"hover:shadow-md hover:shadow-violet-500/20",
				"dark:bg-gray-900 dark:text-white dark:ring-violet-400/35",
				"focus-visible:ring-2 focus-visible:ring-violet-500/60",
				"relative isolate overflow-hidden",
				"after:absolute after:inset-0 after:-z-10 after:rounded-[inherit]",
				"after:bg-violet-500/15 dark:after:bg-violet-500/20 after:blur-xl after:opacity-0 group-hover:after:opacity-100",
				!hasData ? "opacity-60 cursor-not-allowed hover:shadow-none" : "",
			].join(" ")}
		>
			<FileDown size={18} className="opacity-90 group-hover:opacity-100" />
			<span>Export to CSV</span>
		</motion.button>
	);
}
