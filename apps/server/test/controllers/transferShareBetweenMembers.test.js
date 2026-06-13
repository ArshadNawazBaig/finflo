/**
 * transferShareBetweenMembers — admin/staff moves Business Share from one member
 * to another. Modelled as a share_withdrawal on the sender + a share_deposit on
 * the recipient so it flows through the existing share aggregations unchanged.
 * Covers the happy path, the insufficient-balance guard, same-member rejection,
 * and tenant isolation (a recipient in another business can't be targeted).
 */
const Member = require('../../src/models/Member');
const BusinessShare = require('../../src/models/BusinessShare');
const {
  transferShareBetweenMembers,
} = require('../../src/controllers/memberController');
const { makeOwner, makeMember } = require('../helpers/factories');
const { ownerReq, mockRes } = require('../helpers/mocks');

describe('transferShareBetweenMembers', () => {
  it('moves share balance from sender to recipient and books both ledger rows', async () => {
    const owner = await makeOwner();
    const sender = await makeMember(owner, {
      name: 'Sender',
      shareBalance: 10000,
      totalShareInvested: 10000,
    });
    const recipient = await makeMember(owner, { name: 'Recipient' });

    // No amount — a transfer always moves the member's ENTIRE share balance.
    const req = ownerReq(owner, {
      body: {
        senderId: sender._id.toString(),
        recipientIdentifier: recipient.email,
      },
    });
    const res = mockRes();
    await transferShareBetweenMembers(req, res);

    expect(res.statusCode).toBe(200);
    // Member.name has `lowercase: true`, so names round-trip lowercased.
    expect(res.body.recipientName).toBe('recipient');

    const updatedSender = await Member.findById(sender._id);
    const updatedRecipient = await Member.findById(recipient._id);
    // The full balance moved: sender drained to 0, recipient holds it all.
    expect(updatedSender.shareBalance).toBe(0);
    expect(updatedRecipient.shareBalance).toBe(10000);
    // Received shares raise totalShareInvested (parallels a received fund transfer).
    expect(updatedRecipient.totalShareInvested).toBe(10000);
    // Net share liability across the tenant is unchanged (10000 → 0 + 10000).
    expect(updatedSender.shareBalance + updatedRecipient.shareBalance).toBe(10000);

    const senderRow = await BusinessShare.findOne({ member: sender._id });
    const recipientRow = await BusinessShare.findOne({ member: recipient._id });
    expect(senderRow.type).toBe('share_withdrawal');
    expect(senderRow.metadata.direction).toBe('send');
    expect(senderRow.metadata.counterpartyName).toBe('recipient');
    expect(recipientRow.type).toBe('share_deposit');
    expect(recipientRow.metadata.direction).toBe('receive');
    expect(recipientRow.metadata.counterpartyName).toBe('sender');
  });

  it('rejects a transfer when the sender has no share balance', async () => {
    const owner = await makeOwner();
    const sender = await makeMember(owner, { shareBalance: 0 });
    const recipient = await makeMember(owner);

    const req = ownerReq(owner, {
      body: {
        senderId: sender._id.toString(),
        recipientIdentifier: recipient.email,
      },
    });
    const res = mockRes();
    await transferShareBetweenMembers(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/no share balance/i);
    // Nothing moved.
    expect((await Member.findById(recipient._id)).shareBalance).toBe(0);
    expect(await BusinessShare.countDocuments({})).toBe(0);
  });

  it('rejects transferring shares to the same member', async () => {
    const owner = await makeOwner();
    const sender = await makeMember(owner, { shareBalance: 5000 });

    const req = ownerReq(owner, {
      body: {
        senderId: sender._id.toString(),
        recipientIdentifier: sender.email,
      },
    });
    const res = mockRes();
    await transferShareBetweenMembers(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/same member/i);
    expect((await Member.findById(sender._id)).shareBalance).toBe(5000);
  });

  it('cannot target a recipient that belongs to another business (tenant isolation)', async () => {
    const ownerA = await makeOwner();
    const ownerB = await makeOwner();
    const sender = await makeMember(ownerA, { shareBalance: 8000 });
    const foreignRecipient = await makeMember(ownerB);

    const req = ownerReq(ownerA, {
      body: {
        senderId: sender._id.toString(),
        recipientIdentifier: foreignRecipient.email,
      },
    });
    const res = mockRes();
    await transferShareBetweenMembers(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/recipient not found/i);
    // Sender untouched; foreign recipient untouched.
    expect((await Member.findById(sender._id)).shareBalance).toBe(8000);
    expect((await Member.findById(foreignRecipient._id)).shareBalance).toBe(0);
  });
});
