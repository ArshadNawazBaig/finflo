import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { useSetAtom } from 'jotai';
import { unreadChatCountAtom } from '@/atoms';
import api from '@/lib/axios';
import { SOCKET_URL } from '@/lib/constants';

/**
 * ChatSync — Background component (renders nothing).
 *
 * Maintains one persistent socket connection (to Railway in production,
 * through Vite proxy in dev) and keeps unreadChatCountAtom accurate in real-time.
 *
 * Auth: withCredentials sends HTTP-only cookie. Token from localStorage as fallback.
 */
const ChatSync = ({ userType = 'user' }) => {
  const setUnreadCount = useSetAtom(unreadChatCountAtom);

  useEffect(() => {
    let token;
    try {
      if (userType === 'member') {
        const memberData = JSON.parse(localStorage.getItem('member') || '{}');
        token = memberData.token;
      } else {
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        token = userData.token;
      }
    } catch {
      token = null;
    }

    // ── REST fetch helper ────────────────────────────────────────────────────
    const fetchCount = async () => {
      try {
        const res = await api.get('/chat/conversations');
        const total = res.data.reduce(
          (acc, c) => acc + (c.unreadCount || 0),
          0,
        );
        setUnreadCount(total);
        return total;
      } catch {
        return 0;
      }
    };

    fetchCount();

    // ── Socket connection ────────────────────────────────────────────────────
    const socketOpts = {
      withCredentials: true,
      transports: ['websocket', 'polling'], // WebSocket preferred, polling as fallback
      reconnectionAttempts: 15,
      reconnectionDelay: 1500,
      timeout: 20000,
    };
    if (token) socketOpts.auth = { token };

    console.log(`[ChatSync] Connecting (${userType})`);
    const socket = io(SOCKET_URL, socketOpts);

    socket.on('connect', () => {
      console.log(`[ChatSync] Connected: ${socket.id}`);
      fetchCount();
    });

    socket.on('connect_error', (err) => {
      console.warn('[ChatSync] Socket error:', err.message);
    });

    socket.on('disconnect', (reason) => {
      console.log('[ChatSync] Disconnected:', reason);
    });

    socket.on('message:new', ({ unreadCount }) => {
      if (typeof unreadCount === 'number') {
        setUnreadCount(unreadCount);
      } else {
        fetchCount();
      }
    });

    socket.on('conversation:read', () => {
      fetchCount();
    });

    // REST fallback every 15s when socket is disconnected
    const fallback = setInterval(() => {
      if (!socket.connected) fetchCount();
    }, 15000);

    return () => {
      clearInterval(fallback);
      socket.disconnect();
    };
  }, [setUnreadCount, userType]);

  return null;
};

export default ChatSync;
