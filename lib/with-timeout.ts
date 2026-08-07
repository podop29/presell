/**
 * Stage-level deadlines.
 *
 * Railway's edge proxy answers with a plain-text `upstream error` 502 when the
 * app produces no response in time. That looks identical to a crash from the
 * browser, so anything that can hang needs its own bound — otherwise a slow
 * upstream turns into an unexplainable 502 with nothing in our logs.
 */

export class StageTimeoutError extends Error {
  constructor(
    public readonly stage: string,
    public readonly ms: number
  ) {
    super(`${stage} exceeded its ${ms}ms budget`);
    this.name = "StageTimeoutError";
  }
}

/**
 * Race `work` against a deadline. Note this does not cancel the underlying
 * work — it bounds how long we *wait* so the request can answer the client.
 * Callers whose work holds a resource must still clean it up themselves.
 */
export async function withTimeout<T>(
  stage: string,
  ms: number,
  work: () => Promise<T>
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new StageTimeoutError(stage, ms)), ms);
  });

  try {
    return await Promise.race([work(), deadline]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Records how long each stage of a request took, for error reporting. */
export class StageTimer {
  private readonly started = Date.now();
  private readonly marks: Array<[string, number]> = [];
  private last = Date.now();

  mark(stage: string): void {
    const now = Date.now();
    this.marks.push([stage, now - this.last]);
    this.last = now;
  }

  get totalMs(): number {
    return Date.now() - this.started;
  }

  /** e.g. "scrape=8210ms, ai=31044ms, pexels=612ms (total 39866ms)" */
  summary(): string {
    const parts = this.marks.map(([stage, ms]) => `${stage}=${ms}ms`);
    return `${parts.join(", ")} (total ${this.totalMs}ms)`;
  }
}
