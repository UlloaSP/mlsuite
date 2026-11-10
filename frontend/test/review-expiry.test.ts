/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { afterEach, describe, expect, test } from "vite-plus/test";
import {
  defaultReviewExpiryDate,
  reviewExpiryInstant,
} from "@/capabilities/review-creation/review-expiry";

const ZONES = ["Europe/Madrid", "Asia/Tokyo", "America/Los_Angeles", "UTC"];
const originalZone = process.env.TZ;

const localDate = (instant: string, timeZone: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date(instant));
const localTime = (instant: string, timeZone: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone, timeStyle: "medium" }).format(new Date(instant));

describe("a review expires at the end of the day chosen, in the user's own time zone", () => {
  afterEach(() => {
    process.env.TZ = originalZone;
  });

  test.each(ZONES)("in %s the chosen date is the date shown back", (zone) => {
    process.env.TZ = zone;

    const instant = reviewExpiryInstant("2026-12-09");

    expect(localDate(instant, zone)).toBe("2026-12-09");
    expect(localTime(instant, zone)).toBe("23:59:59");
  });

  test.each([
    // Early morning in Tokyo is still the day before in UTC.
    ["Asia/Tokyo", "2026-11-09T20:00:00Z", "2026-12-10"],
    // Late evening in Los Angeles is already the next day in UTC.
    ["America/Los_Angeles", "2026-11-10T06:30:00Z", "2026-12-09"],
    ["Europe/Madrid", "2026-11-09T23:30:00Z", "2026-12-10"],
  ])("in %s the default is 30 days after the user's today", (zone, now, expected) => {
    process.env.TZ = zone;

    expect(defaultReviewExpiryDate(new Date(now))).toBe(expected);
  });
});
