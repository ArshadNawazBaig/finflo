const mongoose = require('mongoose');

const regulatorySnapshotSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    reportType: {
      type: String,
      enum: ['ifrs9', 'basel3'],
      required: true,
    },
    periodStart: {
      type: Date,
    },
    periodEnd: {
      type: Date,
    },
    snapshotData: {
      type: Object, // Stores the exact JSON structure of the generated report
      required: true,
    },
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model('RegulatorySnapshot', regulatorySnapshotSchema);
