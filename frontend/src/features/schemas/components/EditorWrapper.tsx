/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { EditorBody } from "./EditorBody";
import { EditorFooter } from "./EditorFooter";

export function EditorWrapper() {
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 min-h-0">
        <EditorBody />
      </div>
      <EditorFooter />
    </div>
  );
}
