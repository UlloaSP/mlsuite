/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

/*
 * The Monaco the app bundles: the editor API, the JSON language (its tokens, schema validation,
 * hover, completion and formatting) and the editor features the schema editors use. The package
 * root would also register about 80 languages, the TypeScript, CSS and HTML services and every
 * editor contribution. Import Monaco only through this module, and only lazily.
 */

import "monaco-editor/features/codeEditor/register";
import "monaco-editor/features/codicon/register";
import "monaco-editor/features/bracketMatching/register";
import "monaco-editor/features/clipboard/register";
import "monaco-editor/features/comment/register";
import "monaco-editor/features/contextmenu/register";
import "monaco-editor/features/cursorUndo/register";
import "monaco-editor/features/find/register";
import "monaco-editor/features/folding/register";
import "monaco-editor/features/format/register";
import "monaco-editor/features/gotoError/register";
import "monaco-editor/features/hover/register";
import "monaco-editor/features/indentation/register";
import "monaco-editor/features/linesOperations/register";
import "monaco-editor/features/multicursor/register";
import "monaco-editor/features/readOnlyMessage/register";
import "monaco-editor/features/smartSelect/register";
import "monaco-editor/features/suggest/register";
import "monaco-editor/features/wordHighlighter/register";
import "monaco-editor/features/wordOperations/register";
// What the package root always loads with the contributions: core cursor and editing commands,
// the suggestion widget (with the icon modifier styles), the marker status and their strings.
import "monaco-editor/editor/browser/coreCommands";
import "monaco-editor/editor/contrib/suggest/browser/suggestController";
import "monaco-editor/editor/contrib/gotoError/browser/markerSelectionStatus";
import "monaco-editor/editor/common/standaloneStrings";
import * as json from "monaco-editor/languages/features/json/register";
import * as api from "monaco-editor/editor";

export const monaco = { ...api, json };

export type MonacoNamespace = typeof monaco;
