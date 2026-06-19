// Barrel: authController was split into focused sub-modules under ./auth/ for
// maintainability. Routes import the same named handlers from here, so the
// public export surface — and therefore the API/client contract — is unchanged.
module.exports = {
  ...require('./auth/authRegistration'),
  ...require('./auth/authProfileAssets'),
  ...require('./auth/authPassword'),
  ...require('./auth/authAccount'),
  ...require('./auth/auth2FA'),
  ...require('./auth/authOnboarding'),
  ...require('./auth/authGoogle'),
};
