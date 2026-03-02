import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { useSetAtom } from 'jotai';
import { unreadChatCountAtom } from '@/atoms';
import api from '@/lib/axios';

// Get SOCKET_URL consistent with Chat pages
const SOCKET_URL =
  import.meta.env.VITE_BACKEND_URL ||
  (import.meta.env.MODE === 'development'
    ? 'http://localhost:5001'
    : window.location.origin);

const ChatSync = ({ userType = 'user' }) => {
  const setUnreadCount = useSetAtom(unreadChatCountAtom);

  useEffect(() => {
    // Diagnostic log for production troubleshooting
    console.log(
      `[SocketSync] Connecting to: ${SOCKET_URL} (Mode: ${import.meta.env.MODE})`,
    );
    // Only fetch if authenticated
    const fetchInitialCount = async () => {
      try {
        const res = await api.get('/chat/conversations');
        const total = res.data.reduce(
          (acc, c) => acc + (c.unreadCount || 0),
          0,
        );
        setUnreadCount(total);
      } catch (error) {
        console.error('ChatSync initial fetch failed:', error);
      }
    };

    fetchInitialCount();

    // Setup Socket connection for real-time updates
    let token;
    if (userType === 'member') {
      const memberData = JSON.parse(localStorage.getItem('member') || '{}');
      token = memberData.token;
    } else {
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      token = userData.token || document.cookie.match(/token=([^;]+)/)?.[1];
    }

    if (!token) return;

    let socket;
    const timer = setTimeout(() => {
      socket = io(SOCKET_URL, {
        auth: { token },
        transports: ['polling', 'websocket'],
        reconnectionAttempts: 5,
        timeout: 10000,
      });

      socket.on('connect_error', (err) => {
        console.error('[SocketSync] Connection Error:', err.message);
      });

      socket.on('message:new', () => {
        fetchInitialCount();
      });

      socket.on('conversations:updated', () => {
        fetchInitialCount();
      });
    }, 100);

    return () => {
      clearTimeout(timer);
      if (socket) {
        socket.disconnect();
      }
    };
  }, [setUnreadCount, userType]);

  return null; // Background component
};

export default ChatSync;
