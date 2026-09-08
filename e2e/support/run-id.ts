/**
 * A per-run identifier that every happy-flow spec stamps onto the data it creates.
 *
 * The suite writes real rows into the local database, so two runs must never be able to
 * collide — including the case that matters most, a run that crashed before its cleanup and
 * left its rows behind. The id is computed once per process from the clock plus randomness, so
 * a later run reads the leftovers as somebody else's data rather than its own.
 *
 * `E2E_RUN_ID` overrides it, which is what a scheduled runner uses when it wants the id in a
 * report to match the id in the database.
 */
const generate = (): string => {
  const clock = Date.now().toString(36);
  const noise = Math.random().toString(36).slice(2, 6);
  return `${clock}${noise}`;
};

export const RUN_ID = process.env.E2E_RUN_ID || generate();

/**
 * A name unique to this run — `uniqueName("Coffee")` -> `"Coffee E2E m8p3q1x9"`.
 *
 * The `E2E` marker is there so that a human looking at leftover rows can tell at a glance
 * that a test made them.
 */
export const uniqueName = (prefix: string): string => `${prefix} E2E ${RUN_ID}`;
