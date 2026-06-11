/**
 * Tests for the cron job-health registry. A failing scheduled job must be
 * RECORDED (so /api/health can surface it) but must NOT crash the scheduler —
 * the wrapper swallows the error after recording it.
 */
const { wrap, getJobHealth, hasFailingJob } = require('../../src/services/jobHealth');

const find = (name) => getJobHealth().find((j) => j.name === name);

describe('jobHealth.wrap', () => {
  it('records a successful run', async () => {
    const job = wrap('jh-success', async () => 'ok');
    const result = await job();
    expect(result).toBe('ok');

    const rec = find('jh-success');
    expect(rec.runs).toBe(1);
    expect(rec.failures).toBe(0);
    expect(rec.lastSuccessAt).toBeInstanceOf(Date);
    expect(rec.lastError).toBeNull();
    expect(typeof rec.lastDurationMs).toBe('number');
  });

  it('records a failure and does NOT rethrow', async () => {
    const job = wrap('jh-fail', async () => {
      throw new Error('boom');
    });
    await expect(job()).resolves.toBeUndefined(); // error swallowed, not thrown

    const rec = find('jh-fail');
    expect(rec.failures).toBe(1);
    expect(rec.lastError).toBe('boom');
    expect(rec.lastErrorAt).toBeInstanceOf(Date);
    expect(hasFailingJob()).toBe(true);
  });

  it('clears the failing state once a later run succeeds', async () => {
    const job = wrap('jh-recover', async (shouldFail) => {
      if (shouldFail) throw new Error('x');
    });
    await job(true);
    expect(find('jh-recover').lastError).toBe('x');

    await job(false);
    const rec = find('jh-recover');
    expect(rec.lastError).toBeNull();
    // The success is at least as recent as the error (may share a millisecond).
    expect(rec.lastSuccessAt >= rec.lastErrorAt).toBe(true);
  });
});
