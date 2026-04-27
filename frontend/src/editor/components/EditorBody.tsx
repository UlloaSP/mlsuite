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
	getActiveCustomFieldDefinitions,
	type CatalogFieldDefinition,
} from "../../app/utils/mlform/custom-field";
import {
	getActiveCustomExplanationDefinitions,
	type CatalogExplanationDefinition,
} from "../../app/utils/mlform/custom-explanation";
import {
	getActiveCustomReportDefinitions,
	type CatalogReportDefinition,
} from "../../app/utils/mlform/custom-report";
import {
	invalidatePluginCatalog,
} from "../../app/utils/mlform/plugin-catalog";
import { pluginCatalogVersionAtom } from "../../app/utils/mlform/plugin-catalog-state";
import {
	mlformJsonSchema,
	schemaNeedsActivePluginCatalog,
	validateMlformSchema,
} from "../../app/utils/mlform/index";
import { schemaAtom, schemaErrorsAtom, schemaTextAtom } from "../atoms";
import { editorDarkTheme, editorLightTheme, editorOptions } from "../utils/editorConfig";

interface EditorErrorCard {
	line: number;
	column: number;
	path: string;
	message: string;
	severity: "error" | "warning";
}

type MonacoNamespace = typeof import("monaco-editor");

const isFieldKindPath = (p: (string | number)[]) =>
	p.length === 3 &&
	p[0] === "fields" &&
	typeof p[1] === "number" &&
	p[2] === "kind";

const pathToPos = (content: string, pathArr: (string | number)[]) => {
	const pointer = `/${pathArr.map(String).join("/")}`;
	const parsed = parseWithSourceMap(content);
	const loc = parsed.pointers[pointer]?.key || parsed.pointers[pointer]?.value || {
		line: 0,
		column: 0,
	};
	return { line: loc.line + 1, column: loc.column + 1 };
};

export function EditorBody() {
	const [schemaText, setSchemaText] = useAtom(schemaTextAtom);
	const [, setSchema] = useAtom(schemaAtom);
	const [, setSchemaErrors] = useAtom(schemaErrorsAtom);
	const [theme] = useAtom(themeWithHtmlAtom);
	const [pluginCatalogVersion] = useAtom(pluginCatalogVersionAtom);

	const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
	const monacoRef = useRef<MonacoNamespace | null>(null);
	const compatCardsRef = useRef<EditorErrorCard[]>([]);
	const validationSequenceRef = useRef(0);
	const catalogFieldDefinitionsRef = useRef<readonly CatalogFieldDefinition[]>([]);
	const catalogReportDefinitionsRef = useRef<readonly CatalogReportDefinition[]>([]);
	const catalogDefinitionsRef = useRef<readonly CatalogExplanationDefinition[]>([]);
	const catalogWarningRef = useRef<EditorErrorCard | null>(null);

	const applyCompatValidation = (
		text: string,
		customFieldDefinitions: readonly CatalogFieldDefinition[],
		customReportDefinitions: readonly CatalogReportDefinition[],
		customExplanationDefinitions: readonly CatalogExplanationDefinition[],
	) => {
		if (!editorRef.current || !monacoRef.current) {
			return;
		}

		const monacoNs = monacoRef.current;
		const model = editorRef.current.getModel();
		if (!model) {
			return;
		}

		const runId = ++validationSequenceRef.current;
		const compatMarkers: Monaco.editor.IMarkerData[] = [];
		const compatCards: EditorErrorCard[] = [];

		try {
			const parsed = JSON.parse(text);
			const result = validateMlformSchema(parsed, {
				customFieldDefinitions,
				customReportDefinitions,
				customExplanationDefinitions,
			});

			if (runId !== validationSequenceRef.current) {
				return;
			}

			if (result.success) {
				setSchema(parsed);
			}

			for (const issue of result.issues) {
				const { line, column } = pathToPos(text, issue.path);
				const pathStr = issue.path.length ? issue.path.join(".") : "root";

				compatCards.push({
					line,
					column,
					path: pathStr,
					message: issue.message,
					severity: issue.severity,
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
					severity:
						issue.severity === "warning"
							? monacoNs.MarkerSeverity.Warning
							: monacoNs.MarkerSeverity.Error,
					source: "mlform-compat",
					code: pathStr,
				});
			}

			if (catalogWarningRef.current) {
				compatCards.push(catalogWarningRef.current);
				compatMarkers.push({
					startLineNumber: 1,
					startColumn: 1,
					endLineNumber: 1,
					endColumn: model.getLineMaxColumn(1),
					message: catalogWarningRef.current.message,
					severity: monacoNs.MarkerSeverity.Warning,
					source: "mlform-compat",
					code: "catalog",
				});
			}

			monacoNs.editor.setModelMarkers(model, "mlform-compat", compatMarkers);
			compatCardsRef.current = compatCards;
		} catch {
			monacoNs.editor.setModelMarkers(model, "mlform-compat", []);
			compatCardsRef.current = catalogWarningRef.current ? [catalogWarningRef.current] : [];
		}
	};

	const handleOnMount = (
		editor: Monaco.editor.IStandaloneCodeEditor,
		monacoNs: MonacoNamespace,
	) => {
		editorRef.current = editor;
		monacoRef.current = monacoNs;

		monacoNs.editor.defineTheme(
			"corporate-light",
			editorLightTheme as Monaco.editor.IStandaloneThemeData,
		);
		monacoNs.editor.defineTheme(
			"corporate-dark",
			editorDarkTheme as Monaco.editor.IStandaloneThemeData,
		);
		monacoNs.editor.setTheme(theme === "dark" ? "corporate-dark" : "corporate-light");

		(monacoNs.languages as typeof Monaco.languages & {
			json: {
				jsonDefaults: {
					setDiagnosticsOptions(options: unknown): void;
				};
			};
		}).json.jsonDefaults.setDiagnosticsOptions({
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

		applyCompatValidation(
			editor.getValue(),
			catalogFieldDefinitionsRef.current,
			catalogReportDefinitionsRef.current,
			catalogDefinitionsRef.current,
		);
	};

	const handleOnChange = (value?: string) => {
		const text = value ?? "";
		setSchemaText(text);
		applyCompatValidation(
			text,
			catalogFieldDefinitionsRef.current,
			catalogReportDefinitionsRef.current,
			catalogDefinitionsRef.current,
		);
	};

	const handleOnValidate = (markers: Monaco.editor.IMarker[]) => {
		if (!editorRef.current) {
			return;
		}

		const model = editorRef.current.getModel();
		if (!model) {
			return;
		}

		const content = model.getValue();

		const workerCards: EditorErrorCard[] = markers
			.filter((marker) => marker.source !== "mlform-compat")
			.map((marker) => {
				const pathArr = getLocation(
					content,
					model.getOffsetAt({
						lineNumber: marker.startLineNumber,
						column: marker.startColumn,
					}),
				).path;
				const pathStr = pathArr.length ? pathArr.join(".") : "root";

				return {
					line: marker.startLineNumber,
					column: marker.startColumn,
					path: pathStr,
					message: isFieldKindPath(pathArr)
						? 'Valor "kind" no válido. Tipos permitidos: "text" | "number" | "boolean" | "category" | "date" | "time-series".'
						: marker.message,
					severity:
						marker.severity === monacoRef.current?.MarkerSeverity.Warning
							? "warning"
							: "error",
				};
			});

		setSchemaErrors([...workerCards, ...compatCardsRef.current]);
	};

	useEffect(() => {
		let cancelled = false;

		void (async () => {
			try {
				const [customFieldDefinitions, customReportDefinitions, customDefinitions] = await Promise.all([
					getActiveCustomFieldDefinitions(),
					getActiveCustomReportDefinitions(),
					getActiveCustomExplanationDefinitions(),
				]);
				if (cancelled) {
					return;
				}

				catalogFieldDefinitionsRef.current = customFieldDefinitions;
				catalogReportDefinitionsRef.current = customReportDefinitions;
				catalogDefinitionsRef.current = customDefinitions;
				catalogWarningRef.current = null;
				const nextText = editorRef.current?.getValue() ?? schemaText;
				applyCompatValidation(
					nextText,
					customFieldDefinitions,
					customReportDefinitions,
					customDefinitions,
				);
			} catch (error: unknown) {
				if (cancelled) {
					return;
				}

				catalogFieldDefinitionsRef.current = [];
				catalogReportDefinitionsRef.current = [];
				catalogDefinitionsRef.current = [];
				catalogWarningRef.current = {
					line: 1,
					column: 1,
					path: "catalog",
					message:
						error instanceof Error
							? `Custom plugin catalog could not be loaded: ${error.message}`
							: `Custom plugin catalog could not be loaded: ${String(error)}`,
					severity: schemaNeedsActivePluginCatalog(editorRef.current?.getValue() ?? schemaText)
						? "error"
						: "warning",
				};
				const nextText = editorRef.current?.getValue() ?? schemaText;
				applyCompatValidation(nextText, [], [], []);
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [pluginCatalogVersion]);

	useEffect(() => {
		invalidatePluginCatalog();
	}, [pluginCatalogVersion]);

	useEffect(() => {
		if (monacoRef.current) {
			monacoRef.current.editor.setTheme(
				theme === "dark" ? "corporate-dark" : "corporate-light",
			);
		}
	}, [theme]);

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
