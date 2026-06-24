/* eslint-disable react/prop-types -- project convention: no propTypes */
import { useState, useEffect } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAtomValue } from 'jotai';
import { memberAtom } from '@/atoms';
import api from '@/lib/axios';
import { memberOnboardedKey } from '@/lib/onboarding';
import { MemberDashboardSkeleton } from '@/components/ui/PageSkeletons';

/**
 * Gate for the member portal. A freshly self-registered / invited member who
 * hasn't finished the setup wizard is redirected to /member/setup. Already-
 * onboarded members pass straight through. Mirrors RequireBusinessOnboarding.
 */
const RequireMemberOnboarding = () => {
  const member = useAtomValue(memberAtom);
  const flagKey = memberOnboardedKey(member?._id);

  const [state, setState] = useState(() =>
    localStorage.getItem(flagKey) === '1' ? 'allow' : 'checking',
  );

  useEffect(() => {
    if (state !== 'checking') return;
    let active = true;
    (async () => {
      try {
        const { data } = await api.get('/member-auth/onboarding');
        if (!active) return;
        if (data?.isCompleted) {
          localStorage.setItem(flagKey, '1');
          setState('allow');
        } else {
          setState('redirect');
        }
      } catch {
        // Never trap the member behind a failed check — let them into the app.
        if (active) setState('allow');
      }
    })();
    return () => {
      active = false;
    };
  }, [state, flagKey]);

  if (state === 'checking') {
    // Skeleton (not a spinner) while we verify onboarding — matches the
    // dashboard the member is about to land on.
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <MemberDashboardSkeleton />
        </div>
      </div>
    );
  }
  if (state === 'redirect') return <Navigate to="/member/setup" replace />;
  return <Outlet />;
};

export default RequireMemberOnboarding;
