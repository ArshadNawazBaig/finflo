/**
 * Dispute schema — ticketNumber + slaDeadline are auto-generated in
 * pre('validate') (NOT pre('save'), which runs after validation and left the
 * `required` slaDeadline undefined — the portal-dispute 500 we fixed).
 */
const mongoose = require('mongoose');
const Dispute = require('../../src/models/Dispute');

const base = () => ({
  user: new mongoose.Types.ObjectId(),
  member: new mongoose.Types.ObjectId(),
  subject: 'Wrong charge on my account',
  description: 'I was charged twice for the same transfer.',
});

describe('Dispute schema', () => {
  it('auto-generates slaDeadline + ticketNumber on create (no validation error)', async () => {
    const dispute = await Dispute.create(base());
    expect(dispute.slaDeadline).toBeInstanceOf(Date);
    expect(dispute.slaDeadline.getTime()).toBeGreaterThan(Date.now());
    expect(dispute.ticketNumber).toMatch(/^DSP-\d{5}$/);
  });

  it('derives slaDeadline from priority (urgent = 4h, low = 168h)', async () => {
    const urgent = await Dispute.create({ ...base(), priority: 'urgent' });
    const low = await Dispute.create({ ...base(), priority: 'low' });
    const hours = (d) =>
      (d.slaDeadline.getTime() - d.createdAt.getTime()) / 3.6e6;
    expect(hours(urgent)).toBeCloseTo(4, 1);
    expect(hours(low)).toBeCloseTo(168, 1);
  });

  it('requires user, member, subject and description', () => {
    const err = new Dispute({}).validateSync();
    ['user', 'member', 'subject', 'description'].forEach((f) =>
      expect(err.errors[f]).toBeTruthy(),
    );
  });

  it('starts unread for the owner, read for the member', async () => {
    const dispute = await Dispute.create(base());
    expect(dispute.unreadByOwner).toBe(true);
    expect(dispute.unreadByMember).toBe(false);
  });
});
