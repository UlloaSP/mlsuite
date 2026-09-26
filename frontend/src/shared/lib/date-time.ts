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

/** A calendar date in the user's locale; returns the input when it is not a date. */
export const formatDate = (value: string): string => {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? dateFormatter.format(timestamp) : value;
};
