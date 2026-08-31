/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useAtom, useAtomValue } from "jotai";
import type { OnMount } from "@monaco-editor/react";
import { lazy, Suspense, useEffect, useRef } from "react";
import { cx } from "@/shared/ui/cx";
import { themeWithHtmlAtom } from "@/shared/ui/appearance-state";
import { typographyAtom } from "@/shared/ui/typography-state";
import { loadLocalMonacoEditor } from "@/capabilities/editor/load-local-monaco-editor";
import {
  defineEditorThemes,
  setEditorTheme,
  type MonacoNamespace,
} from "@/capabilities/editor/configure-editor-theme";
import { editorOptionsFor } from "@/capabilities/editor/editor-options";

type Props = {
  value: string;
  className?: string;
};

const MonacoEditor = lazy(loadLocalMonacoEditor);

export function SchemaCodeViewer({ value, className }: Props) {
  const [theme] = useAtom(themeWithHtmlAtom);
  const typography = useAtomValue(typographyAtom);
  const monacoRef = useRef<MonacoNamespace | null>(null);

  const mount: OnMount = (_editor, monacoNs) => {
    monacoRef.current = monacoNs;
    defineEditorThemes(monacoNs);
    setEditorTheme(monacoNs, theme === "dark");
  };

  useEffect(() => {
    if (monacoRef.current) {
      setEditorTheme(monacoRef.current, theme === "dark");
    }
  }, [theme]);

  return (
    <div
      className={cx(
        className ?? "h-[480px]",
        "overflow-hidden rounded border border-[var(--border-soft)] bg-[var(--surface-primary)]",
      )}
    >
      <Suspense fallback={<div className="h-full bg-[var(--surface-primary)]" />}>
        <MonacoEditor
          className="h-full"
          defaultLanguage="json"
          value={value}
          onMount={mount}
          options={{
            ...editorOptionsFor(typography),
            domReadOnly: true,
            readOnly: true,
            renderValidationDecorations: "off",
          }}
        />
      </Suspense>
    </div>
  );
}
