import { useEffect } from 'react';
import { IS_NATIVE } from '@/lib/constants';
import { registerPush, unregisterPush } from '@/lib/push';

/**
 * Register for native push notifications once the relevant identity is
 * authenticated, and unregister on logout.
 *
 * Mounted inside the authenticated layouts (DashboardLayout / MemberLayout),
 * which only render behind RequireAuth / RequireMemberAuth — so `isAuthed`
 * being true is the "just signed in" signal.
 *
 * Fully native-gated: on web (IS_NATIVE === false) the effect bails immediately,
 * keeping it inert in the web build and in jsdom tests.
 *
 * @param {boolean} isAuthed   whether the member/user session is active
 * @param {boolean} isStaff    true for the business app (staff endpoints)
 */
export default function usePushRegistration(isAuthed, isStaff = false) {
  useEffect(() => {
    if (!IS_NATIVE) return;
    if (!isAuthed) return;

    registerPush({ isStaff });

    return () => {
      // On logout / unmount, drop the device token best-effort.
      unregisterPush({ isStaff });
    };
  }, [isAuthed, isStaff]);
}
