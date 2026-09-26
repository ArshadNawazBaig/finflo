const CronRun = require('../../src/models/CronRun');
const { executeJob } = require('../../src/services/vercelCronService');
const { jobs, runPeriod } = require('../../src/services/cronRegistry');
const { authorizeCron } = require('../../src/routes/cronRoutes');
const { mockRes } = require('../helpers/mocks');
const config = require('../../../../vercel.json');

describe('Vercel cron execution', () => {
  it('claims a daily job once across concurrent callers', async () => {
    let executions = 0;
    const job = { id: 'test', timezone: 'Asia/Karachi', run: async () => { executions++; } };
    const results = await Promise.all(Array.from({ length: 5 }, () => executeJob(job)));
    expect(executions).toBe(1);
    expect(results.filter((r) => r.status === 'succeeded')).toHaveLength(1);
    expect(await CronRun.countDocuments()).toBe(1);
  });

  it('records a failure without automatically replaying partially completed work', async () => {
    let executions = 0;
    const job = { id: 'failing', timezone: 'Asia/Karachi', run: async () => { executions++; throw new Error('failure'); } };
    await expect(executeJob(job)).rejects.toThrow('failure');
    expect(await executeJob(job)).toEqual({ status: 'duplicate', previousStatus: 'failed' });
    expect(executions).toBe(1);
    expect((await CronRun.findOne()).status).toBe('failed');
  });

  it('uses Pakistan dates and handles monthly UTC rollover', () => {
    const daily = jobs.find((j) => j.id === 'overdue');
    const monthly = jobs.find((j) => j.id === 'saving-distribution');
    expect(runPeriod(daily, new Date('2026-09-30T19:05:00Z'))).toBe('2026-10-01');
    expect(runPeriod(monthly, new Date('2026-09-30T22:00:00Z'))).toBe('2026-10-01');
    expect(runPeriod(monthly, new Date('2026-09-29T22:00:00Z'))).toBeNull();
    expect(runPeriod(monthly, new Date('2028-02-29T22:00:00Z'))).toBe('2028-03-01');
  });

  it('declares every schedule in the Vercel deployment', () => {
    expect(config.crons).toEqual(jobs.map((j) => ({ path: `/api/cron/${j.id}`, schedule: j.utcSchedule })));
  });

  it('requires the secret and explicit production enablement', () => {
    const saved = { CRON_SECRET: process.env.CRON_SECRET, VERCEL_CRON_ENABLED: process.env.VERCEL_CRON_ENABLED, VERCEL_ENV: process.env.VERCEL_ENV };
    try {
      process.env.CRON_SECRET = 'cron-test-value-longer-than-thirty-two-characters';
      process.env.VERCEL_CRON_ENABLED = 'true';
      process.env.VERCEL_ENV = 'production';
      const next = vi.fn();
      const unauthorized = mockRes();
      authorizeCron({ headers: {} }, unauthorized, next);
      expect(unauthorized.statusCode).toBe(401);
      expect(next).not.toHaveBeenCalled();
      const req = { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } };
      authorizeCron(req, mockRes(), next);
      expect(next).toHaveBeenCalledTimes(1);
      process.env.VERCEL_ENV = 'preview';
      const disabled = mockRes();
      authorizeCron(req, disabled, next);
      expect(disabled.body.status).toBe('disabled');
      expect(next).toHaveBeenCalledTimes(1);
      delete process.env.VERCEL_ENV;
      authorizeCron(req, mockRes(), next);
      expect(next).toHaveBeenCalledTimes(1);
    } finally {
      for (const [key, value] of Object.entries(saved)) {
        if (value === undefined) delete process.env[key]; else process.env[key] = value;
      }
    }
  });
});
