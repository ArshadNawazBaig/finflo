import { Navigate, Outlet } from 'react-router-dom';

/**
 * Route guard that restricts access to paid plan users (Basic or Pro).
 * Free-plan users are redirected to /billing with a state message.
 */
const RequirePaidPlan = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const plan = user.plan || 'Free';

  if (plan === 'Free') {
    if (user.role === 'admin') {
      return (
        <Navigate
          to="/billing"
          replace
          state={{
            upgradePrompt:
              'Support is available on Basic and Pro plans. Upgrade to access priority support.',
          }}
        />
      );
    } else {
      return (
        <Navigate
          to="/dashboard"
          replace
          state={{
            error:
              'This feature requires a paid plan. Please contact your administrator to upgrade.',
          }}
        />
      );
    }
  }

  return <Outlet />;
};

export default RequirePaidPlan;
