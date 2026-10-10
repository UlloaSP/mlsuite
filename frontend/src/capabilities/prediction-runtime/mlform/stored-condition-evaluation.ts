/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { FieldConditionContext } from "mlform/runtime";
import { isRecord } from "./shared";

const comparable = (value: unknown): string | number | bigint | null => {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.getTime();
  if (typeof value === "number") return Number.isNaN(value) ? null : value;
  if (typeof value === "bigint") return value;
  if (typeof value !== "string") return null;
  const date = Date.parse(value);
  return !Number.isNaN(date) && /^\d{4}-\d{2}-\d{2}/.test(value) ? date : value;
};

const compare = (left: unknown, right: unknown): number | null => {
  const a = comparable(left),
    b = comparable(right);
  if (a === null || b === null || typeof a !== typeof b) return null;
  return a === b ? 0 : a < b ? -1 : 1;
};
const empty = (value: unknown) =>
  value == null ||
  (typeof value === "string" && !value.trim()) ||
  (Array.isArray(value) && !value.length) ||
  (value instanceof Date && Number.isNaN(value.getTime()));
const inList = (value: unknown, list: unknown) =>
  Array.isArray(list) && list.some((item) => Object.is(item, value));

/** MLForm no longer evaluates the stored form-status dialect, including its mixed groups. */
export const evaluateStoredCondition = (
  condition: unknown,
  context: FieldConditionContext,
  status: string,
): boolean => {
  if (!isRecord(condition)) return false;
  const value = typeof condition.field === "string" ? context.values[condition.field] : undefined;
  switch (condition.kind) {
    case "form-status":
      return inList(
        status,
        Array.isArray(condition.equals) ? condition.equals : [condition.equals],
      );
    case "form-operation":
      return inList(
        context.formOperation,
        Array.isArray(condition.equals) ? condition.equals : [condition.equals],
      );
    case "submission-status":
      return inList(
        context.submissionStatus,
        Array.isArray(condition.equals) ? condition.equals : [condition.equals],
      );
    case "all":
      return (
        Array.isArray(condition.conditions) &&
        condition.conditions.every((item) => evaluateStoredCondition(item, context, status))
      );
    case "any":
      return (
        Array.isArray(condition.conditions) &&
        condition.conditions.some((item) => evaluateStoredCondition(item, context, status))
      );
    case "not":
      return !evaluateStoredCondition(condition.condition, context, status);
    case "submit-count":
      return (
        (condition.eq === undefined || context.submitCount === condition.eq) &&
        (condition.gte === undefined || context.submitCount >= Number(condition.gte)) &&
        (condition.lte === undefined || context.submitCount <= Number(condition.lte))
      );
    case "field-comparison": {
      const difference = compare(
        value,
        typeof condition.otherField === "string" ? context.values[condition.otherField] : undefined,
      );
      if (difference === null) return false;
      switch (condition.operator) {
        case "eq":
          return difference === 0;
        case "neq":
          return difference !== 0;
        case "gt":
          return difference > 0;
        case "gte":
          return difference >= 0;
        case "lt":
          return difference < 0;
        case "lte":
          return difference <= 0;
      }
      return false;
    }
    case "field-value": {
      if (condition.equals !== undefined && !Object.is(value, condition.equals)) return false;
      if (condition.notEquals !== undefined && Object.is(value, condition.notEquals)) return false;
      for (const [key, matches] of [
        ["greaterThan", (result: number) => result > 0],
        ["greaterThanOrEqual", (result: number) => result >= 0],
        ["lessThan", (result: number) => result < 0],
        ["lessThanOrEqual", (result: number) => result <= 0],
      ] as const) {
        if (condition[key] === undefined) continue;
        const result = compare(value, condition[key]);
        if (result === null || !matches(result)) return false;
      }
      return (
        (condition.in === undefined || inList(value, condition.in)) &&
        (condition.notIn === undefined || !inList(value, condition.notIn)) &&
        (condition.empty !== true || empty(value)) &&
        (condition.notEmpty !== true || !empty(value)) &&
        (condition.truthy !== true || Boolean(value)) &&
        (condition.falsy !== true || !value)
      );
    }
    default:
      return false;
  }
};
