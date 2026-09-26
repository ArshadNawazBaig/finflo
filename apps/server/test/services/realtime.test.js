const { RealtimeEvent, RealtimeCounter } = require('../../src/models/RealtimeEvent');
const { publish, pollEvents } = require('../../src/services/realtimeService');
const { makeOwner, makeMember } = require('../helpers/factories');
const { mockRes, ownerReq, memberReq } = require('../helpers/mocks');

describe('persistent realtime events', () => {
  beforeAll(async () => { await RealtimeEvent.init(); await RealtimeCounter.init(); });

  it('returns only the authenticated tenant and personal events', async () => {
    const owner = await makeOwner();
    const other = await makeOwner();
    await publish(`user_${owner.id}`, 'notification:new', { title: 'mine' });
    await publish(`business_${owner.id}`, 'business:branding_updated', { businessName: 'ours' });
    await publish(`user_${other.id}`, 'notification:new', { title: 'private' });
    const res = mockRes();
    await pollEvents(ownerReq(owner, { query: { after: '0' } }), res, (e) => { throw e; });
    expect(res.body.events).toHaveLength(2);
    expect(res.body.events.map((e) => e.data.title)).not.toContain('private');
    expect(res.body.cursor).toBe(3);
  });

  it('does not expose owner business events to members', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner);
    await publish(`business_${owner.id}`, 'member:new_registration', { name: 'private' });
    await publish(`business_${owner.id}`, 'business:branding_updated', { businessName: 'ours' });
    await publish(`user_${member.id}`, 'notification:new', { title: 'mine' });
    const res = mockRes();
    await pollEvents(memberReq(member, owner, { query: { after: '0' } }), res, (e) => { throw e; });
    expect(res.body.events.map((e) => e.event)).toEqual(['business:branding_updated', 'notification:new']);
  });

  it('starts new subscribers at the current cursor and resumes without duplicates', async () => {
    const owner = await makeOwner();
    await publish(`user_${owner.id}`, 'old', {});
    const initial = mockRes();
    await pollEvents(ownerReq(owner), initial, (e) => { throw e; });
    expect(initial.body.events).toEqual([]);
    await publish(`user_${owner.id}`, 'new', {});
    const next = mockRes();
    await pollEvents(ownerReq(owner, { query: { after: String(initial.body.cursor) } }), next, (e) => { throw e; });
    expect(next.body.events.map((e) => e.event)).toEqual(['new']);
  });

  it('assigns ordered committed cursors to concurrent publishers', async () => {
    await RealtimeCounter.create({ _id: 'events', value: 0 });
    await Promise.all(Array.from({ length: 5 }, (_, i) => publish('user_test', 'event', { i })));
    const events = await RealtimeEvent.find().sort({ sequence: 1 }).lean();
    expect(events.map((e) => e.sequence)).toEqual([1, 2, 3, 4, 5]);
  });
});
