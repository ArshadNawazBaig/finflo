import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { toast } from 'sonner';
import { useSetAtom } from 'jotai';
import {
  unreadChatCountAtom,
  notificationsAtom,
  unreadNotificationsCountAtom,
  pendingMembersCountAtom,
  unreadDisputesCountAtom,
} from '@/atoms';
import api from '@/lib/axios';
import { isTokenExpired } from '@/lib/jwt';
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
    // Get token from localStorage
    let token;
    try {
      if (userType === 'member') {
        const data = JSON.parse(localStorage.getItem('member') || '{}');
        token = data.token;
      } else {
        const data = (JSON.parse(localStorage.getItem('user') || '{}') || {});
        token = data.token;
      }
    } catch {
      token = null;
    }

    // Re-fetch the scoped unread-dispute count. Authoritative (never optimistic)
    // so the badge stays correct under branch-scoping + multiple sessions.
    const fetchDisputeCount = async () => {
      if (!token || isTokenExpired(token)) return;
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
      // Skip when the token is already expired — the request interceptor
      // will trigger a redirect, but bailing here avoids a needless fan-out
      // of doomed requests on mount.
      if (!token || isTokenExpired(token)) return;
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
