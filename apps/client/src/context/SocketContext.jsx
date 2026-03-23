import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { toast } from 'sonner';
import { useSetAtom } from 'jotai';
import {
  unreadChatCountAtom,
  notificationsAtom,
  unreadNotificationsCountAtom,
  pendingMembersCountAtom,
} from '@/atoms';
import api from '@/lib/axios';
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

    const fetchCounts = async () => {
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
    userType,
  ]);

  return (
    <SocketContext.Provider value={{ socketRef, connected }}>
      {children}
    </SocketContext.Provider>
  );
};
