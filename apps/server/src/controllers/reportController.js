// Barrel: reportController was split into focused sub-modules under ./report/
// for maintainability. Routes import the same named handlers from here, so the
// public export surface — and therefore the API/client contract — is unchanged.
module.exports = {
  ...require('./report/reportStats'),
  ...require('./report/regulatoryReports'),
  ...require('./report/financialStatements'),
  ...require('./report/branchReports'),
  ...require('./report/regulatorySnapshots'),
  ...require('./report/balanceSheet'),
};
