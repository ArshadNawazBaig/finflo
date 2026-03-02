import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { useSetAtom } from 'jotai';
import { unreadChatCountAtom } from '@/atoms';
import api from '@/lib/axios';
import { SOCKET_URL } from '@/lib/constants';

/**
 * ChatSync — Background component (renders nothing).
 *
 * Auth strategy:
 *  - First tries to get token from localStorage (for non-cookie auth flows)
 *  - Falls back to withCredentials: true so the HTTP-only cookie is used
 *  - Server socket middleware already reads cookies, so this works for both member and admin
 */
const ChatSync = ({ userType = 'user' }) => {
  const setUnreadCount = useSetAtom(unreadChatCountAtom);

  useEffect(() => {
    // Try to get token from localStorage first (some flows still use it)
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
    // Use withCredentials: true so HTTP-only cookie is sent automatically.
    // Also pass token in auth: {} if available (for non-cookie flows).
    const socketOpts = {
      withCredentials: true, // sends HTTP-only cookies for members using cookie auth
      transports: ['polling', 'websocket'],
      reconnectionAttempts: 15,
      reconnectionDelay: 1000,
      timeout: 10000,
    };

    // Add token to auth if available from localStorage
    if (token) {
      socketOpts.auth = { token };
    }

    console.log(
      `[ChatSync] Connecting to ${SOCKET_URL} (${userType}, cookie+token auth)`,
    );
    const socket = io(SOCKET_URL, socketOpts);

    socket.on('connect', () => {
      console.log(`[ChatSync] Connected: ${socket.id}`);
      // Sync on connect/reconnect in case messages arrived while disconnected
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
      console.log('[ChatSync] message:new received, unreadCount:', unreadCount);
      if (typeof unreadCount === 'number') {
        setUnreadCount(unreadCount);
      } else {
        // Fallback: REST sync
        fetchCount();
      }
    });

    // ── conversation:read — user opened a chat, server confirmed read ─────────
    socket.on('conversation:read', () => {
      fetchCount();
    });

    // ── Periodic REST fallback (every 15s) for robustness ───────────────────
    const fallback = setInterval(() => {
      if (!socket.connected) {
        fetchCount();
      }
    }, 15000);

    return () => {
      clearInterval(fallback);
      socket.disconnect();
    };
  }, [setUnreadCount, userType]);

  return null;
};

export default ChatSync;
