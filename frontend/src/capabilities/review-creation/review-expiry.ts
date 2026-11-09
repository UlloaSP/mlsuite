/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

/**
 * A review's expiry is chosen as a calendar date and means the end of that day where the user
 * is: an instant read in UTC would land on the next day east of it and on this day's afternoon
 * west of it, and the review would be shown expiring on another date than the one chosen.
 */

const pad = (value: number) => String(value).padStart(2, "0");

/** The date input's value for a day of the user's own calendar. */
const localDateValue = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/** Thirty days after the user's today. */
export const defaultReviewExpiryDate = (now = new Date()): string => {
  const date = new Date(now);
  date.setDate(date.getDate() + 30);
  return localDateValue(date);
};

/** The last second of the chosen day (YYYY-MM-DD) in the user's time zone, as the API stores it. */
export const reviewExpiryInstant = (date: string): string => {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year!, month! - 1, day, 23, 59, 59).toISOString();
};
