import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useSetAtom } from 'jotai';
import { unreadChatCountAtom } from '@/atoms';
import api from '@/lib/axios';
import { SOCKET_URL } from '@/lib/constants';

/**
 * SocketContext — provides a SINGLE shared socket instance per user session.
 * Both ChatSync and the chat pages (Chat.jsx, MemberChat.jsx) use this
 * same socket, eliminating dual-connection issues with presence and message delivery.
 */
const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children, userType = 'user' }) => {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const setUnreadCount = useSetAtom(unreadChatCountAtom);

  useEffect(() => {
    // Get token from localStorage (belt-and-suspenders alongside cookie auth)
    let token;
    try {
      if (userType === 'member') {
        const data = JSON.parse(localStorage.getItem('member') || '{}');
        token = data.token;
      } else {
        const data = JSON.parse(localStorage.getItem('user') || '{}');
        token = data.token;
      }
    } catch {
      token = null;
    }

    const fetchCount = async () => {
      try {
        const res = await api.get('/chat/conversations');
        const total = res.data.reduce(
          (acc, c) => acc + (c.unreadCount || 0),
          0,
        );
        setUnreadCount(total);
      } catch {
        /* silent */
      }
    };

    // Initial badge count
    fetchCount();

    // Build socket options: withCredentials for cookie auth, token as fallback
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
      fetchCount(); // Sync on reconnect
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      setConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.warn('[Socket] Error:', err.message);
    });

    // Update the global unread badge using the server-provided count
    socket.on('message:new', ({ unreadCount }) => {
      if (typeof unreadCount === 'number') {
        setUnreadCount(unreadCount);
      } else {
        fetchCount();
      }
    });

    // Re-sync badge when a conversation is marked as read
    socket.on('conversation:read', () => fetchCount());

    // Periodic fallback: only REST poll when socket is disconnected
    const fallback = setInterval(() => {
      if (!socket.connected) fetchCount();
    }, 15000);

    return () => {
      clearInterval(fallback);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [setUnreadCount, userType]);

  return (
    <SocketContext.Provider value={{ socketRef, connected }}>
      {children}
    </SocketContext.Provider>
  );
};
