export function runMatchesQuery(
  run: { name: string; id: string | number; status: string },
  query: string,
): boolean {
  const normalized = query.trim().toLowerCase();
  return (
    !normalized ||
    [run.name, run.id, run.status].some((value) => String(value).toLowerCase().includes(normalized))
  );
}
