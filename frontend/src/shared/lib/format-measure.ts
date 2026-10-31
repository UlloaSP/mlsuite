const number = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });

/** A number with the unit the API gave it, always in the plural: "12,400 rows", "1 row", "85.5%". */
export const formatMeasure = (value: number, unit: string): string => {
  if (unit === "%" || unit === "") return `${number.format(value)}${unit}`;
  return `${number.format(value)} ${value === 1 ? unit.replace(/s$/, "") : unit}`;
};
