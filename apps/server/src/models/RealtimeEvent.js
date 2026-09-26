const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  sequence: { type: Number, required: true, unique: true },
  room: { type: String, required: true },
  event: { type: String, required: true },
  data: mongoose.Schema.Types.Mixed,
  expiresAt: { type: Date, required: true },
}, { versionKey: false });
schema.index({ room: 1, sequence: 1 });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const counterSchema = new mongoose.Schema({ _id: String, value: { type: Number, default: 0 } });
const presenceSchema = new mongoose.Schema({
  _id: String,
  tenant: { type: String, required: true, index: true },
  userModel: { type: String, enum: ['User', 'Member'], required: true },
  expiresAt: { type: Date, required: true },
});
presenceSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = {
  RealtimeEvent: mongoose.model('RealtimeEvent', schema),
  RealtimeCounter: mongoose.model('RealtimeCounter', counterSchema),
  RealtimePresence: mongoose.model('RealtimePresence', presenceSchema),
};
