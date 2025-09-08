import { Editor } from "@monaco-editor/react";
import { useAtom } from "jotai";
import { parse as parseWithSourceMap } from "json-source-map";
import { getLocation } from "jsonc-parser";
import { MLForm } from "mlform";
import {
    BooleanStrategy,
    CategoryStrategy,
    ClassifierStrategy,
    DateStrategy,
    NumberStrategy,
    RegressorStrategy,
    TextStrategy,
} from "mlform/strategies";
import * as monaco from "monaco-editor";
import { useEffect, useRef } from "react";

import { themeWithHtmlAtom } from "../../app/atoms";
import {
    schemaAtom,
    schemaErrorsAtom,
    schemaTextAtom,
} from "../atoms";
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

// ────────────────────────────────────────── Helpers ──
const isInputTypePath = (p: (string | number)[]) =>
    p.length === 3 && p[0] === "inputs" && typeof p[1] === "number" && p[2] === "type";

const pathToPos = (content: string, pathArr: (string | number)[]) => {
    const pointer = "/" + pathArr.map(String).join("/");
    const loc =
        parseWithSourceMap(content).pointers[pointer]?.key ||
        parseWithSourceMap(content).pointers[pointer]?.value || { line: 0, column: 0 };
    return { line: loc.line + 1, column: loc.column + 1 };
};

// ────────────────────────────────────────── Componente ──
export function EditorBody() {
    /** MLForm + estrategias */
    const f = new MLForm(`${import.meta.env.VITE_BACKEND_URL}/api/analyzer/predict/by-blob`);
    [
        new DateStrategy(),
        new RegressorStrategy(),
        new ClassifierStrategy(),
        new NumberStrategy(),
        new TextStrategy(),
        new CategoryStrategy(),
        new BooleanStrategy(),
    ].forEach((s) => f.register(s));

    /** Atoms */
    const [schemaText, setSchemaText] = useAtom(schemaTextAtom);
    const [, setSchema] = useAtom(schemaAtom);
    const [, setSchemaErrors] = useAtom(schemaErrorsAtom);
    const [theme] = useAtom(themeWithHtmlAtom);

    /** Refs */
    const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
    const monacoRef = useRef<typeof monaco | null>(null);
    const refineCardsRef = useRef<EditorErrorCard[]>([]);   // último resultado Zod

    // ────────────────────────────── Mount ──
    const handleOnMount = (
        editor: monaco.editor.IStandaloneCodeEditor,
        monacoNs: typeof monaco,
    ) => {
        editorRef.current = editor;
        monacoRef.current = monacoNs;

        /* Temas corporativos */
        monacoNs.editor.defineTheme("corporate-light", editorLightTheme as monaco.editor.IStandaloneThemeData);
        monacoNs.editor.defineTheme("corporate-dark", editorDarkTheme as monaco.editor.IStandaloneThemeData);
        monacoNs.editor.setTheme(theme === "dark" ? "corporate-dark" : "corporate-light");

        /* JSON Schema generado por MLForm */
        monacoNs.languages.json.jsonDefaults.setDiagnosticsOptions({
            validate: true,
            enableSchemaRequest: false,
            schemas: [
                {
                    uri: "internal://root.schema.json",
                    fileMatch: ["*"],
                    schema: f.schema(),
                },
            ],
        });
    };

    // ────────────────────────────── Change ──
    const handleOnChange = async (value?: string) => {
        const text = value ?? "";
        setSchemaText(text);

        /* Validación semántica (Zod) + markers owner "zod" */
        if (editorRef.current && monacoRef.current) {
            const monacoNs = monacoRef.current;
            const model = editorRef.current.getModel();
            if (!model) return;

            const zodMarkers: monaco.editor.IMarkerData[] = [];
            const refineCards: EditorErrorCard[] = [];

            try {
                const parsed = JSON.parse(text);
                const res = await f.validateSchema(parsed);
                if (res.success && res.data) {
                    setSchema(parsed);
                }

                if (!res.success && res.error) {
                    const customIssues = res.error.issues.filter((issue: any) => issue.code === "custom");
                    if (customIssues.length > 0) {
                        customIssues.map((issue: any) => {
                            const path: any[] = ["inputs", ...(issue.path ?? [])]
                            const { line, column } = pathToPos(text, path);
                            const pathStr = path.length ? path.join(".") : "root";

                            refineCards.push({ line, column, path: pathStr, message: issue.message });
                            zodMarkers.push({
                                startLineNumber: line,
                                // Move startColumn to the first quote after the colon
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
                                source: "zod",
                                code: pathStr,
                            });
                        });
                    }
                }
            } catch { }

            monacoNs.editor.setModelMarkers(model, "zod", zodMarkers);
            refineCardsRef.current = refineCards;
        }
    };

    // ─────────────────────────── Validate ──
    const handleOnValidate = (markers: monaco.editor.IMarker[]) => {
        if (!editorRef.current) return;
        const model = editorRef.current.getModel();
        if (!model) return;
        const content = model.getValue();

        /* Solo markers del worker (fuente !== "zod") */
        const workerCards: EditorErrorCard[] = markers
            .filter((m) => m.source !== "zod")
            .map((m) => {
                const pathArr = getLocation(content, model.getOffsetAt({
                    lineNumber: m.startLineNumber,
                    column: m.startColumn,
                })).path;
                const pathStr = pathArr.length ? pathArr.join(".") : "root";

                return {
                    line: m.startLineNumber,
                    column: m.startColumn,
                    path: pathStr,
                    message: isInputTypePath(pathArr)
                        ? 'Valor "type" no válido. Tipos permitidos: "date" | "string" | "number" | …'
                        : m.message,
                };
            });
        setSchemaErrors([...workerCards, ...refineCardsRef.current]);
    };

    // Cambio de tema en caliente
    useEffect(() => {
        if (monacoRef.current) {
            monacoRef.current.editor.setTheme(theme === "dark" ? "corporate-dark" : "corporate-light");
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
