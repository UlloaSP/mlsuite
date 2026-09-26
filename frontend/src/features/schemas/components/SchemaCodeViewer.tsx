/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useAtomValue } from "jotai";
import type { OnMount } from "@monaco-editor/react";
import { lazy, Suspense, useEffect, useRef } from "react";
import { cx } from "@/shared/ui/cx";
import { typographyAtom } from "@/shared/ui/typography-state";
import { loadLocalMonacoEditor } from "@/capabilities/editor/load-local-monaco-editor";
import {
  applyEditorTheme,
  useEditorAppearance,
  type MonacoNamespace,
} from "@/capabilities/editor/configure-editor-theme";
import { editorOptionsFor } from "@/capabilities/editor/editor-options";

type Props = {
  value: string;
  className?: string;
};

const MonacoEditor = lazy(loadLocalMonacoEditor);

export function SchemaCodeViewer({ value, className }: Props) {
  const appearance = useEditorAppearance();
  const typography = useAtomValue(typographyAtom);
  const monacoRef = useRef<MonacoNamespace | null>(null);

  const mount: OnMount = (_editor, monacoNs) => {
    monacoRef.current = monacoNs;
    applyEditorTheme(monacoNs, appearance.dark);
  };

  // Tokens change with mode, palette, and contrast; rebuild the theme from them.
  useEffect(() => {
    if (monacoRef.current) applyEditorTheme(monacoRef.current, appearance.dark);
  }, [appearance.key, appearance.dark]);

  return (
    <div
      className={cx(
        className ?? "h-[480px]",
        "overflow-hidden rounded-card border border-line bg-surface",
      )}
    >
      <Suspense fallback={<div className="h-full bg-surface" />}>
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
