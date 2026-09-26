const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  _id: String,
  job: { type: String, required: true, index: true },
  period: { type: String, required: true },
  status: { type: String, enum: ['running', 'succeeded', 'failed'], required: true },
  startedAt: { type: Date, required: true },
  finishedAt: Date,
  error: String,
}, { versionKey: false });

schema.index({ job: 1, startedAt: -1 });
module.exports = mongoose.model('CronRun', schema);
