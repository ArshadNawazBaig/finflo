import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { toast } from 'sonner';
import { useSetAtom, getDefaultStore } from 'jotai';
import {
  userAtom,
  memberAtom,
  unreadChatCountAtom,
  notificationsAtom,
  unreadNotificationsCountAtom,
  pendingMembersCountAtom,
  unreadDisputesCountAtom,
} from '@/atoms';
import api from '@/lib/axios';
import { refreshAccessToken } from '@/lib/sessionRefresh';
import { isSessionRevokedForMe } from '@/lib/sessionRevoke';
import { decodeJwt } from '@/lib/jwt';
import { SOCKET_URL } from '@/lib/constants';

/**
 * SocketContext — provides a SINGLE shared socket instance per user session.
 */
const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children, userType = 'user' }) => {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const setUnreadMessages = useSetAtom(unreadChatCountAtom);
  const setUnreadNotifs = useSetAtom(unreadNotificationsCountAtom);
  const setNotifications = useSetAtom(notificationsAtom);
  const setPendingMembersCount = useSetAtom(pendingMembersCountAtom);
  const setUnreadDisputes = useSetAtom(unreadDisputesCountAtom);

  useEffect(() => {
    // Read the principal + access token from the in-memory atom store — NOT
    // localStorage, since on web the token isn't persisted there. When no
    // in-memory token is available yet (e.g. right after a reload, before
    // useSessionBootstrap re-mints it), the socket handshake and the badge
    // fetches still authenticate via the httpOnly `token` cookie (the server
    // socket auth and `protect` both accept it).
    const store = getDefaultStore();
    const principalAtom = userType === 'member' ? memberAtom : userAtom;
    const token = store.get(principalAtom)?.token || null;
    const hasPrincipal = !!store.get(principalAtom);

    // Re-fetch the scoped unread-dispute count. Authoritative (never optimistic)
    // so the badge stays correct under branch-scoping + multiple sessions.
    const fetchDisputeCount = async () => {
      if (!hasPrincipal) return;
      try {
        const endpoint =
          userType === 'member'
            ? '/disputes/portal/unread-count'
            : '/disputes/unread-count';
        const res = await api.get(endpoint);
        setUnreadDisputes(res.data.count || 0);
      } catch {
        // Disputes may be unavailable for this role — leave the badge as-is.
      }
    };

    const fetchCounts = async () => {
      // Only fetch when a principal is cached. Auth itself rides the in-memory
      // token (native) or the httpOnly cookie (web); a stale/expired token is
      // handled by the axios refresh interceptor, so no token-expiry gate here.
      if (!hasPrincipal) return;
      try {
        // Fetch Chat Conversations for badge
        const chatRes = await api.get('/chat/conversations');
        const totalChatUnread = chatRes.data.reduce(
          (acc, c) => acc + (c.unreadCount || 0),
          0,
        );
        setUnreadMessages(totalChatUnread);

        // Initial fetch of notifications to populate the global state
        const endpoint =
          userType === 'member' ? '/member-notifications' : '/notifications';
        const notifRes = await api.get(endpoint);
        setNotifications(notifRes.data.notifications || []);
        setUnreadNotifs(notifRes.data.unreadCount || 0);
      } catch (err) {
        console.warn('[SocketContext] Initial fetch error:', err.message);
      }

      // Isolated so a dispute-endpoint failure can't clobber the counts above.
      fetchDisputeCount();
    };

    // Initial badge/state sync
    fetchCounts();

    const opts = {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 15,
      reconnectionDelay: 1500,
      timeout: 20000,
    };
    if (token) opts.auth = { token };

    console.log(`[Socket] Connecting (${userType})`);
    const socket = io(SOCKET_URL, opts);
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log(`[Socket] Connected: ${socket.id}`);
      setConnected(true);
      fetchCounts(); // Sync everything on reconnect
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      setConnected(false);
    });

    // Real-time session revocation. The payload names which sessions changed so
    // ONLY the affected device re-validates: the kept/current device (and its
    // other tabs) ignore the event — re-validating it is needless and, across
    // tabs, would replay a rotated refresh token and trip reuse-detection,
    // logging out the session we meant to keep. The genuinely-revoked device
    // refreshes, fails, and logs out instantly (closing the ≤TTL lingering gap).
    socket.on('session:revoked', (detail) => {
      const prev = store.get(principalAtom);
      const mySid = decodeJwt(prev?.token)?.sid || null;
      if (!isSessionRevokedForMe(mySid, detail || {})) return; // not me → ignore

      refreshAccessToken()
        .then((newToken) => {
          const current = store.get(principalAtom);
          if (current) store.set(principalAtom, { ...current, token: newToken });
        })
        .catch(() => {
          // Our session is gone → drop the principal; the route guard redirects.
          store.set(principalAtom, null);
        });
    });

    // Real-time notification updates
    socket.on('notification:new', (notification) => {
      console.log('[Socket] New Notification:', notification.title);
      // Prepend the new notification to the list
      setNotifications((prev) => [notification, ...prev]);
      // Increment the global unread count
      setUnreadNotifs((prev) => prev + 1);
    });

    // Real-time dispute badge. The member client only cares about member-side
    // changes; staff/admin clients about owner-side changes (members share the
    // business room but ignore dispute:owner). Either way we re-fetch the
    // authoritative scoped count rather than guessing the delta.
    if (userType === 'member') {
      socket.on('dispute:member', () => fetchDisputeCount());
    } else {
      socket.on('dispute:owner', () => fetchDisputeCount());
    }

    // Real-time pending member badge — admin only
    if (userType === 'user') {
      socket.on('member:new_registration', ({ name }) => {
        console.log('[Socket] New member registration pending:', name);
        setPendingMembersCount((prev) => prev + 1);
        toast.info(`New Registration: ${name}`, {
          description: 'A new member is waiting for approval.',
          action: {
            label: 'Review',
            onClick: () => {
              window.location.href = '/members?type=pending';
            },
          },
        });
      });
    }

    // Update the global unread badge by refetching all conversation unread states
    socket.on('message:new', () => {
      fetchCounts();
    });

    socket.on('conversation:read', () => fetchCounts());

    // Real-time branding updates
    socket.on('business:branding_updated', async (data) => {
      console.log('[Socket] Business Branding Updated:', data.businessName);
      // Push the primary color into the theme immediately so the UI re-skins
      // without waiting on the profile re-fetch below. Empty/invalid values
      // are ignored (the validation in updateDetails on the server only
      // saves valid HSL triplets, but be defensive in case of bad payloads).
      if (typeof data?.primaryColor === 'string' && data.primaryColor.trim()) {
        try {
          localStorage.setItem('primary-color', data.primaryColor.trim());
          const root = window.document.documentElement;
          root.style.setProperty('--primary', data.primaryColor.trim());
          root.style.setProperty('--ring', data.primaryColor.trim());
        } catch (themeErr) {
          console.warn('[Socket] Failed to apply primary color:', themeErr.message);
        }
      }

      try {
        const endpoint = userType === 'member' ? '/member-auth/me' : '/auth/me';
        const { data: profile } = await api.get(endpoint);

        const storageKey = userType === 'member' ? 'member' : 'user';
        const existingData = JSON.parse(
          localStorage.getItem(storageKey) || '{}',
        );
        const updatedData = { ...existingData, ...profile };
        localStorage.setItem(storageKey, JSON.stringify(updatedData));

        // Dispatch event for other components to update
        const eventName =
          userType === 'member' ? 'memberUpdated' : 'userUpdated';
        window.dispatchEvent(new Event(eventName));

        // Optional: show a subtle toast
        if (data.businessName && userType === 'member') {
          toast.info('Branding Updated', {
            description: `Your portal has been updated with the latest business branding.`,
          });
        }
      } catch (err) {
        console.error(
          '[Socket] Failed to refresh profile after branding update:',
          err.message,
        );
      }
    });

    // Periodic fallback: only REST poll when socket is disconnected
    const fallback = setInterval(() => {
      if (!socket.connected) fetchCounts();
    }, 30000);

    return () => {
      clearInterval(fallback);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [
    setUnreadMessages,
    setUnreadNotifs,
    setNotifications,
    setPendingMembersCount,
    setUnreadDisputes,
    userType,
  ]);

  return (
    <SocketContext.Provider value={{ socketRef, connected }}>
      {children}
    </SocketContext.Provider>
  );
};
