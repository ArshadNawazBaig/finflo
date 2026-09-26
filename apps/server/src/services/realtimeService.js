const mongoose = require('mongoose');
const { waitUntil } = require('@vercel/functions');
const { RealtimeEvent, RealtimeCounter, RealtimePresence } = require('../models/RealtimeEvent');
const { isServerless } = require('../config/runtime');
const logger = require('../utils/logger');

const identity = (req) => ({
  id: String(req.member?._id || req.user._id),
  tenant: String(req.member?.user || req.user.effectiveOwnerId || req.user.ownerId || req.user._id),
  model: req.member ? 'Member' : 'User',
});

const publish = async (room, event, data) => {
  // Initialize outside the transaction to avoid competing first-upsert inserts.
  try {
    await RealtimeCounter.updateOne({ _id: 'events' }, { $setOnInsert: { value: 0 } }, { upsert: true });
  } catch (err) {
    if (err.code !== 11000) throw err;
  }
  await mongoose.connection.transaction(async (session) => {
    const counter = await RealtimeCounter.findOneAndUpdate(
      { _id: 'events' }, { $inc: { value: 1 } }, { new: true, session },
    );
    await RealtimeEvent.create([{
      sequence: counter.value, room, event, data,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    }], { session });
  });
};

const createPollingIO = () => ({
  to: (room) => ({
    emit: (event, data) => {
      if (!/^(user|business)_/.test(room)) return;
      const pending = publish(room, event, data).catch((err) => {
        logger.error({ err, event }, 'Could not persist realtime event');
      });
      if (isServerless()) waitUntil(pending);
      return pending;
    },
  }),
});

const pollEvents = async (req, res, next) => {
  try {
    const actor = identity(req);
    const supplied = req.query.after;
    if (supplied !== undefined && (!/^\d+$/.test(String(supplied)) || !Number.isSafeInteger(Number(supplied)))) {
      return res.status(400).json({ message: 'Invalid event cursor' });
    }
    const counter = await RealtimeCounter.findById('events').lean();
    const high = counter?.value || 0;
    const after = supplied === undefined ? high : Math.min(Number(supplied), high);
    const businessRoom = { room: `business_${actor.tenant}` };
    if (actor.model === 'Member') businessRoom.event = 'business:branding_updated';
    const events = await RealtimeEvent.find({
      $or: [{ room: `user_${actor.id}` }, businessRoom],
      sequence: { $gt: after, $lte: high },
      expiresAt: { $gt: new Date() },
    }).sort({ sequence: 1 }).limit(100).select('sequence event data -_id').lean();
    await RealtimePresence.updateOne({ _id: actor.id }, {
      $set: { tenant: actor.tenant, userModel: actor.model, expiresAt: new Date(Date.now() + 45000) },
    }, { upsert: true });
    const presence = await RealtimePresence.find({
      tenant: actor.tenant, expiresAt: { $gt: new Date() },
    }).select('_id userModel').lean();
    res.set('Cache-Control', 'no-store');
    res.json({
      events, cursor: events.length === 100 ? events[events.length - 1].sequence : high,
      hasMore: events.length === 100,
      presence: presence.map((p) => ({ userId: p._id, userModel: p.userModel })),
    });
  } catch (err) { next(err); }
};

module.exports = { identity, publish, createPollingIO, pollEvents };
