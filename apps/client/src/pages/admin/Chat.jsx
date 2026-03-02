import { useState, useEffect, useRef, useCallback } from 'react';
import {
  MessageSquare,
  Search,
  Send,
  Paperclip,
  Mic,
  MicOff,
  X,
  Check,
  CheckCheck,
  MoreVertical,
  Edit3,
  Trash2,
  Image as ImageIcon,
  Play,
  StopCircle,
} from 'lucide-react';
import { io } from 'socket.io-client';
import { toast } from 'sonner';
import { cn, formatCurrency } from '@/lib/utils';
import api from '@/lib/axios';
import { useSetAtom } from 'jotai';
import { unreadChatCountAtom } from '@/atoms';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { SOCKET_URL } from '@/lib/constants';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// Socket configuration is now imported from @/lib/constants

// Format message timestamps
const formatTime = (date) =>
  new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const formatDate = (date) => {
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

// Avatar initials component
const Avatar = ({ name = '', avatar, size = 40, online = false }) => {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {avatar ? (
        <img
          src={avatar}
          alt={name}
          className="rounded-full object-cover w-full h-full"
        />
      ) : (
        <div
          className="rounded-full bg-primary/20 text-primary font-black flex items-center justify-center w-full h-full text-xs"
          style={{ fontSize: size * 0.35 }}
        >
          {initials}
        </div>
      )}
      <span
        className={cn(
          'absolute bottom-0 right-0 w-2.5 h-2.5 border-2 border-background rounded-full',
          online ? 'bg-emerald-500' : 'bg-muted-foreground/30',
        )}
      />
    </div>
  );
};

// Single message bubble
const MessageBubble = ({ message, isOwn, onEdit, onDelete }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const menuRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleEdit = () => {
    onEdit(message._id, editContent);
    setEditMode(false);
    setMenuOpen(false);
  };

  if (message.isDeleted) {
    return (
      <div className={cn('flex', isOwn ? 'justify-end' : 'justify-start')}>
        <span className="text-xs italic text-muted-foreground/60 px-4 py-2 bg-muted/30 rounded-2xl">
          Message deleted
        </span>
      </div>
    );
  }

  return (
    <div className={cn('flex group', isOwn ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'relative max-w-[75%] flex flex-col',
          isOwn ? 'items-end' : 'items-start',
        )}
      >
        {/* Context menu trigger */}
        {isOwn && !editMode && (
          <div
            className="absolute -left-8 top-1 opacity-0 group-hover:opacity-100 transition-opacity"
            ref={menuRef}
          >
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="p-1 rounded-full hover:bg-muted/50 transition-colors"
            >
              <MoreVertical size={14} className="text-muted-foreground" />
            </button>
            {menuOpen && (
              <div className="absolute right-full top-0 mr-1 bg-popover border border-border/50 rounded-xl shadow-xl overflow-hidden z-50 min-w-[120px]">
                {message.mediaType === 'text' && (
                  <button
                    onClick={() => {
                      setEditMode(true);
                      setMenuOpen(false);
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold hover:bg-muted/50 w-full text-left transition-colors"
                  >
                    <Edit3 size={12} /> Edit
                  </button>
                )}
                <button
                  onClick={() => {
                    onDelete(message._id);
                    setMenuOpen(false);
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-rose-500 hover:bg-rose-500/10 w-full text-left transition-colors"
                >
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            )}
          </div>
        )}

        <div
          className={cn(
            'rounded-2xl px-4 py-2.5 shadow-sm',
            isOwn
              ? 'bg-primary text-white rounded-br-sm'
              : 'bg-card border border-border/40 rounded-bl-sm',
          )}
        >
          {/* Edit mode */}
          {editMode ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleEdit()}
                className="bg-transparent border-none outline-none text-sm font-medium min-w-[120px]"
              />
              <button
                onClick={handleEdit}
                className="text-white/80 hover:text-white"
              >
                <Check size={14} />
              </button>
              <button
                onClick={() => setEditMode(false)}
                className="text-white/60 hover:text-white"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <>
              {/* Image */}
              {message.mediaType === 'image' && message.mediaUrl && (
                <img
                  src={message.mediaUrl}
                  alt="attachment"
                  className="rounded-xl max-w-[220px] max-h-[220px] object-cover mb-1 cursor-pointer"
                  onClick={() => window.open(message.mediaUrl, '_blank')}
                />
              )}
              {/* Audio */}
              {message.mediaType === 'audio' && message.mediaUrl && (
                <audio
                  controls
                  src={message.mediaUrl}
                  className="max-w-[200px] mb-1"
                />
              )}
              {/* Text */}
              {message.content && (
                <p className="text-sm font-medium leading-relaxed">
                  {message.content}
                </p>
              )}
            </>
          )}
        </div>

        {/* Footer: time + edited + read receipt */}
        <div className="flex items-center gap-1 mt-0.5 px-1">
          {message.isEdited && (
            <span className="text-[10px] text-muted-foreground/60 italic">
              edited
            </span>
          )}
          <span className="text-[10px] text-muted-foreground/60">
            {formatTime(message.createdAt)}
          </span>
          {isOwn && <CheckCheck size={12} className="text-primary/60" />}
        </div>
      </div>
    </div>
  );
};

// ─── Main Chat Component ───────────────────────────────────────────────────────
const Chat = () => {
  const isMobile = useMediaQuery('(max-width: 1024px)');
  const setUnreadChatCount = useSetAtom(unreadChatCountAtom);
  const [contacts, setContacts] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [search, setSearch] = useState(''); // unified search for both convs + contacts
  const [loading, setLoading] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showContacts, setShowContacts] = useState(false);
  const [showThread, setShowThread] = useState(false); // mobile only
  const [isRecording, setIsRecording] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState(null); // 'all' or conversationId
  const [isDeleting, setIsDeleting] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [typingUser, setTypingUser] = useState(null); // { conversationId, userId }
  const [recordingUser, setRecordingUser] = useState(null); // { conversationId, userId }
  const typingTimeoutRef = useRef(null);

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  // Store the latest presence set so it can be reapplied after data loads
  const presenceRef = useRef(new Set());
  const streamRef = useRef(null);
  const recorderRef = useRef(null);

  const userData = JSON.parse(localStorage.getItem('user') || '{}');
  const token = userData.token || document.cookie.match(/token=([^;]+)/)?.[1];
  const currentUserId = userData._id;

  // Store activeConv in a ref to avoid stale closures in socket handlers
  const activeConvRef = useRef(activeConv);
  useEffect(() => {
    activeConvRef.current = activeConv;
  }, [activeConv]);

  // ── Init socket ──────────────────────────────────────────────────────────
  // ── Init socket ──────────────────────────────────────────────────────────
  useEffect(() => {
    let socket;
    const timer = setTimeout(() => {
      const socketOpts = {
        withCredentials: true, // sends HTTP-only cookie through Vite proxy (same origin)
        transports: ['polling', 'websocket'],
        reconnectionAttempts: 5,
        timeout: 10000,
      };
      // Also pass token in auth if available (belt-and-suspenders)
      if (token) socketOpts.auth = { token };

      socket = io(SOCKET_URL, socketOpts);

      socketRef.current = socket;

      socket.on('connect_error', (err) => {
        console.error('[Socket] Connection Error:', err.message);
      });

      // ── Presence helpers ────────────────────────────────────────────────────
      const setOnline = (userId, online) => {
        const uId = userId?.toString();
        setContacts((prev) =>
          prev.map((c) =>
            c._id?.toString() === uId ? { ...c, isOnline: online } : c,
          ),
        );
        setConversations((prev) =>
          prev.map((c) =>
            c.participant?._id?.toString() === uId
              ? { ...c, participant: { ...c.participant, isOnline: online } }
              : c,
          ),
        );
        setActiveConv((prev) =>
          prev?.participant?._id?.toString() === uId
            ? {
                ...prev,
                participant: { ...prev.participant, isOnline: online },
              }
            : prev,
        );
      };

      socket.on('user:presence_list', (list) => {
        const onlineSet = new Set(list.map((u) => u.userId?.toString()));
        presenceRef.current = onlineSet;

        setContacts((prev) =>
          prev.map((c) => ({
            ...c,
            isOnline: onlineSet.has(c._id?.toString()),
          })),
        );

        setConversations((prev) =>
          prev.map((c) => {
            if (!c.participant) return c;
            return {
              ...c,
              participant: {
                ...c.participant,
                isOnline: onlineSet.has(c.participant._id?.toString()),
              },
            };
          }),
        );

        setActiveConv((prev) => {
          if (!prev?.participant) return prev;
          return {
            ...prev,
            participant: {
              ...prev.participant,
              isOnline: onlineSet.has(prev.participant._id?.toString()),
            },
          };
        });
      });

      socket.on('user:online', ({ userId }) => {
        presenceRef.current.add(userId);
        setOnline(userId, true);
      });
      socket.on('user:offline', ({ userId }) => {
        presenceRef.current.delete(userId);
        setOnline(userId, false);
      });
      socket.on('user:typing', ({ conversationId, userId }) => {
        setTypingUser({ conversationId, userId });
      });
      socket.on('user:stop-typing', () => {
        setTypingUser(null);
      });
      socket.on('user:recording', ({ conversationId, userId }) => {
        setRecordingUser({ conversationId, userId });
      });
      socket.on('user:stop-recording', () => {
        setRecordingUser(null);
      });

      socket.on('message:new', ({ conversationId, message, unreadCount }) => {
        const currentActiveConv = activeConvRef.current;
        if (currentActiveConv?._id === conversationId) {
          setMessages((prev) => {
            const msgId = String(message._id);
            if (prev.some((m) => String(m._id) === msgId)) return prev;
            return [...prev, message];
          });
          setTimeout(scrollToBottom, 100);
          api
            .post(`/chat/conversations/${conversationId}/read`)
            .catch(() => {});
        }

        setConversations((prev) =>
          prev.map((c) =>
            c._id === conversationId
              ? {
                  ...c,
                  lastMessage: message,
                  lastActivity: message.createdAt,
                  // Use server-provided count if available, else preserve existing
                  unreadCount:
                    currentActiveConv?._id === conversationId
                      ? 0
                      : typeof unreadCount === 'number'
                        ? unreadCount
                        : (c.unreadCount || 0) + 1,
                }
              : c,
          ),
        );
      });

      socket.on('message:edited', ({ conversationId, message }) => {
        if (activeConvRef.current?._id === conversationId) {
          setMessages((prev) =>
            prev.map((m) => (m._id === message._id ? message : m)),
          );
        }
      });

      socket.on('message:deleted', ({ conversationId, messageId }) => {
        if (activeConvRef.current?._id === conversationId) {
          setMessages((prev) =>
            prev.map((m) =>
              m._id === messageId ? { ...m, isDeleted: true } : m,
            ),
          );
        }
      });
      socket.on('conversation:deleted', ({ conversationId }) => {
        setConversations((prev) =>
          prev.filter((c) => c._id !== conversationId),
        );
        if (activeConvRef.current?._id === conversationId) {
          setActiveConv(null);
          setMessages([]);
          setShowThread(false);
          toast.info('Conversation was deleted');
        }
      });
    }, 100);

    return () => {
      clearTimeout(timer);
      if (socket) {
        socket.disconnect();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // ── Load conversations and contacts on mount ─────────────────────────────
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const [convsRes, contactsRes] = await Promise.all([
          api.get('/chat/conversations'),
          api.get('/chat/contacts'),
        ]);
        // Apply any presence info and filter potential duplicates from server
        const online = presenceRef.current;
        const applyPresence = (item, id) => ({
          ...item,
          isOnline:
            online.size > 0 ? online.has(id?.toString()) : item.isOnline,
        });

        const rawConvs = convsRes.data.map((c) => ({
          ...c,
          participant: c.participant
            ? applyPresence(c.participant, c.participant._id)
            : c.participant,
        }));

        // Deduplicate
        const uniqueConvs = [];
        const seenIds = new Set();
        rawConvs.forEach((c) => {
          const id = String(c._id);
          if (!seenIds.has(id)) {
            uniqueConvs.push(c);
            seenIds.add(id);
          }
        });

        setConversations(uniqueConvs);
        setContacts(contactsRes.data.map((c) => applyPresence(c, c._id)));
      } catch {
        toast.error('Failed to load chat');
      } finally {
        setLoading(false);
      }
    };
    init();

    // Cleanup recording on unmount
    return () => {
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        recorderRef.current.stop();
      } else if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [currentUserId]);

  // ── Open/select a conversation ───────────────────────────────────────────
  const openConversation = useCallback(
    async (conv) => {
      setActiveConv(conv);
      setShowThread(true);
      setLoadingMsgs(true);
      try {
        const res = await api.get(`/chat/conversations/${conv._id}/messages`);
        setMessages(res.data.messages);

        if (conv.unreadCount > 0) {
          // Mark as read
          await api.post(`/chat/conversations/${conv._id}/read`);
          // Update conversations list with zeroed unread count
          setConversations((prev) =>
            prev.map((c) =>
              c._id === conv._id ? { ...c, unreadCount: 0 } : c,
            ),
          );
          // Update global atom SEPARATELY (never inside a setState updater - React render-phase rule)
          setUnreadChatCount((prev) =>
            Math.max(0, prev - (conv.unreadCount || 0)),
          );
        }
        setTimeout(scrollToBottom, 50);
      } catch {
        toast.error('Failed to load messages');
      } finally {
        setLoadingMsgs(false);
      }
    },
    [setUnreadChatCount],
  );

  // Periodic polling fallback for active conversation (Vercel Fix)
  useEffect(() => {
    if (!activeConv?._id) return;

    const pollInterval = setInterval(async () => {
      // Only poll if tab is focused to save resources and socket is NOT connected (fallback only)
      if (document.visibilityState !== 'visible') return;
      if (socketRef.current?.connected) return; // Socket handles it when connected

      try {
        const res = await api.get(
          `/chat/conversations/${activeConv._id}/messages?limit=1`,
        );
        const latestMsg = res.data.messages?.[0];

        if (latestMsg) {
          setMessages((prev) => {
            const exists = prev.some(
              (m) => String(m._id) === String(latestMsg._id),
            );
            if (!exists) {
              // New message found! Re-fetch full context
              api
                .get(`/chat/conversations/${activeConv._id}/messages`)
                .then((fullRes) => {
                  setMessages(fullRes.data.messages);
                  setTimeout(scrollToBottom, 100);
                  api
                    .post(`/chat/conversations/${activeConv._id}/read`)
                    .catch(() => {});
                });
            }
            return prev;
          });
        }
      } catch (err) {
        // Silent fail for background poll
      }
    }, 15000);

    // Status (Typing/Recording) polling — ONLY runs when socket is NOT connected (Vercel serverless fallback)
    const statusPollInterval = setInterval(async () => {
      if (document.visibilityState !== 'visible') return;
      if (socketRef.current?.connected) return; // Socket handles typing/recording in real-time
      try {
        const res = await api.get(
          `/chat/conversations/${activeConv._id}/status`,
        );
        const { typing, recording } = res.data;

        // Update typing state for this conversation
        if (typing?.length > 0) {
          setTypingUser({ conversationId: activeConv._id, userId: typing[0] });
        } else {
          setTypingUser((prev) =>
            prev?.conversationId === activeConv._id ? null : prev,
          );
        }

        // Update recording state for this conversation
        if (recording?.length > 0) {
          setRecordingUser({
            conversationId: activeConv._id,
            userId: recording[0],
          });
        } else {
          setRecordingUser((prev) =>
            prev?.conversationId === activeConv._id ? null : prev,
          );
        }
      } catch (err) {
        // silent fail
      }
    }, 3000);

    return () => {
      clearInterval(pollInterval);
      clearInterval(statusPollInterval);
    };
  }, [activeConv?._id]);

  // ── Start a new conversation with a contact ──────────────────────────────
  const startConversation = async (contact) => {
    try {
      const res = await api.post('/chat/conversations', {
        targetId: contact._id,
        targetModel: contact.model,
      });
      const conv = res.data;
      // Add to list if not already there
      setConversations((prev) => {
        const convId = String(conv._id);
        const exists = prev.find((c) => String(c._id) === convId);
        return exists ? prev : [conv, ...prev];
      });
      setShowContacts(false);
      openConversation(conv);
    } catch {
      toast.error('Failed to open conversation');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const deleteConversation = (convId) => {
    setDeleteConfirmation(convId);
  };

  const deleteAllChats = () => {
    setDeleteConfirmation('all');
  };

  const confirmDeletion = async () => {
    if (!deleteConfirmation) return;
    const isBulk = deleteConfirmation === 'all';
    setIsDeleting(true);
    try {
      if (isBulk) {
        await api.delete('/chat/conversations/all');
        toast.success('All chats deleted');
        setConversations([]);
        setActiveConv(null);
        setMessages([]);
        setShowThread(false);
      } else {
        await api.delete(`/chat/conversations/${deleteConfirmation}`);
        toast.success('Conversation deleted');
        setConversations((prev) =>
          prev.filter((c) => c._id !== deleteConfirmation),
        );
        if (activeConv?._id === deleteConfirmation) {
          setActiveConv(null);
          setMessages([]);
          setShowThread(false);
        }
      }
      setDeleteConfirmation(null);
    } catch (error) {
      toast.error(
        isBulk ? 'Failed to delete all chats' : 'Failed to delete conversation',
      );
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Send a message ───────────────────────────────────────────────────────
  const sendMessage = async () => {
    if (!activeConv || (!messageInput.trim() && !selectedFile)) return;
    setIsSending(true);
    try {
      const formData = new FormData();
      if (messageInput.trim()) formData.append('content', messageInput.trim());
      if (selectedFile) formData.append('media', selectedFile);

      const res = await api.post(
        `/chat/conversations/${activeConv._id}/messages`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );

      setMessages((prev) => {
        // Robust duplicate prevention
        const resId = String(res.data._id);
        if (prev.some((m) => String(m._id) === resId)) return prev;
        return [...prev, res.data];
      });
      setMessageInput('');
      setSelectedFile(null);
      setFilePreview(null);

      // Stop typing immediately on send
      if (socketRef.current && activeConv) {
        socketRef.current.emit('stop-typing', {
          conversationId: activeConv._id,
          receiverId: activeConv.participant._id,
        });
      }

      setTimeout(scrollToBottom, 50);
    } catch {
      toast.error('Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  // ── Voice recording ──────────────────────────────────────────────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const getMimeType = () => {
        const types = [
          'audio/webm;codecs=opus',
          'audio/webm',
          'audio/ogg;codecs=opus',
          'audio/mp4',
          'audio/aac',
        ];
        return types.find((t) => MediaRecorder.isTypeSupported(t)) || '';
      };

      const mimeType = getMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      recorderRef.current = recorder;
      const chunks = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunks, {
          type: recorder.mimeType || 'audio/webm',
        });
        const extension = (recorder.mimeType || 'audio/webm').includes('mp4')
          ? 'mp4'
          : 'webm';
        const file = new File([blob], `voice_${Date.now()}.${extension}`, {
          type: blob.type,
        });
        setSelectedFile(file);
        setFilePreview(URL.createObjectURL(blob));
        // Stop all tracks
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        recorderRef.current = null;
      };
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);

      if (socketRef.current?.connected && activeConv) {
        socketRef.current.emit('recording', {
          conversationId: activeConv._id,
          receiverId: activeConv.participant._id,
        });
      }
    } catch (err) {
      console.error('Recording error:', err);
      toast.error('Microphone access denied or error');
    }
  };

  const stopRecording = () => {
    setIsRecording(false);

    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    } else if (streamRef.current) {
      // If recorder didn't start yet but stream exists, kill it
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    if (socketRef.current?.connected && activeConv) {
      socketRef.current.emit('stop-recording', {
        conversationId: activeConv._id,
        receiverId: activeConv.participant._id,
      });
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedFile(file);
    if (file.type.startsWith('image/')) {
      setFilePreview(URL.createObjectURL(file));
    }
    e.target.value = '';
  };

  // ── Edit / Delete handlers ───────────────────────────────────────────────
  const handleEdit = async (msgId, content) => {
    try {
      const res = await api.put(`/chat/messages/${msgId}`, { content });
      setMessages((prev) => prev.map((m) => (m._id === msgId ? res.data : m)));
    } catch {
      toast.error('Failed to edit message');
    }
  };

  const handleDelete = async (msgId) => {
    try {
      await api.delete(`/chat/messages/${msgId}`);
      setMessages((prev) =>
        prev.map((m) => (m._id === msgId ? { ...m, isDeleted: true } : m)),
      );
    } catch {
      toast.error('Failed to delete message');
    }
  };

  // ── Date separator helper ─────────────────────────────────────────────────
  const renderMessages = () => {
    const items = [];
    let lastDate = null;
    messages.forEach((msg, i) => {
      const msgDate = formatDate(msg.createdAt);
      if (msgDate !== lastDate) {
        items.push(
          <div key={`date_${i}`} className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-border/40" />
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 px-3">
              {msgDate}
            </span>
            <div className="flex-1 h-px bg-border/40" />
          </div>,
        );
        lastDate = msgDate;
      }
      const isOwn = msg.senderId === currentUserId;
      items.push(
        <MessageBubble
          key={msg._id}
          message={msg}
          isOwn={isOwn}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />,
      );
    });
    return items;
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setMessageInput(val);

    if (socketRef.current?.connected && activeConv) {
      socketRef.current.emit('typing', {
        conversationId: activeConv._id,
        receiverId: activeConv.participant._id,
      });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        if (socketRef.current?.connected) {
          socketRef.current.emit('stop-typing', {
            conversationId: activeConv._id,
            receiverId: activeConv.participant._id,
          });
        }
      }, 2000);
    }
  };

  const filteredContacts = contacts.filter((c) =>
    c.name?.toLowerCase().includes(search.toLowerCase()),
  );

  // Filter conversations by participant name
  const filteredConversations = conversations.filter((c) =>
    c.participant?.name?.toLowerCase().includes(search.toLowerCase()),
  );

  // ─── Layout ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="mb-6">
        <PageHeader
          title="Chat"
          description="Real-time messaging with your team and members."
        />
      </div>

      <div className="flex-1 bg-card rounded-[2.5rem] border border-border/50 shadow-sm overflow-hidden flex min-h-[70vh] max-h-[70vh]">
        {/* ── Sidebar ──────────────────────────────────────────────────────── */}
        {(!isMobile || !showThread) && (
          <div className="w-full lg:w-[340px] xl:w-[380px] border-r border-border/40 flex flex-col shrink-0">
            {loading ? (
              <div className="flex-1 overflow-hidden">
                <div className="p-6 border-b border-border/40 space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="h-6 w-24 bg-muted/40 rounded-lg animate-pulse" />
                    <div className="h-8 w-8 bg-muted/40 rounded-xl animate-pulse" />
                  </div>
                  <div className="h-10 bg-muted/40 rounded-xl animate-pulse w-full" />
                </div>
                <div className="divide-y divide-border/10">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="px-6 py-4 flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full bg-muted/40 animate-pulse shrink-0" />
                      <div className="flex-1 space-y-2.5 min-w-0">
                        <div className="flex justify-between items-center">
                          <div className="h-3.5 bg-muted/40 rounded-full animate-pulse w-24" />
                          <div className="h-2 bg-muted/40 rounded-full animate-pulse w-8" />
                        </div>
                        <div className="h-2.5 bg-muted/40 rounded-full animate-pulse w-full" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* ── Conversation list (inlined to prevent remount) ── */
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="p-6 border-b border-border/40">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-black tracking-tight">
                      Messages
                    </h2>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={deleteAllChats}
                        className="p-2 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-colors"
                        title="Delete all chats"
                      >
                        <Trash2 size={16} />
                      </button>
                      <button
                        onClick={() => setShowContacts((v) => !v)}
                        className="p-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                        title="Start new conversation"
                      >
                        <Edit3 size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="relative">
                    <Search
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      size={15}
                    />
                    <input
                      placeholder="Search conversations..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 bg-muted/30 border border-border/30 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Contact picker */}
                {showContacts && (
                  <div className="border-b border-border/40 bg-muted/10">
                    <div className="p-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground px-6">
                      Start a conversation
                    </div>
                    {filteredContacts.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">
                        No contacts available
                      </p>
                    ) : (
                      filteredContacts.map((c) => (
                        <button
                          key={c._id}
                          onClick={() => startConversation(c)}
                          className="flex items-center gap-3 w-full px-6 py-3 hover:bg-muted/40 transition-colors text-left"
                        >
                          <Avatar
                            name={c.name}
                            avatar={c.avatar}
                            size={36}
                            online={c.isOnline}
                          />
                          <div>
                            <p className="text-sm font-bold capitalize">
                              {c.name}
                            </p>
                            <p className="text-[10px] uppercase font-black tracking-widest text-primary">
                              {c.role}
                            </p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}

                {/* Conversations */}
                <div className="flex-1 overflow-y-auto">
                  {conversations.length === 0 ? (
                    <div className="p-8 text-center">
                      <MessageSquare
                        size={36}
                        className="text-muted-foreground/30 mx-auto mb-3"
                      />
                      <p className="text-sm text-muted-foreground">
                        No conversations yet
                      </p>
                      <p className="text-xs text-muted-foreground/60 mt-1">
                        Click the pencil icon to start chatting
                      </p>
                    </div>
                  ) : filteredConversations.length === 0 ? (
                    <div className="p-8 text-center">
                      <p className="text-sm text-muted-foreground">
                        No results for &ldquo;{search}&rdquo;
                      </p>
                    </div>
                  ) : (
                    filteredConversations.map((conv) => (
                      <button
                        key={conv._id}
                        onClick={() => openConversation(conv)}
                        className={cn(
                          'flex items-center gap-3 w-full px-6 py-4 transition-all text-left border-b border-border/20 hover:bg-muted/30',
                          activeConv?._id === conv._id &&
                            'bg-primary/5 border-l-2 border-l-primary',
                        )}
                      >
                        <Avatar
                          name={conv.participant?.name || '?'}
                          avatar={conv.participant?.avatar}
                          size={44}
                          online={conv.participant?.isOnline}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-bold capitalize truncate">
                              {conv.participant?.name || 'Unknown'}
                            </p>
                            <span className="text-[10px] text-muted-foreground/60 shrink-0 ml-2">
                              {conv.lastMessage
                                ? formatTime(conv.lastActivity)
                                : ''}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-0.5">
                            <p className="text-xs text-muted-foreground truncate">
                              {conv.lastMessage?.isDeleted
                                ? 'Message deleted'
                                : conv.lastMessage?.mediaType === 'image'
                                  ? '📷 Image'
                                  : conv.lastMessage?.mediaType === 'audio'
                                    ? '🎙️ Voice message'
                                    : conv.lastMessage?.content ||
                                      'No messages yet'}
                            </p>
                            {conv.unreadCount > 0 && (
                              <span className="ml-2 min-w-[20px] h-5 rounded-full bg-primary text-white text-[10px] font-black flex items-center justify-center shrink-0 px-1">
                                {conv.unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Thread panel (inlined to prevent remount) ─────────────────────── */}
        {(!isMobile || showThread) && (
          <div className="flex-1 flex flex-col min-w-0">
            {/* Header */}
            {activeConv ? (
              <div className="p-4 sm:p-6 border-b border-border/40 bg-card/50 flex items-center gap-4">
                {isMobile && (
                  <button
                    onClick={() => setShowThread(false)}
                    className="p-2 rounded-xl hover:bg-muted/50 transition-colors"
                  >
                    <X size={18} />
                  </button>
                )}
                <Avatar
                  name={activeConv.participant?.name || '?'}
                  avatar={activeConv.participant?.avatar}
                  size={44}
                  online={activeConv.participant?.isOnline}
                />
                <div>
                  <p className="font-bold capitalize">
                    {activeConv.participant?.name}
                  </p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary">
                    {activeConv.participant?.role}
                    {activeConv.participant?.isOnline && (
                      <span className="text-emerald-500 ml-2">● Online</span>
                    )}
                    {typingUser?.conversationId === activeConv._id && (
                      <span className="text-primary animate-pulse ml-2 normal-case font-bold">
                        is typing...
                      </span>
                    )}
                  </p>
                </div>
                <div className="ml-auto">
                  <button
                    onClick={() => deleteConversation(activeConv._id)}
                    className="p-2.5 rounded-xl text-rose-500 hover:bg-rose-500/10 transition-all"
                    title="Delete conversation"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6 border-b border-border/40">
                <p className="text-sm text-muted-foreground">
                  Select a conversation
                </p>
              </div>
            )}

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2">
              {!activeConv ? (
                <div className="h-full flex items-center justify-center">
                  <EmptyState
                    icon={MessageSquare}
                    title="Select a chat"
                    description="Choose a conversation from the left to start messaging."
                  />
                </div>
              ) : loadingMsgs ? (
                <div className="flex-1 flex flex-col h-full overflow-hidden">
                  <div className="p-5 border-b border-border/40 flex items-center gap-4 shrink-0">
                    <div className="w-10 h-10 rounded-full bg-muted/40 animate-pulse" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-muted/40 rounded-full animate-pulse w-32" />
                      <div className="h-2.5 bg-muted/40 rounded-full animate-pulse w-20" />
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                    {[...Array(6)].map((_, i) => (
                      <div
                        key={i}
                        className={cn(
                          'flex items-end gap-2 max-w-[80%]',
                          i % 2 === 0
                            ? 'justify-start mr-auto'
                            : 'flex-row-reverse ml-auto',
                        )}
                      >
                        {i % 2 === 0 && (
                          <div className="w-6 h-6 rounded-full bg-muted/20 animate-pulse shrink-0 mb-1" />
                        )}
                        <div
                          className={cn(
                            'space-y-2',
                            i % 2 === 0 ? 'items-start' : 'items-end',
                          )}
                        >
                          <div
                            className={cn(
                              'h-12 rounded-2xl bg-muted/30 animate-pulse',
                              i % 2 === 0
                                ? 'w-64 rounded-bl-sm'
                                : 'w-56 rounded-br-sm',
                            )}
                          />
                          <div className="h-2 bg-muted/20 rounded-full animate-pulse w-12" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">
                    No messages yet. Say hello! 👋
                  </p>
                </div>
              ) : (
                renderMessages()
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* File preview bar */}
            {(selectedFile || filePreview) && (
              <div className="px-4 sm:px-6 pb-2 flex items-center gap-3">
                <div className="flex items-center gap-2 bg-muted/30 rounded-xl px-4 py-2 flex-1 max-w-sm">
                  {selectedFile?.type?.startsWith('audio/') ? (
                    <div className="flex flex-col gap-1 w-full">
                      <div className="flex items-center gap-2">
                        <Mic size={14} className="text-primary animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary/60">
                          Voice recording preview
                        </span>
                      </div>
                      <audio
                        key={filePreview}
                        src={filePreview}
                        controls
                        className="h-8 w-full filter invert dark:invert-0"
                      />
                    </div>
                  ) : filePreview ? (
                    <img
                      src={filePreview}
                      alt="preview"
                      className="h-12 w-12 object-cover rounded-lg"
                    />
                  ) : (
                    <>
                      <ImageIcon size={16} className="text-primary" />
                      <span className="text-xs font-bold truncate max-w-[120px]">
                        {selectedFile?.name}
                      </span>
                    </>
                  )}
                </div>
                <button
                  onClick={() => {
                    if (filePreview && filePreview.startsWith('blob:')) {
                      URL.revokeObjectURL(filePreview);
                    }
                    setSelectedFile(null);
                    setFilePreview(null);
                  }}
                  className="p-1.5 rounded-full hover:bg-muted/50 text-muted-foreground self-start mt-1"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Composer */}
            {activeConv && (
              <div className="p-4 sm:p-6 border-t border-border/40 bg-card/30">
                <div className="flex items-end gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-3 rounded-2xl bg-muted/30 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all shrink-0"
                  >
                    <Paperclip size={18} />
                  </button>
                  <div className="flex-1 bg-muted/30 border border-border/30 rounded-2xl px-4 py-3">
                    <textarea
                      rows={1}
                      value={messageInput}
                      onChange={handleInputChange}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                      placeholder="Type a message..."
                      className="w-full bg-transparent text-sm font-medium resize-none focus:outline-none leading-relaxed max-h-32"
                      style={{ overflowY: 'auto' }}
                    />
                  </div>
                  {messageInput.trim() || selectedFile ? (
                    <button
                      onClick={sendMessage}
                      disabled={isSending}
                      className="p-3 rounded-2xl bg-primary text-white hover:bg-primary/90 transition-all shrink-0 shadow-lg shadow-primary/20 disabled:opacity-60"
                    >
                      <Send size={18} />
                    </button>
                  ) : (
                    <button
                      onClick={() =>
                        isRecording ? stopRecording() : startRecording()
                      }
                      className={cn(
                        'p-3 rounded-2xl transition-all shrink-0',
                        isRecording
                          ? 'bg-rose-500 text-white animate-pulse shadow-lg shadow-rose-500/30'
                          : 'bg-muted/30 text-muted-foreground hover:bg-primary/10 hover:text-primary',
                      )}
                      title={isRecording ? 'Click to stop' : 'Click to record'}
                    >
                      {isRecording ? (
                        <div className="w-4 h-4 bg-white rounded-sm mx-auto" />
                      ) : (
                        <Mic size={18} />
                      )}
                    </button>
                  )}
                </div>
                {isRecording && (
                  <p className="text-[10px] text-rose-500 font-bold text-center mt-2 tracking-widest animate-pulse">
                    RECORDING... CLICK AGAIN TO STOP
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <AlertDialog
        open={!!deleteConfirmation}
        onOpenChange={(open) => !open && setDeleteConfirmation(null)}
      >
        <AlertDialogContent className="rounded-lg border-border/50 bg-card shadow-2xl p-8 max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black tracking-tighter text-center">
              {deleteConfirmation === 'all'
                ? 'Clear All Chats?'
                : 'Delete Conversation?'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center font-bold text-muted-foreground text-sm pt-2">
              {deleteConfirmation === 'all'
                ? 'Are you sure you want to delete ALL chats? This will permanently remove all message history for all your conversations.'
                : 'Are you sure you want to delete this conversation? This will permanently remove all message history for both participants.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col sm:flex-row gap-3 mt-8">
            <AlertDialogCancel className="w-full rounded-2xl border-none bg-muted h-12 font-black uppercase tracking-widest text-[10px] hover:bg-muted/80">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDeletion();
              }}
              disabled={isDeleting}
              className="w-full bg-rose-500 hover:bg-rose-600 rounded-2xl h-12 font-black uppercase tracking-widest text-[10px] text-white shadow-xl shadow-rose-500/20"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Chat;
