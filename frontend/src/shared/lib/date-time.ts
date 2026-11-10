const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "short",
  timeStyle: "short",
});

export const formatTimestamp = (value: string): string => {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && timestamp !== 0
    ? dateTimeFormatter.format(timestamp)
    : value;
};

const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });

const formDateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeZone: "UTC",
});

/**
 * A day a form stored (MLForm keeps a date as that day's midnight UTC) in the user's locale, read
 * in UTC so no time zone moves it to the day before; returns the input when it is not a date.
 */
export const formatFormDate = (value: string): string => {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? formDateFormatter.format(timestamp) : value;
};

/** A calendar date in the user's locale; returns the input when it is not a date. */
export const formatDate = (value: string): string => {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? dateFormatter.format(timestamp) : value;
};
