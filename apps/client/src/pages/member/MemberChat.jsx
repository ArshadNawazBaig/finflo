import { useState, useEffect, useRef, useCallback } from 'react';
import {
  MessageSquare,
  Search,
  Send,
  Paperclip,
  Mic,
  X,
  Check,
  CheckCheck,
  MoreVertical,
  Edit3,
  Trash2,
  Lock,
  Smile,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import api from '@/lib/axios';
import { useSetAtom, useAtomValue } from 'jotai';
import { unreadChatCountAtom, memberAtom } from '@/atoms';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useSocket } from '@/context/SocketContext';
import { ChatSkeleton } from '@/components/ui/PageSkeletons';
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

const COMMON_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

const MessageBubble = ({
  message,
  isOwn,
  onEdit,
  onDelete,
  onReact,
  currentUserId,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [reactionOpen, setReactionOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const menuRef = useRef(null);
  const reactionRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target))
        setMenuOpen(false);
      if (reactionRef.current && !reactionRef.current.contains(e.target)) {
        setReactionOpen(false);
      }
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
        ref={reactionRef}
      >
        {/* Context menu trigger */}
        {isOwn && !editMode && (
          <div
            className="absolute -left-10 sm:-left-8 top-0 sm:top-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity"
            ref={menuRef}
          >
            <Button
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setMenuOpen((v) => !v);
              }}
              className="p-2 sm:p-1 rounded-full hover:bg-muted/50 transition-colors"
            >
              <MoreVertical size={16} className="text-muted-foreground" />
            </Button>
            {menuOpen && (
              <div className="absolute right-0 sm:right-full top-full sm:top-0 mt-1 sm:mt-0 sm:mr-1 bg-popover border border-border/50 rounded-xl shadow-xl z-50 min-w-[120px] overflow-hidden">
                {message.mediaType === 'text' && (
                  <Button
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditMode(true);
                      setMenuOpen(false);
                    }}
                    className="flex items-center gap-2 px-4 py-3 sm:py-2.5 text-sm sm:text-xs font-semibold hover:bg-muted/50 w-full text-left"
                  >
                    <Edit3 size={14} /> Edit
                  </Button>
                )}
                <Button
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(message._id);
                    setMenuOpen(false);
                  }}
                  className="flex items-center gap-2 px-4 py-3 sm:py-2.5 text-sm sm:text-xs font-semibold text-rose-500 hover:bg-rose-500/10 w-full text-left"
                >
                  <Trash2 size={14} /> Delete
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Reaction trigger */}
        {!message.isDeleted && !editMode && (
          <div
            className={cn(
              'absolute top-0 sm:top-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity z-10',
              isOwn ? '-left-20 sm:-left-16' : '-right-10 sm:-right-8',
            )}
          >
            <Button
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setReactionOpen((v) => !v);
              }}
              className="p-2 sm:p-1 rounded-full hover:bg-muted/50 transition-colors"
            >
              <Smile size={16} className="text-muted-foreground" />
            </Button>
          </div>
        )}

        {/* Reaction Popover anchored to the bubble */}
        {reactionOpen && (
          <div
            className={cn(
              'absolute bg-popover border border-border/50 rounded-full shadow-xl p-1.5 sm:p-1 flex items-center gap-1 z-[100] animate-in zoom-in-95 duration-200',
              // Mobile: render below bubble, aligned to the bubble edge. Desktop: to the side of bubble.
              'top-full mt-1 sm:top-0 sm:mt-0',
              isOwn 
                ? 'right-0 sm:right-full sm:mr-3' 
                : 'left-0 sm:left-full sm:ml-3'
            )}
          >
            {COMMON_EMOJIS.map((emoji) => {
              const hasReacted = message.reactions
                ?.find((r) => r.emoji === emoji)
                ?.users.some(
                  (u) => String(u.userId) === String(currentUserId),
                );
              return (
                <Button
                  variant="ghost"
                  key={emoji}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    onReact(message._id, emoji);
                    setReactionOpen(false);
                  }}
                  className={cn(
                    'hover:scale-125 transition-transform px-2 py-1.5 sm:px-1.5 sm:py-1 rounded-full text-lg sm:text-base',
                    hasReacted && 'bg-primary/20 scale-110',
                  )}
                >
                  {emoji}
                </Button>
              );
            })}
          </div>
        )}

        <div
          className={cn(
            'rounded-2xl px-4 py-2.5 shadow-sm relative',
            isOwn
              ? 'bg-primary text-white rounded-br-sm'
              : 'bg-card border border-border/40 rounded-bl-sm',
          )}
        >
          {editMode ? (
            <div className="flex items-center gap-2">
              <Input
                autoFocus
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onEdit(message._id, editContent);
                    setEditMode(false);
                  }
                }}
                className="h-auto bg-transparent border-none text-sm font-medium min-w-[120px]"
              />
              <Button
                variant="ghost"
                onClick={() => {
                  onEdit(message._id, editContent);
                  setEditMode(false);
                }}
              >
                <Check size={14} />
              </Button>
              <Button
                variant="ghost"
                onClick={() => setEditMode(false)}
                className="text-white/60"
              >
                <X size={14} />
              </Button>
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

        {/* Reactions Display */}
        {message.reactions?.length > 0 && (
          <div
            className={cn(
              'flex flex-wrap gap-1 mt-1 mb-1',
              isOwn ? 'justify-end' : 'justify-start',
            )}
          >
            {message.reactions.map((r) => {
              const hasReacted = r.users.some(
                (u) => String(u.userId) === String(currentUserId),
              );
              return (
                <Button
                  variant="ghost"
                  key={r.emoji}
                  onClick={() => onReact(message._id, r.emoji)}
                  className={cn(
                    'flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-bold transition-all',
                    hasReacted
                      ? 'bg-primary/10 border-primary/30 text-primary'
                      : 'bg-muted/30 border-border/40 text-muted-foreground hover:bg-muted/50',
                  )}
                >
                  <span className="text-[13px] leading-none">{r.emoji}</span>
                </Button>
              );
            })}
          </div>
        )}

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
  const [deleteConfirmation, setDeleteConfirmation] = useState(null); // 'all' or conversationId
  const [isDeleting, setIsDeleting] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [typingUser, setTypingUser] = useState(null); // { conversationId, userId }
  const [recordingUser, setRecordingUser] = useState(null); // { conversationId, userId }
  const [currentMemberId, setCurrentMemberId] = useState(null);
  const typingTimeoutRef = useRef(null);

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const presenceRef = useRef(new Set());

  const memberData = useAtomValue(memberAtom);
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const token = memberData?.token;
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
        // Apply any presence info and filter duplicates
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
        setIsPremium(false);
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
  }, []);

  // ── Use shared socket from SocketContext (one socket per session) ──────────
  const { socketRef: sharedRef, connected } = useSocket() || {};

  useEffect(() => {
    const socket = sharedRef?.current;
    if (!socket) return;

    // Sync local ref so typing/recording emitters can access it
    socketRef.current = socket;

    // ── Presence helper ──────────────────────────────────────────────────────
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

    // ── Presence events ──────────────────────────────────────────────────────
    const onPresenceList = (list) => {
      const onlineSet = new Set(list.map((u) => u.userId?.toString()));
      presenceRef.current = onlineSet;
      setContacts((prev) =>
        prev.map((c) => ({ ...c, isOnline: onlineSet.has(c._id?.toString()) })),
      );
      setConversations((prev) =>
        prev.map((c) =>
          c.participant
            ? {
                ...c,
                participant: {
                  ...c.participant,
                  isOnline: onlineSet.has(c.participant._id?.toString()),
                },
              }
            : c,
        ),
      );
      setActiveConv((prev) =>
        prev?.participant
          ? {
              ...prev,
              participant: {
                ...prev.participant,
                isOnline: onlineSet.has(prev.participant._id?.toString()),
              },
            }
          : prev,
      );
    };

    const onOnline = ({ userId }) => {
      presenceRef.current.add(userId);
      setOnline(userId, true);
    };
    const onOffline = ({ userId }) => {
      presenceRef.current.delete(userId);
      setOnline(userId, false);
    };
    const onTyping = ({ conversationId, userId }) =>
      setTypingUser({ conversationId, userId });
    const onStopTyping = () => setTypingUser(null);
    const onRecording = ({ conversationId, userId }) =>
      setRecordingUser({ conversationId, userId });
    const onStopRecording = () => setRecordingUser(null);

    // ── Message events ───────────────────────────────────────────────────────
    const onMessageNew = ({ conversationId, message, unreadCount }) => {
      const cur = activeConvRef.current;
      if (cur?._id === conversationId) {
        setMessages((prev) => {
          const id = String(message._id);
          return prev.some((m) => String(m._id) === id)
            ? prev
            : [...prev, message];
        });
        setTimeout(scrollToBottom, 100);
        api.post(`/chat/conversations/${conversationId}/read`).catch(() => {});
        // If message arrived in active chat, it's immediately read.
        // Decrement global unread count if it was incremented by SocketContext.
        setUnreadChatCount((prev) => Math.max(0, prev - 1));
      }
      setConversations((prev) =>
        prev.map((c) =>
          c._id === conversationId
            ? {
                ...c,
                lastMessage: message,
                lastActivity: message.createdAt,
                unreadCount:
                  cur?._id === conversationId
                    ? 0
                    : typeof unreadCount === 'number'
                      ? unreadCount
                      : (c.unreadCount || 0) + 1,
              }
            : c,
        ),
      );
    };
    const onMessageEdited = ({ conversationId, message }) => {
      if (activeConvRef.current?._id === conversationId)
        setMessages((prev) =>
          prev.map((m) => (m._id === message._id ? message : m)),
        );
    };
    const onMessageDeleted = ({ conversationId, messageId }) => {
      if (activeConvRef.current?._id === conversationId)
        setMessages((prev) =>
          prev.map((m) =>
            m._id === messageId ? { ...m, isDeleted: true } : m,
          ),
        );
    };
    const onConvDeleted = ({ conversationId }) => {
      setConversations((prev) => prev.filter((c) => c._id !== conversationId));
      if (activeConvRef.current?._id === conversationId) {
        setActiveConv(null);
        setMessages([]);
        setShowThread(false);
        toast.info('Conversation was deleted');
      }
    };

    socket.on('user:presence_list', onPresenceList);
    socket.on('user:online', onOnline);
    socket.on('user:offline', onOffline);
    socket.on('user:typing', onTyping);
    socket.on('user:stop-typing', onStopTyping);
    socket.on('user:recording', onRecording);
    socket.on('user:stop-recording', onStopRecording);
    socket.on('message:new', onMessageNew);
    socket.on('message:edited', onMessageEdited);
    socket.on('message:deleted', onMessageDeleted);
    socket.on('conversation:deleted', onConvDeleted);
    socket.on(
      'message:reaction',
      ({ conversationId, messageId, reactions }) => {
        if (activeConvRef.current?._id === conversationId) {
          setMessages((prev) =>
            prev.map((m) =>
              String(m._id) === String(messageId) ? { ...m, reactions } : m,
            ),
          );
        }
      },
    );

    return () => {
      socket.off('user:presence_list', onPresenceList);
      socket.off('user:online', onOnline);
      socket.off('user:offline', onOffline);
      socket.off('user:typing', onTyping);
      socket.off('user:stop-typing', onStopTyping);
      socket.off('user:recording', onRecording);
      socket.off('user:stop-recording', onStopRecording);
      socket.off('message:new', onMessageNew);
      socket.off('message:edited', onMessageEdited);
      socket.off('message:deleted', onMessageDeleted);
      socket.off('conversation:deleted', onConvDeleted);
      socket.off('message:reaction');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected]);

  const scrollToBottom = () =>
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

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

  const openConversation = useCallback(
    async (conv) => {
      setActiveConv(conv);
      setShowThread(true);
      setLoadingMsgs(true);
      try {
        const res = await api.get(`/chat/conversations/${conv._id}/messages`);
        setMessages(res.data.messages);

        if (conv.unreadCount > 0) {
          await api.post(`/chat/conversations/${conv._id}/read`);
          // Update conversations list with zeroed unread count
          setConversations((prev) =>
            prev.map((c) =>
              c._id === conv._id ? { ...c, unreadCount: 0 } : c,
            ),
          );
          // Update global atom SEPARATELY (never inside a setState updater)
          setUnreadChatCount((prev) =>
            Math.max(0, prev - (conv.unreadCount || 0)),
          );
        }
        setTimeout(scrollToBottom, 100);
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
      // Only poll if tab is focused and socket is NOT connected (fallback only)
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
              // New message found! Fetch all
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
        // Silent fail
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

  const startConversation = async (contact) => {
    try {
      const res = await api.post('/chat/conversations', {
        targetId: contact._id,
        targetModel: contact.model,
      });
      const conv = res.data;
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
      toast.error('Microphone access denied');
    }
  };

  const stopRecording = () => {
    setIsRecording(false);

    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    } else if (streamRef.current) {
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

  const handleReact = async (msgId, emoji) => {
    try {
      const res = await api.post(`/chat/messages/${msgId}/react`, { emoji });
      setMessages((prev) =>
        prev.map((m) =>
          String(m._id) === String(msgId) ? { ...m, reactions: res.data } : m,
        ),
      );
    } catch {
      toast.error('Failed to react');
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
          onReact={handleReact}
          currentUserId={currentMemberId}
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
  const filteredConversations = conversations.filter((c) =>
    c.participant?.name?.toLowerCase().includes(search.toLowerCase()),
  );

  const totalUnread = conversations.reduce(
    (acc, c) => acc + (c.unreadCount || 0),
    0,
  );

  if (loading) {
    return <ChatSkeleton />;
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
        <div className="bg-white dark:bg-white/[0.02] rounded-[2rem] border border-slate-100 dark:border-white/[0.06] overflow-hidden">
          <PremiumGate />
        </div>
      ) : (
        <div className="bg-white dark:bg-white/[0.02] rounded-[2rem] border border-slate-100 dark:border-white/[0.06] overflow-hidden flex min-h-[70vh] max-h-[70vh]">
          {/* Sidebar */}
          {(!isMobile || !showThread) && (
            <div className="w-full lg:w-[320px] border-r border-slate-100 dark:border-white/[0.06] flex flex-col shrink-0">
              <div className="p-5 border-b border-slate-100 dark:border-white/[0.06]">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                      Inbox
                    </p>
                    <h2 className="text-base font-extrabold tracking-[-0.025em] text-slate-900 dark:text-white">
                      Messages
                    </h2>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="ghost"
                      onClick={deleteAllChats}
                      className="h-8 w-8 flex items-center justify-center rounded-full bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-colors [&_svg]:w-3.5 [&_svg]:h-3.5"
                      title="Delete all chats"
                    >
                      <Trash2 />
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => setShowContacts((v) => !v)}
                      className="h-8 w-8 flex items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors [&_svg]:w-3.5 [&_svg]:h-3.5"
                      title="Start new conversation"
                    >
                      <Edit3 />
                    </Button>
                  </div>
                </div>
                <div className="relative">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    size={14}
                  />
                  <Input
                    placeholder="Search conversations..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-auto pl-9 pr-4 py-2.5 bg-slate-50/40 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] rounded-full font-medium focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              {showContacts && (
                <div className="border-b border-border/40 bg-muted/10 max-h-[calc(100vh-20rem)] overflow-y-auto">
                  <p className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Available Staff
                  </p>
                  {filteredContacts.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      No contacts in your branch
                    </p>
                  ) : (
                    filteredContacts.map((c) => (
                      <Button
                        variant="ghost"
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
                      </Button>
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
                    <Button
                      variant="ghost"
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
                    </Button>
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
                    <Button
                      variant="ghost"
                      onClick={() => setShowThread(false)}
                      className="p-2 rounded-xl hover:bg-muted/50"
                    >
                      <X size={18} />
                    </Button>
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
                    <Button
                      variant="ghost"
                      onClick={() => deleteConversation(activeConv._id)}
                      className="p-2.5 rounded-xl text-rose-500 hover:bg-rose-500/10 transition-all"
                      title="Delete conversation"
                    >
                      <Trash2 size={20} />
                    </Button>
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

              {/* File preview */}
              {(selectedFile || filePreview) && (
                <div className="px-4 sm:px-6 pb-2 flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-muted/30 rounded-xl px-4 py-2 flex-1 max-w-sm">
                    {selectedFile?.type?.startsWith('audio/') ? (
                      <div className="flex flex-col gap-1 w-full">
                        <div className="flex items-center gap-2">
                          <Mic
                            size={14}
                            className="text-primary animate-pulse"
                          />
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
                      <span className="text-xs font-bold truncate max-w-[120px]">
                        {selectedFile?.name}
                      </span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
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
                  </Button>
                </div>
              )}

              {/* Composer */}
              {activeConv && (
                <div className="p-4 sm:p-6 border-t border-border/40 bg-card/30">
                  <div className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                    <Button
                      variant="ghost"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-3 rounded-2xl bg-muted/30 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all shrink-0"
                    >
                      <Paperclip size={18} />
                    </Button>
                    <div className="flex-1 bg-muted/30 border border-border/30 rounded-2xl px-4 py-3">
                      <Textarea
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
                        className="min-h-0 border-0 rounded-none p-0 bg-transparent font-medium resize-none leading-relaxed max-h-32"
                      />
                    </div>
                    {messageInput.trim() || selectedFile ? (
                      <Button
                        variant="ghost"
                        onClick={sendMessage}
                        disabled={isSending}
                        className="p-3 rounded-2xl bg-primary text-white hover:bg-primary/90 transition-all shrink-0 shadow-lg shadow-primary/20 disabled:opacity-60"
                      >
                        <Send size={18} />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        onClick={() =>
                          isRecording ? stopRecording() : startRecording()
                        }
                        className={cn(
                          'p-3 rounded-2xl transition-all shrink-0',
                          isRecording
                            ? 'bg-rose-500 text-white animate-pulse shadow-lg shadow-rose-500/30'
                            : 'bg-muted/30 text-muted-foreground hover:bg-primary/10 hover:text-primary',
                        )}
                        title={
                          isRecording ? 'Click to stop' : 'Click to record'
                        }
                      >
                        {isRecording ? (
                          <div className="w-4 h-4 bg-white rounded-sm mx-auto" />
                        ) : (
                          <Mic size={18} />
                        )}
                      </Button>
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
      )}

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
                : 'Are you sure you want to delete this conversation? This will permanently remove all messages.'}
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

export default MemberChat;
