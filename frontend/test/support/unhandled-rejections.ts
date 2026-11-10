/**
 * The promise rejections nothing handled while `run` ran and settled: an action whose failure the
 * app already shows must not also raise one.
 */
export async function unhandledRejections(run: () => Promise<void>): Promise<unknown[]> {
  const seen: unknown[] = [];
  const listener = (reason: unknown) => seen.push(reason);
  process.on("unhandledRejection", listener);
  try {
    await run();
    await new Promise((resolve) => setTimeout(resolve, 20));
  } finally {
    process.off("unhandledRejection", listener);
  }
  return seen;
}
