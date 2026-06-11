const logger = require('../utils/logger');
const { captureException } = require('../config/sentry');

// In-memory health registry for scheduled (cron) jobs. For a money system the
// scariest failure is a SILENT one — if the nightly late-fee or profit-
// distribution job dies, nobody knows. Every job is wrapped so each run records
// its outcome; the snapshot is exposed via /api/health so a stalled or failing
// job is visible and alertable.
const registry = new Map();

const ensure = (name) => {
  if (!registry.has(name)) {
    registry.set(name, {
      name,
      runs: 0,
      failures: 0,
      running: false,
      lastRunAt: null,
      lastSuccessAt: null,
      lastDurationMs: null,
      lastError: null,
      lastErrorAt: null,
    });
  }
  return registry.get(name);
};

/**
 * Wrap a cron runner so each execution records health. Errors are recorded,
 * logged, and reported to Sentry but NOT rethrown — a failing job must never
 * crash the process or stop the scheduler.
 * @param {string} name
 * @param {Function} fn async runner
 * @returns {Function} wrapped runner
 */
const wrap = (name, fn) => {
  ensure(name);
  return async (...args) => {
    const rec = ensure(name);
    const start = Date.now();
    rec.running = true;
    rec.lastRunAt = new Date();
    rec.runs += 1;
    try {
      const result = await fn(...args);
      rec.lastSuccessAt = new Date();
      rec.lastError = null;
      return result;
    } catch (err) {
      rec.failures += 1;
      rec.lastError = err?.message || String(err);
      rec.lastErrorAt = new Date();
      logger.error({ job: name, err }, `[CRON] ${name} failed`);
      captureException(err, { tags: { job: name } });
      return undefined;
    } finally {
      rec.lastDurationMs = Date.now() - start;
      rec.running = false;
    }
  };
};

/** Snapshot of all registered jobs (plain objects, safe to serialise). */
const getJobHealth = () => Array.from(registry.values()).map((r) => ({ ...r }));

/** True if any job has failed since its last successful run. */
const hasFailingJob = () =>
  getJobHealth().some(
    (j) =>
      j.lastErrorAt &&
      (!j.lastSuccessAt || j.lastErrorAt > j.lastSuccessAt),
  );

module.exports = { wrap, ensure, getJobHealth, hasFailingJob };
