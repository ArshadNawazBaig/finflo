/**
 * externalTransferController — when the bank payout throws, the member must be
 * re-credited, the transfer marked Failed, and no phantom withdrawal ledger row
 * left behind.
 */
const Member = require('../../src/models/Member');
const Investment = require('../../src/models/Investment');
const ExternalTransfer = require('../../src/models/ExternalTransfer');
const externalTransferController = require('../../src/controllers/externalTransferController');
const { makeOwner, makeMember } = require('../helpers/factories');
const { mockRes } = require('../helpers/mocks');

describe('initiateExternalTransfer — reversal on payout failure', () => {
  it('re-credits the member and marks the transfer Failed when the payout throws', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner, { currentBalance: 100000 });

    const transferLimits = require('../../src/services/transferLimits');
    const origAssert = transferLimits.assertWithinLimits;
    transferLimits.assertWithinLimits = async () => {};
    const payoutService = require('../../src/services/payoutService');
    const origSend = payoutService.sendTransfer;
    payoutService.sendTransfer = async () => {
      throw new Error('bank rejected');
    };

    try {
      const req = {
        member: { _id: member._id, user: owner._id, branchId: undefined },
        body: { bankType: 'bank', bankName: 'HBL', accountIdentifier: 'PK00HABB000', amount: 25000 },
      };
      const res = mockRes();
      await externalTransferController.initiateExternalTransfer(req, res);

      expect(res.statusCode).toBe(502);
      const fresh = await Member.findById(member._id);
      expect(fresh.currentBalance).toBe(100000); // fully reversed
      const xfer = await ExternalTransfer.findOne({ member: member._id });
      expect(xfer.status).toBe('Failed');
      expect(await Investment.countDocuments({ member: member._id, type: 'withdrawal' })).toBe(0);
    } finally {
      transferLimits.assertWithinLimits = origAssert;
      payoutService.sendTransfer = origSend;
    }
  });
});
