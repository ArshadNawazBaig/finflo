const CronRun = require('../models/CronRun');
const { runPeriod, jobs } = require('./cronRegistry');
const { captureException } = require('../config/sentry');

const executeJob = async (job, now = new Date()) => {
  const period = runPeriod(job, now);
  if (!period) return { status: 'not-due' };
  const id = `${job.id}:${period}`;
  try {
    await CronRun.create({ _id: id, job: job.id, period, status: 'running', startedAt: now });
  } catch (err) {
    if (err.code !== 11000) throw err;
    const previous = await CronRun.findById(id).lean();
    // Never automatically replay a partially completed financial job.
    return { status: 'duplicate', previousStatus: previous.status };
  }
  try {
    await job.run();
    await CronRun.updateOne({ _id: id }, { $set: { status: 'succeeded', finishedAt: new Date() } });
    return { status: 'succeeded' };
  } catch (err) {
    await CronRun.updateOne({ _id: id }, {
      $set: { status: 'failed', finishedAt: new Date(), error: 'Job failed; inspect server logs before recovery.' },
    });
    captureException(err, { tags: { job: job.id } });
    throw err;
  }
};

const getPersistentJobHealth = async () => {
  const latest = await CronRun.aggregate([
    { $sort: { startedAt: -1 } },
    { $group: { _id: '$job', run: { $first: '$$ROOT' } } },
  ]);
  const byId = new Map(latest.map(({ _id, run }) => [_id, run]));
  return jobs.map((job) => {
    const run = byId.get(job.id);
    const timedOut = run?.status === 'running' && Date.now() - run.startedAt.getTime() > 300000;
    return {
      name: job.id,
      status: timedOut ? 'interrupted' : run?.status || 'not-run',
      lastRunAt: run?.startedAt || null,
      lastSuccessAt: run?.status === 'succeeded' ? run.finishedAt : null,
      needsReview: timedOut || run?.status === 'failed',
    };
  });
};

module.exports = { executeJob, getPersistentJobHealth };
