/* eslint-disable react/prop-types -- project convention: no propTypes */
import { useState, useEffect } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAtomValue } from 'jotai';
import { userAtom } from '@/atoms';
import api from '@/lib/axios';
import { bizOnboardedKey } from '@/lib/onboarding';
import { AdminDashboardSkeleton } from '@/components/ui/PageSkeletons';

/**
 * Gate for the business (admin) dashboard. A freshly-signed-up admin who hasn't
 * finished the setup wizard is redirected to /setup. Staff, managers, and
 * already-onboarded admins pass straight through. Only admins are gated —
 * everyone else renders immediately.
 */
const RequireBusinessOnboarding = () => {
  const user = useAtomValue(userAtom);
  const isAdmin = user?.role === 'admin';
  const flagKey = bizOnboardedKey(user?._id);

  const [state, setState] = useState(() =>
    !isAdmin || localStorage.getItem(flagKey) === '1' ? 'allow' : 'checking',
  );

  useEffect(() => {
    if (state !== 'checking') return;
    let active = true;
    (async () => {
      try {
        const { data } = await api.get('/auth/onboarding');
        if (!active) return;
        if (data?.isCompleted) {
          localStorage.setItem(flagKey, '1');
          setState('allow');
        } else {
          setState('redirect');
        }
      } catch {
        // Never trap the user behind a failed check — let them into the app.
        if (active) setState('allow');
      }
    })();
    return () => {
      active = false;
    };
  }, [state, flagKey]);

  if (state === 'checking') {
    // Skeleton (not a spinner) while we verify onboarding — matches the
    // dashboard the admin is about to land on.
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <AdminDashboardSkeleton />
        </div>
      </div>
    );
  }
  if (state === 'redirect') return <Navigate to="/setup" replace />;
  return <Outlet />;
};

export default RequireBusinessOnboarding;
