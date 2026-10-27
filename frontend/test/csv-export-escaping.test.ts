/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { describe, expect, test } from "vite-plus/test";
import { csvEscape } from "@/capabilities/prediction-runtime/data/export-csv";

describe("an exported field", () => {
  test.each([
    ["plain", "plain"],
    ['He said "hi"', '"He said ""hi"""'],
    ["a,b", '"a,b"'],
    ["two\nlines", '"two\nlines"'],
    ["carriage\rreturn", '"carriage\rreturn"'],
    ["", ""],
  ])("%j is written as RFC 4180 asks", (value, written) => {
    expect(csvEscape(value, ",")).toBe(written);
  });

  test("is quoted for the separator in use", () => {
    expect(csvEscape("a;b", ";")).toBe('"a;b"');
    expect(csvEscape("a,b", ";")).toBe("a,b");
  });

  test.each([
    ["=1+1", "'=1+1"],
    ["+cmd|' /C calc'!A0", "'+cmd|' /C calc'!A0"],
    ["-2+3", "'-2+3"],
    ["@SUM(A1:A2)", "'@SUM(A1:A2)"],
    ["\tlead", "'\tlead"],
    ['=HYPERLINK("http://x")', '"\'=HYPERLINK(""http://x"")"'],
  ])("%j is kept as text, never run as a formula", (value, written) => {
    expect(csvEscape(value, ",")).toBe(written);
  });

  test.each(["-5", "+1.5", "-0.25e-3", "42", ".5"])("the number %j stays a number", (value) => {
    expect(csvEscape(value, ",")).toBe(value);
  });
});
