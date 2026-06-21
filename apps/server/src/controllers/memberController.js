// Barrel: memberController was split into focused sub-modules under ./member/
// for maintainability. Routes import the same named handlers from here, so the
// public export surface — and therefore the API/client contract — is unchanged.
module.exports = {
  ...require('./member/membersCrud'),
  ...require('./member/memberDocuments'),
  ...require('./member/memberInvestments'),
  ...require('./member/memberTransfers'),
  ...require('./member/memberShares'),
  ...require('./member/memberDistributions'),
  ...require('./member/memberInvites'),
};
