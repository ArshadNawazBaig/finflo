const crypto = require('crypto');
const router = require('express').Router();
const connectDB = require('../config/db');
const { jobs } = require('../services/cronRegistry');
const { executeJob } = require('../services/vercelCronService');

const authorizeCron = (req, res, next) => {
  const secret = process.env.CRON_SECRET;
  const actual = Buffer.from(req.headers.authorization || '');
  const expected = Buffer.from(`Bearer ${secret || ''}`);
  if (!secret || secret.length < 32 || actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) {
    return res.status(401).json({ message: 'Not authorized' });
  }
  if (process.env.VERCEL_CRON_ENABLED !== 'true' ||
      process.env.VERCEL_ENV !== 'production') {
    return res.status(200).json({ status: 'disabled' });
  }
  next();
};

router.get('/:job', authorizeCron, async (req, res, next) => {
  const job = jobs.find(({ id }) => id === req.params.job);
  if (!job) return res.status(404).json({ message: 'Unknown job' });
  try {
    await connectDB();
    const result = await executeJob(job);
    const needsReview = result.status === 'duplicate' && result.previousStatus !== 'succeeded';
    res.status(needsReview ? 409 : 200).json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
module.exports.authorizeCron = authorizeCron;
