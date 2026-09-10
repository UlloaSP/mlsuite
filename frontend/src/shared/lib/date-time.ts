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
