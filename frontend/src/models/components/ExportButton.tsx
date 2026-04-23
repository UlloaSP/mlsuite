/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useQueries } from "@tanstack/react-query";
import { FileDown } from "lucide-react";
import { motion } from "motion/react";
import { useMemo } from "react";
import { cx } from "../../app/components";
import type { PredictionDto, TargetDto } from "../api/modelService";
import * as modelApi from "../api/modelService"; // <-- use the fetcher directly
import { GET_TARGETS_QUERY_KEY } from "../hooks";
import { getSchemaAwareTargetValue, getTargetLabel } from "../target-utils";

export type ExportButtonProps = {
	predictions: PredictionDto[];
	delimiter?: string;
	signatureSchema?: unknown;
};

type NormalizedStatus = "pending" | "success" | "failed";
const norm = (s: string | undefined | null): NormalizedStatus => {
	const v = String(s ?? "").toLowerCase();
	if (v === "completed" || v === "success") return "success";
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

export function ExportButton({ predictions, delimiter = ",", signatureSchema }: ExportButtonProps) {
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
		const targetHeaders = sortedSample.map((t) => getTargetLabel(signatureSchema, t.order));

		const headers = [...inputKeys, ...targetHeaders];

		// Rows: skip pending. success => data_value; failed => real_value.
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
				if (status === "success") {
					return toCell(getSchemaAwareTargetValue(
						(t as any).value,
						signatureSchema,
						Number(t.order),
						p.prediction,
					));
				}
				if (status === "failed") return toCell((t as any).realValue);
				return "";
			});

			rows.push([...inputRow, ...targetRow]);
		});

		return { headers, rows };
	}, [predictions, targetsQueries, signatureSchema]);

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
			className={cx(
				"group inline-flex w-full items-center justify-center gap-2 rounded-full px-4 py-3",
				"text-sm font-medium outline-none transition-shadow",
				"border border-[var(--border-soft)] bg-[var(--surface-primary)] text-[var(--text-primary)] shadow-[var(--shadow-card)]",
				"hover:border-[var(--text-primary)] hover:bg-[var(--surface-muted)] hover:shadow-[var(--shadow-hover)]",
				!hasData && "cursor-not-allowed opacity-60 hover:shadow-none",
			)}
		>
			<FileDown size={18} className="opacity-90 group-hover:opacity-100" />
			<span>Export to CSV</span>
		</motion.button>
	);
}
