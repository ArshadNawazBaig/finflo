import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { useSetAtom } from 'jotai';
import { unreadChatCountAtom } from '@/atoms';
import api from '@/lib/axios';

// Get SOCKET_URL consistent with Chat pages
const SOCKET_URL =
  typeof window !== 'undefined'
    ? window.location.origin
    : 'http://localhost:5174';

const ChatSync = ({ userType = 'user' }) => {
  const setUnreadCount = useSetAtom(unreadChatCountAtom);

  useEffect(() => {
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

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['polling', 'websocket'],
    });

    socket.on('message:new', () => {
      // Re-fetch counts on new message to keep it simple and accurate
      // Alternatively, we could increment locally, but re-fetching ensures sync
      fetchInitialCount();
    });

    // Handle read events from other tabs/components
    socket.on('conversations:updated', () => {
      fetchInitialCount();
    });

    return () => {
      socket.disconnect();
    };
  }, [setUnreadCount, userType]);

  return null; // Background component
};

export default ChatSync;
