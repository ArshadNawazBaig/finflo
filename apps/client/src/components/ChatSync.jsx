import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { useSetAtom } from 'jotai';
import { unreadChatCountAtom } from '@/atoms';
import api from '@/lib/axios';
import { SOCKET_URL, IS_PRODUCTION } from '@/lib/constants';

/**
 * ChatSync — Background component (renders nothing).
 *
 * Auth: withCredentials sends HTTP-only cookie through same-origin (Vite proxy in dev,
 * or direct on production). Token from localStorage passed as fallback.
 *
 * Transport: WebSocket in dev, long-polling only in production (Vercel serverless
 * does not support persistent WebSocket connections).
 */
const ChatSync = ({ userType = 'user' }) => {
  const setUnreadCount = useSetAtom(unreadChatCountAtom);

  useEffect(() => {
    // Try to get token from localStorage first (belt-and-suspenders)
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

    // Initial fetch on mount
    fetchCount();

    // ── Socket connection ────────────────────────────────────────────────────
    const socketOpts = {
      withCredentials: true,
      // Vercel serverless doesn't support WebSocket — use polling only in production
      transports: IS_PRODUCTION ? ['polling'] : ['polling', 'websocket'],
      reconnectionAttempts: 15,
      reconnectionDelay: 1500,
      timeout: 20000,
    };
    if (token) socketOpts.auth = { token };

    console.log(
      `[ChatSync] Connecting to ${SOCKET_URL || 'same-origin'} (${userType})`,
    );
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

    // ── message:new — server sends exact unreadCount for this user ───────────
    socket.on('message:new', ({ unreadCount }) => {
      if (typeof unreadCount === 'number') {
        setUnreadCount(unreadCount);
      } else {
        fetchCount();
      }
    });

    // ── conversation:read — this user opened a chat ───────────────────────────
    socket.on('conversation:read', () => {
      fetchCount();
    });

    // ── Periodic REST fallback (15s) when socket is disconnected ─────────────
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
