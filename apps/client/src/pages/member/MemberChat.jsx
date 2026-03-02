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
  Lock,
} from 'lucide-react';
import { io } from 'socket.io-client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import api from '@/lib/axios';
import { useSetAtom } from 'jotai';
import { unreadChatCountAtom } from '@/atoms';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { Button } from '@/components/ui/button';

// Connect through the same origin so the Vite proxy forwards /socket.io to port 5001
const SOCKET_URL =
  typeof window !== 'undefined'
    ? window.location.origin
    : 'http://localhost:5174';

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
          className="rounded-full bg-primary/20 text-primary font-black flex items-center justify-center w-full h-full"
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

const MessageBubble = ({ message, isOwn, onEdit, onDelete }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const menuRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target))
        setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

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
        {isOwn && !editMode && (
          <div
            className="absolute -left-8 top-1 opacity-0 group-hover:opacity-100 transition-opacity"
            ref={menuRef}
          >
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="p-1 rounded-full hover:bg-muted/50"
            >
              <MoreVertical size={14} className="text-muted-foreground" />
            </button>
            {menuOpen && (
              <div className="absolute right-full top-0 mr-1 bg-popover border border-border/50 rounded-xl shadow-xl z-50 min-w-[120px] overflow-hidden">
                {message.mediaType === 'text' && (
                  <button
                    onClick={() => {
                      setEditMode(true);
                      setMenuOpen(false);
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold hover:bg-muted/50 w-full text-left"
                  >
                    <Edit3 size={12} /> Edit
                  </button>
                )}
                <button
                  onClick={() => {
                    onDelete(message._id);
                    setMenuOpen(false);
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-rose-500 hover:bg-rose-500/10 w-full text-left"
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
          {editMode ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onEdit(message._id, editContent);
                    setEditMode(false);
                  }
                }}
                className="bg-transparent border-none outline-none text-sm font-medium min-w-[120px]"
              />
              <button
                onClick={() => {
                  onEdit(message._id, editContent);
                  setEditMode(false);
                }}
              >
                <Check size={14} />
              </button>
              <button
                onClick={() => setEditMode(false)}
                className="text-white/60"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <>
              {message.mediaType === 'image' && message.mediaUrl && (
                <img
                  src={message.mediaUrl}
                  alt="attachment"
                  className="rounded-xl max-w-[220px] max-h-[220px] object-cover mb-1 cursor-pointer"
                  onClick={() => window.open(message.mediaUrl, '_blank')}
                />
              )}
              {message.mediaType === 'audio' && message.mediaUrl && (
                <audio
                  controls
                  src={message.mediaUrl}
                  className="max-w-[200px] mb-1"
                />
              )}
              {message.content && (
                <p className="text-sm font-medium leading-relaxed">
                  {message.content}
                </p>
              )}
            </>
          )}
        </div>
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

// ─── Premium Gate ─────────────────────────────────────────────────────────────
const PremiumGate = () => (
  <div className="flex flex-col items-center justify-center h-full text-center px-8 py-20 space-y-6">
    <div className="w-20 h-20 rounded-[2rem] bg-amber-500/10 flex items-center justify-center">
      <Lock size={36} className="text-amber-500" />
    </div>
    <div>
      <h2 className="text-2xl font-black tracking-tight mb-2">
        Chat is a Premium Feature
      </h2>
      <p className="text-muted-foreground text-sm max-w-sm">
        Real-time messaging with your managers is available on Basic and Pro
        plans. Contact your branch for an upgrade.
      </p>
    </div>
    <div className="px-6 py-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
      <p className="text-xs font-bold text-amber-600">
        Your account is on a Free plan. Upgrade to unlock real-time chat with
        managers and support staff.
      </p>
    </div>
  </div>
);

// ─── Main Member Chat ─────────────────────────────────────────────────────────
const MemberChat = () => {
  const isMobile = useMediaQuery('(max-width: 1024px)');
  const setUnreadChatCount = useSetAtom(unreadChatCountAtom);
  const [isPremium, setIsPremium] = useState(null); // null = loading
  const [contacts, setContacts] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showContacts, setShowContacts] = useState(false);
  const [showThread, setShowThread] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [typingUser, setTypingUser] = useState(null); // { conversationId, userId }
  const [currentMemberId, setCurrentMemberId] = useState(null);
  const typingTimeoutRef = useRef(null);

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const presenceRef = useRef(new Set());

  const token = localStorage.getItem('member');
  const activeConvRef = useRef(activeConv);
  useEffect(() => {
    activeConvRef.current = activeConv;
  }, [activeConv]);

  // ── Check premium and init ───────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const meRes = await api.get('/member-auth/me');
        const member = meRes.data;
        setCurrentMemberId(member._id);
        const plan = member.adminPlan || 'Free';
        const premium = plan !== 'Free';
        setIsPremium(premium);

        if (!premium) return;

        const [convsRes, contactsRes] = await Promise.all([
          api.get('/chat/conversations'),
          api.get('/chat/contacts'),
        ]);

        const online = presenceRef.current;
        const applyPresence = (item, id) => ({
          ...item,
          isOnline:
            online.size > 0 ? online.has(id?.toString()) : item.isOnline,
        });

        setConversations(
          convsRes.data.map((c) => ({
            ...c,
            participant: c.participant
              ? applyPresence(c.participant, c.participant._id)
              : c.participant,
          })),
        );
        setContacts(contactsRes.data.map((c) => applyPresence(c, c._id)));
      } catch {
        setIsPremium(false);
        toast.error('Failed to load chat');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // Sync global unread count whenever conversations change
  useEffect(() => {
    const total = conversations.reduce(
      (acc, c) => acc + (c.unreadCount || 0),
      0,
    );
    setUnreadChatCount(total);
  }, [conversations, setUnreadChatCount]);

  // ── Socket ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isPremium || !token) return;
    const socket = io(SOCKET_URL, { auth: { token } });
    socketRef.current = socket;

    // ── Presence helpers ──────────────────────────────────────────────────
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
          ? { ...prev, participant: { ...prev.participant, isOnline: online } }
          : prev,
      );
    };

    socket.on('user:presence_list', (list) => {
      const onlineSet = new Set(list.map((u) => u.userId?.toString()));
      presenceRef.current = onlineSet;
      setContacts((prev) =>
        prev.map((c) => ({ ...c, isOnline: onlineSet.has(c._id?.toString()) })),
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

    socket.on('message:new', ({ conversationId, message }) => {
      const currentActiveConv = activeConvRef.current;
      if (currentActiveConv?._id === conversationId) {
        setMessages((prev) => {
          if (prev.find((m) => m._id === message._id)) return prev;
          return [...prev, message];
        });
        setTimeout(scrollToBottom, 100);
        api.post(`/chat/conversations/${conversationId}/read`).catch(() => {});
      }
      setConversations((prev) =>
        prev.map((c) =>
          c._id === conversationId
            ? {
                ...c,
                lastMessage: message,
                lastActivity: message.createdAt,
                unreadCount:
                  currentActiveConv?._id === conversationId
                    ? 0
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

    return () => {
      socket.off('user:presence_list');
      socket.off('user:online');
      socket.off('user:offline');
      socket.off('user:typing');
      socket.off('user:stop-typing');
      socket.off('message:new');
      socket.off('message:edited');
      socket.off('message:deleted');
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPremium, token]);

  const scrollToBottom = () =>
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  const openConversation = useCallback(async (conv) => {
    setActiveConv(conv);
    setShowThread(true);
    setLoadingMsgs(true);
    try {
      const res = await api.get(`/chat/conversations/${conv._id}/messages`);
      setMessages(res.data.messages);
      await api.post(`/chat/conversations/${conv._id}/read`);
      setConversations((prev) =>
        prev.map((c) => (c._id === conv._id ? { ...c, unreadCount: 0 } : c)),
      );
      setTimeout(scrollToBottom, 100);
    } catch {
      toast.error('Failed to load messages');
    } finally {
      setLoadingMsgs(false);
    }
  }, []);

  const startConversation = async (contact) => {
    try {
      const res = await api.post('/chat/conversations', {
        targetId: contact._id,
        targetModel: contact.model,
      });
      const conv = res.data;
      setConversations((prev) => {
        const exists = prev.find((c) => c._id === conv._id);
        return exists ? prev : [conv, ...prev];
      });
      setShowContacts(false);
      openConversation(conv);
    } catch {
      toast.error('Failed to open conversation');
    }
  };

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
      setMessages((prev) => [...prev, res.data]);
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

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const file = new File([blob], `voice_${Date.now()}.webm`, {
          type: 'audio/webm',
        });
        setSelectedFile(file);
        setFilePreview('audio');
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch {
      toast.error('Microphone access denied');
    }
  };

  const stopRecording = () => {
    mediaRecorder?.stop();
    setIsRecording(false);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedFile(file);
    if (file.type.startsWith('image/'))
      setFilePreview(URL.createObjectURL(file));
    e.target.value = '';
  };

  const handleEdit = async (msgId, content) => {
    try {
      const res = await api.put(`/chat/messages/${msgId}`, { content });
      setMessages((prev) => prev.map((m) => (m._id === msgId ? res.data : m)));
    } catch {
      toast.error('Failed to edit');
    }
  };

  const handleDelete = async (msgId) => {
    try {
      await api.delete(`/chat/messages/${msgId}`);
      setMessages((prev) =>
        prev.map((m) => (m._id === msgId ? { ...m, isDeleted: true } : m)),
      );
    } catch {
      toast.error('Failed to delete');
    }
  };

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
      const isOwn = msg.senderId === currentMemberId;
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

    if (socketRef.current && activeConv) {
      socketRef.current.emit('typing', {
        conversationId: activeConv._id,
        receiverId: activeConv.participant._id,
      });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socketRef.current.emit('stop-typing', {
          conversationId: activeConv._id,
          receiverId: activeConv.participant._id,
        });
      }, 2000);
    }
  };

  const filteredContacts = contacts.filter((c) =>
    c.name?.toLowerCase().includes(search.toLowerCase()),
  );
  const filteredConversations = conversations.filter((c) =>
    c.participant?.name?.toLowerCase().includes(search.toLowerCase()),
  );

  const totalUnread = conversations.reduce(
    (acc, c) => acc + (c.unreadCount || 0),
    0,
  );

  if (loading) {
    return (
      <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
        <PageHeader
          title="Chat"
          description="Real-time messaging with your branch managers."
        />
        <div className="bg-card rounded-[2.5rem] border border-border/50 shadow-sm p-8 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-muted/40 animate-pulse shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-muted/40 rounded-full animate-pulse w-3/4" />
                <div className="h-2 bg-muted/40 rounded-full animate-pulse w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="mb-6">
        <PageHeader
          title="Chat"
          description="Message your branch managers and support staff in real time."
        />
      </div>

      {!isPremium ? (
        <div className="bg-card rounded-[2.5rem] border border-border/50 shadow-sm overflow-hidden">
          <PremiumGate />
        </div>
      ) : (
        <div className="bg-card rounded-[2.5rem] border border-border/50 shadow-sm overflow-hidden flex min-h-[70vh] max-h-[70vh]">
          {/* Sidebar */}
          {(!isMobile || !showThread) && (
            <div className="w-full lg:w-[320px] border-r border-border/40 flex flex-col shrink-0">
              <div className="p-6 border-b border-border/40">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-black tracking-tight">
                    Messages
                  </h2>
                  <button
                    onClick={() => setShowContacts((v) => !v)}
                    className="p-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                  >
                    <Edit3 size={16} />
                  </button>
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
                    className="w-full pl-9 pr-4 py-2.5 bg-muted/30 border border-border/30 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  />
                </div>
              </div>

              {showContacts && (
                <div className="border-b border-border/40 bg-muted/10">
                  <p className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Available Staff
                  </p>
                  {filteredContacts.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      No contacts in your branch
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
                  </div>
                ) : filteredConversations.length === 0 && search ? (
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
                                  ? '🎙️ Voice'
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

          {/* Thread */}
          {(!isMobile || showThread) && (
            <div className="flex-1 flex flex-col min-w-0">
              {/* Header */}
              {activeConv ? (
                <div className="p-4 sm:p-6 border-b border-border/40 bg-card/50 flex items-center gap-4">
                  {isMobile && (
                    <button
                      onClick={() => setShowThread(false)}
                      className="p-2 rounded-xl hover:bg-muted/50"
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
                </div>
              ) : (
                <div className="p-6 border-b border-border/40" />
              )}

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2">
                {!activeConv ? (
                  <div className="h-full flex items-center justify-center">
                    <EmptyState
                      icon={MessageSquare}
                      title="Select a chat"
                      description="Choose a staff member to start messaging."
                    />
                  </div>
                ) : loadingMsgs ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className={cn(
                          'flex',
                          i % 2 === 0 ? 'justify-start' : 'justify-end',
                        )}
                      >
                        <div
                          className={cn(
                            'h-10 rounded-2xl bg-muted/40 animate-pulse',
                            i % 2 === 0 ? 'w-48' : 'w-40',
                          )}
                        />
                      </div>
                    ))}
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

              {/* File preview */}
              {(selectedFile || filePreview) && (
                <div className="px-4 sm:px-6 pb-2 flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-muted/30 rounded-xl px-4 py-2">
                    {filePreview === 'audio' ? (
                      <>
                        <Mic size={16} className="text-primary" />
                        <span className="text-xs font-bold">
                          Voice clip ready
                        </span>
                      </>
                    ) : filePreview ? (
                      <img
                        src={filePreview}
                        alt="preview"
                        className="h-12 w-12 object-cover rounded-lg"
                      />
                    ) : (
                      <span className="text-xs font-bold truncate max-w-[120px]">
                        {selectedFile?.name}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setSelectedFile(null);
                      setFilePreview(null);
                    }}
                    className="p-1.5 rounded-full hover:bg-muted/50 text-muted-foreground"
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
                            !isSending && sendMessage();
                          }
                        }}
                        placeholder="Type a message..."
                        className="w-full bg-transparent text-sm font-medium resize-none focus:outline-none leading-relaxed max-h-32"
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
                        onMouseDown={startRecording}
                        onMouseUp={stopRecording}
                        onTouchStart={startRecording}
                        onTouchEnd={stopRecording}
                        className={cn(
                          'p-3 rounded-2xl transition-all shrink-0',
                          isRecording
                            ? 'bg-rose-500 text-white animate-pulse shadow-lg shadow-rose-500/30'
                            : 'bg-muted/30 text-muted-foreground hover:bg-primary/10 hover:text-primary',
                        )}
                      >
                        {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
                      </button>
                    )}
                  </div>
                  {isRecording && (
                    <p className="text-[10px] text-rose-500 font-bold text-center mt-2 tracking-widest animate-pulse">
                      RECORDING... RELEASE TO SEND
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MemberChat;
