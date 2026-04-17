/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Editor } from "@monaco-editor/react";
import { useAtom } from "jotai";
import { parse as parseWithSourceMap } from "json-source-map";
import { getLocation } from "jsonc-parser";
import type * as Monaco from "monaco-editor";
import { useEffect, useRef } from "react";

import { themeWithHtmlAtom } from "../../app/atoms";
import {
	mlformJsonSchema,
	validateMlformSchema,
} from "../../app/utils/mlform";
import { schemaAtom, schemaErrorsAtom, schemaTextAtom } from "../atoms";
import {
	editorDarkTheme,
	editorLightTheme,
	editorOptions,
} from "../utils/editorConfig";

/**
 * Estructura consumida por <EditorErrorCard>.
 */
interface EditorErrorCard {
	line: number;
	column: number;
	path: string;
	message: string;
}

type MonacoNamespace = typeof import("monaco-editor");

// ────────────────────────────────────────── Helpers ──
const isFieldKindPath = (p: (string | number)[]) =>
	p.length === 3 &&
	p[0] === "fields" &&
	typeof p[1] === "number" &&
	p[2] === "kind";

const pathToPos = (content: string, pathArr: (string | number)[]) => {
	const pointer = "/" + pathArr.map(String).join("/");
	const loc = parseWithSourceMap(content).pointers[pointer]?.key ||
		parseWithSourceMap(content).pointers[pointer]?.value || {
		line: 0,
		column: 0,
	};
	return { line: loc.line + 1, column: loc.column + 1 };
};

// ────────────────────────────────────────── Componente ──
export function EditorBody() {
	/** Atoms */
	const [schemaText, setSchemaText] = useAtom(schemaTextAtom);
	const [, setSchema] = useAtom(schemaAtom);
	const [, setSchemaErrors] = useAtom(schemaErrorsAtom);
	const [theme] = useAtom(themeWithHtmlAtom);

	/** Refs */
	const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
	const monacoRef = useRef<MonacoNamespace | null>(null);
	const compatCardsRef = useRef<EditorErrorCard[]>([]);

	// ────────────────────────────── Mount ──
	const handleOnMount = (
		editor: Monaco.editor.IStandaloneCodeEditor,
		monacoNs: MonacoNamespace,
	) => {
		editorRef.current = editor;
		monacoRef.current = monacoNs;

		/* Temas corporativos */
		monacoNs.editor.defineTheme(
			"corporate-light",
			editorLightTheme as Monaco.editor.IStandaloneThemeData,
		);
		monacoNs.editor.defineTheme(
			"corporate-dark",
			editorDarkTheme as Monaco.editor.IStandaloneThemeData,
		);
		monacoNs.editor.setTheme(
			theme === "dark" ? "corporate-dark" : "corporate-light",
		);

		/* JSON Schema generado por MLForm */
		(monacoNs.languages as any).json.jsonDefaults.setDiagnosticsOptions({
			validate: true,
			enableSchemaRequest: false,
			schemas: [
				{
					uri: "internal://root.schema.json",
					fileMatch: ["*"],
					schema: mlformJsonSchema,
				},
			],
		});
	};

	// ────────────────────────────── Change ──
	const handleOnChange = (value?: string) => {
		const text = value ?? "";
		setSchemaText(text);

		/* Validación semántica + markers owner "mlform-compat" */
		if (editorRef.current && monacoRef.current) {
			const monacoNs = monacoRef.current;
			const model = editorRef.current.getModel();
			if (!model) return;

			const compatMarkers: Monaco.editor.IMarkerData[] = [];
			const compatCards: EditorErrorCard[] = [];
			try {
				const parsed = JSON.parse(text);

				const res = validateMlformSchema(parsed);
				if (res.success) {
					setSchema(parsed);
				}

				if (!res.success) {
					res.issues.forEach((issue) => {
						const { line, column } = pathToPos(text, issue.path);
						const pathStr = issue.path.length ? issue.path.join(".") : "root";

						compatCards.push({
							line,
							column,
							path: pathStr,
							message: issue.message,
						});
						compatMarkers.push({
							startLineNumber: line,
							startColumn: (() => {
								const lineContent = text.split("\n")[line - 1] || "";
								const colonIdx = lineContent.indexOf(":");
								if (colonIdx !== -1) {
									const quoteIdx = lineContent.indexOf('"', colonIdx);
									return quoteIdx !== -1 ? quoteIdx + 1 : column;
								}
								return column;
							})(),
							endLineNumber: line,
							endColumn: model.getLineMaxColumn(line),
							message: issue.message,
							severity: monacoNs.MarkerSeverity.Error,
							source: "mlform-compat",
							code: pathStr,
						});
					});
				}

				monacoNs.editor.setModelMarkers(model, "mlform-compat", compatMarkers);
				compatCardsRef.current = compatCards;
			} catch {
				monacoNs.editor.setModelMarkers(model, "mlform-compat", []);
				compatCardsRef.current = [];
			}
		}
	};

	// ─────────────────────────── Validate ──
	const handleOnValidate = (markers: Monaco.editor.IMarker[]) => {
		if (!editorRef.current) return;
		const model = editorRef.current.getModel();
		if (!model) return;
		const content = model.getValue();

		/* Solo markers del worker (fuente !== "mlform-compat") */
		const workerCards: EditorErrorCard[] = markers
			.filter((m) => m.source !== "mlform-compat")
			.map((m) => {
				const pathArr = getLocation(
					content,
					model.getOffsetAt({
						lineNumber: m.startLineNumber,
						column: m.startColumn,
					}),
				).path;
				const pathStr = pathArr.length ? pathArr.join(".") : "root";

				return {
					line: m.startLineNumber,
					column: m.startColumn,
					path: pathStr,
					message: isFieldKindPath(pathArr)
						? 'Valor "kind" no válido. Tipos permitidos: "text" | "number" | "boolean" | "category" | "date" | "time-series".'
						: m.message,
				};
			});
		setSchemaErrors([...workerCards, ...compatCardsRef.current]);
	};

	// Cambio de tema en caliente
	useEffect(() => {
		if (monacoRef.current) {
			monacoRef.current.editor.setTheme(
				theme === "dark" ? "corporate-dark" : "corporate-light",
			);
		}
	}, [theme]);

	// ───────────────────────────── Render ──
	return (
		<Editor
			className="w-full"
			defaultLanguage="json"
			value={schemaText}
			onChange={handleOnChange}
			onMount={handleOnMount}
			onValidate={handleOnValidate}
			options={editorOptions}
		/>
	);
}
