// Barrel: loanController was split into focused sub-modules under ./loan/ for
// maintainability. Routes import the same named handlers from here, so the
// public export surface — and therefore the API/client contract — is unchanged.
module.exports = {
  ...require('./loan/loanReminders'),
  ...require('./loan/loanCreation'),
  ...require('./loan/loanCrud'),
  ...require('./loan/loanApprovals'),
  ...require('./loan/loanMemberViews'),
  ...require('./loan/loanBulk'),
  ...require('./loan/loanRenewals'),
};
