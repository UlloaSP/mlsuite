import * as monaco from 'monaco-editor';

export const editorOptions: monaco.editor.IStandaloneEditorConstructionOptions = {
    minimap: { enabled: false },
    fontSize: 14,
    fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
    lineNumbers: "on",
    roundedSelection: false,
    scrollBeyondLastLine: false,
    automaticLayout: true,
    tabSize: 2,
    insertSpaces: true,
    wordWrap: "on",
    bracketPairColorization: { enabled: true },
    accessibilitySupport: "on",
    smoothScrolling: true,
    cursorBlinking: "smooth",
    renderLineHighlight: "gutter",
}

export const editorLightTheme = {
    base: "vs",
    inherit: true,
    rules: [
        { token: "comment", foreground: "6b7280", fontStyle: "italic" },
        { token: "string.key.json", foreground: "1f2937" },
        { token: "string.value.json", foreground: "059669" },
        { token: "number", foreground: "2563eb" },
        { token: "keyword.json", foreground: "dc2626" },
        { token: "delimiter", foreground: "4b5563" },
    ],
    colors: {
        "editor.background": "#ffffff",
        "editor.foreground": "#1f2937",
        "editor.lineHighlightBackground": "#f8fafc",
        "editor.selectionBackground": "#dbeafe",
        "editorCursor.foreground": "#2563eb",
        "editorLineNumber.foreground": "#9ca3af",
        "editorLineNumber.activeForeground": "#1f2937",
        "editor.selectionHighlightBackground": "#e0e7ff",
    },
}

export const editorDarkTheme = {
    base: "vs-dark",
    inherit: true,
    rules: [
        { token: "comment", foreground: "6b7280", fontStyle: "italic" },
        { token: "string.key.json", foreground: "f3f4f6" },
        { token: "string.value.json", foreground: "34d399" },
        { token: "number", foreground: "60a5fa" },
        { token: "keyword.json", foreground: "f87171" },
        { token: "delimiter", foreground: "9ca3af" },
    ],
    colors: {
        "editor.background": "#1f2937",
        "editor.foreground": "#f3f4f6",
        "editor.lineHighlightBackground": "#374151",
        "editor.selectionBackground": "#3b82f6",
        "editorCursor.foreground": "#60a5fa",
        "editorLineNumber.foreground": "#6b7280",
        "editorLineNumber.activeForeground": "#f3f4f6",
        "editor.selectionHighlightBackground": "#1e40af",
    },
}
