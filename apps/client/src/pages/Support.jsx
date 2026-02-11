import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Plus,
  Search,
  Clock,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  Send,
  LifeBuoy,
  Trash2,
  ChevronLeft,
  Paperclip,
  Pencil,
  X,
  Mic,
  Square,
  Play,
  Pause,
} from 'lucide-react';
import { cn, capitalize } from '@/lib/utils';
import api from '@/lib/axios';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const Support = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [reply, setReply] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);
  const [newTicket, setNewTicket] = useState({
    subject: '',
    category: 'General Assistance',
    priority: 'Medium',
    description: '',
  });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [viewingImage, setViewingImage] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordingIntervalRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioChunks, setAudioChunks] = useState([]);
  const [editingReplyId, setEditingReplyId] = useState(null);
  const [user, setUser] = useState(() =>
    JSON.parse(localStorage.getItem('user') || '{}'),
  );
  const [playingAudioUrl, setPlayingAudioUrl] = useState(null);
  const audioPlayerRef = useRef(new Audio());

  const toggleAudioPlayback = (url) => {
    if (playingAudioUrl === url) {
      audioPlayerRef.current.pause();
      setPlayingAudioUrl(null);
    } else {
      audioPlayerRef.current.src = url;
      audioPlayerRef.current.play();
      setPlayingAudioUrl(url);
    }
  };

  useEffect(() => {
    const audio = audioPlayerRef.current;
    const handleEnded = () => setPlayingAudioUrl(null);
    audio.addEventListener('ended', handleEnded);
    return () => audio.removeEventListener('ended', handleEnded);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (selectedTicket) {
      scrollToBottom();
    }
  }, [selectedTicket, selectedTicket?.replies]);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const { data } = await api.get('/tickets');
      setTickets(data);
    } catch (error) {
      console.error('Failed to fetch tickets:', error);
      toast.error('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  const fetchTicketDetails = async (id) => {
    try {
      const { data } = await api.get(`/tickets/${id}`);
      setSelectedTicket(data);
    } catch (error) {
      toast.error('Failed to load ticket details');
    }
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    try {
      await api.post('/tickets', newTicket);
      toast.success('Ticket created successfully');
      setShowNewTicketModal(false);
      setNewTicket({
        subject: '',
        category: 'General Assistance',
        priority: 'Medium',
        description: '',
      });
      fetchTickets();
    } catch (error) {
      toast.error('Failed to create ticket');
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!reply.trim() && selectedFiles.length === 0) return;

    try {
      setSendingReply(true);

      const formData = new FormData();
      formData.append('message', reply || ' '); // Ensure message is present even if empty (space hack if needed, or update backend to allow optional message)
      selectedFiles.forEach((file) => {
        formData.append('attachments', file);
      });

      await api.post(`/tickets/${selectedTicket._id}/reply`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setReply('');
      setSelectedFiles([]);
      fetchTicketDetails(selectedTicket._id);
      fetchTickets(false);
    } catch (error) {
      toast.error('Failed to send reply');
    } finally {
      setSendingReply(false);
    }
  };

  const handleEditReply = (r) => {
    setEditingReplyId(r._id);
    setReply(r.message);
  };

  const handleUpdateReply = async (e) => {
    e.preventDefault();
    if (!reply.trim()) return;

    try {
      setSendingReply(true);
      const { data } = await api.patch(
        `/tickets/${selectedTicket._id}/reply/${editingReplyId}`,
        {
          message: reply,
        },
      );
      setSelectedTicket(data);
      setReply('');
      setEditingReplyId(null);
      toast.success('Message updated');
    } catch (error) {
      toast.error('Failed to update message');
    } finally {
      setSendingReply(false);
    }
  };

  const handleDeleteIndividualReply = async (replyId) => {
    try {
      const { data } = await api.delete(
        `/tickets/${selectedTicket._id}/reply/${replyId}`,
      );
      setSelectedTicket(data);
      toast.success('Message deleted');
    } catch (error) {
      toast.error('Failed to delete message');
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const chunks = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        const audioFile = new File(
          [audioBlob],
          `voice-message-${Date.now()}.webm`,
          { type: 'audio/webm' },
        );
        audioFile.previewUrl = URL.createObjectURL(audioFile);
        setSelectedFiles((prev) => [...prev, audioFile]);
        stream.getTracks().forEach((track) => track.stop());
      };

      setAudioChunks([]);
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast.error('Could not access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordingIntervalRef.current);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDeleteTicket = async () => {
    try {
      setDeleting(true);
      await api.delete(`/tickets/${selectedTicket._id}`);
      toast.success('Ticket deleted successfully');
      setSelectedTicket(null);
      setShowDeleteModal(false);
      fetchTickets();
    } catch (error) {
      console.error('Failed to delete ticket:', error);
      toast.error('Failed to delete ticket');
    } finally {
      setDeleting(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Open':
        return 'bg-blue-500/10 text-blue-600';
      case 'In Progress':
        return 'bg-amber-500/10 text-amber-600';
      case 'Resolved':
        return 'bg-green-500/10 text-green-600';
      case 'Closed':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="relative animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Background Gradients */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[100px] animate-pulse delay-1000" />
      </div>

      <div className="space-y-6 relative z-10">
        <PageHeader
          title="Support Center"
          description="Help is here. Open a ticket or browse your history."
        >
          <Button
            onClick={() => setShowNewTicketModal(true)}
            variant="gradient"
            className="px-6 py-2.5 rounded-full flex items-center gap-2.5 text-[11px] font-black uppercase tracking-widest"
          >
            <Plus size={16} strokeWidth={3} />
            New Ticket
          </Button>
        </PageHeader>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-280px)] lg:h-[calc(100vh-280px)] min-h-[500px]">
          {/* Ticket List */}
          <div
            className={`${selectedTicket ? 'hidden lg:flex' : 'flex'} lg:col-span-4 flex-col gap-4 overflow-hidden rounded-[2rem] border border-border/50 bg-card/50 backdrop-blur-sm shadow-sm p-4 h-full`}
          >
            <div className="flex gap-2 relative z-10">
              <div className="relative flex-1 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10 group-focus-within:text-primary transition-colors duration-300" />
                <input
                  type="text"
                  placeholder="Search tickets..."
                  className="w-full pl-11 pr-4 h-11 rounded-xl border border-border/50 bg-background/50 focus:bg-background text-sm font-medium transition-all duration-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/50"
                  onChange={(e) => {
                    // Logic to filter tickets if search is implemented
                  }}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-28 rounded-2xl w-full" />
                ))
              ) : tickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
                  <div className="p-6 bg-muted/50 rounded-full mb-4">
                    <LifeBuoy className="w-10 h-10 opacity-40" />
                  </div>
                  <p className="text-sm font-bold">No tickets found</p>
                  <p className="text-xs opacity-70 mt-1">
                    Need help? Open a new ticket.
                  </p>
                </div>
              ) : (
                tickets.map((ticket) => (
                  <div
                    key={ticket._id}
                    onClick={() => fetchTicketDetails(ticket._id)}
                    className={`p-5 rounded-2xl border transition-all cursor-pointer group relative overflow-hidden ${
                      selectedTicket?._id === ticket._id
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-border/50 bg-card/50 hover:bg-muted/50 hover:border-border hover:shadow-sm'
                    }`}
                  >
                    <div
                      className={`absolute left-0 top-0 bottom-0 w-1 ${getStatusColor(ticket.status).replace('text-', 'bg-').split(' ')[0]} opacity-50`}
                    />

                    <div className="flex items-center justify-between mb-3">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider border ${getStatusColor(
                          ticket.status,
                        ).replace('bg-', 'bg-opacity-10 border-')}`}
                      >
                        {ticket.status}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-bold bg-muted/50 px-2 py-1 rounded-lg">
                        {new Date(ticket.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <h4
                      className={`text-sm font-bold truncate mb-1 transition-colors ${
                        selectedTicket?._id === ticket._id
                          ? 'text-primary'
                          : 'text-foreground group-hover:text-primary'
                      }`}
                    >
                      {ticket.subject}
                    </h4>
                    <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground font-medium opacity-80">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                        #{ticket._id.slice(-6)}
                      </span>
                      <span className="truncate max-w-[150px]">
                        {ticket.category}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Ticket Details / Chat */}
          <div
            className={`${selectedTicket ? 'flex' : 'hidden lg:flex'} lg:col-span-8 overflow-hidden flex-col h-full`}
          >
            {selectedTicket ? (
              <Card className="flex-1 flex flex-col border border-border/50 bg-card/50 backdrop-blur-sm shadow-sm rounded-[2rem] overflow-hidden min-h-0">
                <CardHeader className="border-b border-border/50 shrink-0 bg-card/30 backdrop-blur-md p-4 lg:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex items-start sm:gap-4 flex-1 min-w-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="lg:hidden shrink-0 -ml-2 h-9 w-9 rounded-xl"
                        onClick={() => setSelectedTicket(null)}
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </Button>
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex items-center gap-3">
                          <CardTitle className="text-xl font-black tracking-tight text-foreground truncate">
                            {selectedTicket.subject}
                          </CardTitle>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                            #{selectedTicket._id.slice(-6)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground font-medium">
                          <span className="flex items-center gap-1.5 bg-muted/50 px-2.5 py-1 rounded-lg border border-border/50 text-[7px]">
                            <div
                              className={`w-1.5 h-1.5 rounded-full ${
                                selectedTicket.priority === 'High' ||
                                selectedTicket.priority === 'Urgent'
                                  ? 'bg-destructive'
                                  : 'bg-emerald-500'
                              }`}
                            />
                            {selectedTicket.category}
                          </span>
                          <span
                            className={`font-bold px-2.5 py-1 rounded-lg border flex items-center gap-1.5 text-[7px] ${
                              selectedTicket.priority === 'High' ||
                              selectedTicket.priority === 'Urgent'
                                ? 'bg-destructive/10 text-destructive border-destructive/20'
                                : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                            }`}
                          >
                            <AlertCircle className="w-3 h-3" />
                            {selectedTicket.priority} Priority
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => setShowDeleteModal(true)}
                      className="flex items-center gap-2 px-3 lg:px-4 h-9 rounded-full border border-destructive/20 text-destructive hover:bg-destructive/5 text-[9px] lg:text-[10px] font-black uppercase tracking-widest transition-all duration-300 active:scale-95 shadow-sm whitespace-nowrap self-end sm:self-auto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-6 lg:space-y-8 custom-scrollbar min-h-0">
                  {/* Initial Post - User is on the right for themselves */}
                  <div className="flex flex-col gap-1 max-w-[85%] self-end items-end">
                    <div className="flex items-center gap-2 mb-0.5 px-1 flex-row-reverse">
                      <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[9px] font-bold">
                        {selectedTicket.user.name.charAt(0)}
                      </div>
                      <span className="text-[10px] font-bold text-foreground">
                        {selectedTicket.user.name} (You)
                      </span>
                      <span className="text-[9px] text-muted-foreground">
                        {new Date(selectedTicket.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="bg-primary text-primary-foreground p-3 rounded-2xl rounded-tr-none shadow-sm border border-primary text-xs leading-relaxed relative group">
                      <p>{selectedTicket.description}</p>
                    </div>
                  </div>

                  {/* Replies */}
                  {selectedTicket.replies.map((reply, i) => {
                    const currentUserId = user._id || user.id;
                    const replyUserId =
                      reply.user?._id ||
                      (typeof reply.user === 'string' ? reply.user : null);
                    const isMe = replyUserId === currentUserId;
                    const replyRole = reply.user?.role || '';
                    const isReplyFromStaff =
                      replyRole === 'super_admin' || replyRole === 'admin';

                    return (
                      <div
                        key={i}
                        className={`flex flex-col gap-1 max-w-[85%] group ${
                          isMe ? 'self-end items-end' : 'self-start'
                        }`}
                      >
                        <div
                          className={`flex items-center gap-2 mb-0.5 px-1 ${
                            isMe ? 'flex-row-reverse' : ''
                          }`}
                        >
                          <div
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                              isReplyFromStaff
                                ? 'bg-primary/10 text-primary'
                                : 'bg-primary/20 text-primary'
                            }`}
                          >
                            {isReplyFromStaff
                              ? 'S'
                              : selectedTicket.user.name.charAt(0)}
                          </div>
                          <span className="text-[10px] font-bold text-foreground">
                            {isMe
                              ? 'You'
                              : isReplyFromStaff
                                ? 'Support Team'
                                : reply.user?.name || selectedTicket.user.name}
                          </span>
                          <span className="text-[9px] text-muted-foreground flex items-center gap-1.5">
                            {new Date(reply.createdAt).toLocaleString()}
                            {reply.isEdited && (
                              <span className="italic opacity-60">
                                (edited)
                              </span>
                            )}
                          </span>
                        </div>

                        <div
                          className={`p-3 rounded-2xl shadow-sm text-xs leading-relaxed border max-w-fit relative ${
                            isMe
                              ? 'bg-primary text-primary-foreground border-primary rounded-tr-none'
                              : 'bg-muted/50 text-foreground border-border/50 rounded-tl-none'
                          }`}
                        >
                          <p>{reply.message}</p>
                          {/* Attachments */}
                          {reply.attachments &&
                            reply.attachments.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-white/20">
                                {reply.attachments.map((file, idx) => (
                                  <React.Fragment key={idx}>
                                    <a
                                      href={file.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      onClick={(e) => {
                                        if (file.fileType === 'image') {
                                          e.preventDefault();
                                          setViewingImage(file.url);
                                        } else if (file.fileType === 'audio') {
                                          e.preventDefault();
                                          toggleAudioPlayback(file.url);
                                        }
                                      }}
                                      className="group relative block w-16 h-16 rounded-lg overflow-hidden border border-border/50 shrink-0 hover:ring-2 hover:ring-white/50 transition-all cursor-pointer"
                                    >
                                      {file.fileType === 'image' ? (
                                        <img
                                          src={file.url}
                                          alt="attachment"
                                          className="w-full h-full object-cover"
                                        />
                                      ) : file.fileType === 'audio' ? (
                                        <div className="w-full h-full flex flex-col items-center justify-center bg-primary-foreground backdrop-blur-sm">
                                          {playingAudioUrl === file.url ? (
                                            <Pause className="w-6 h-6 text-primary animate-pulse" />
                                          ) : (
                                            <Mic className="w-6 h-6 text-primary" />
                                          )}
                                        </div>
                                      ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center bg-primary-foreground backdrop-blur-sm">
                                          <Paperclip className="w-6 h-6 opacity-100 text-primary" />
                                        </div>
                                      )}
                                      <div className="absolute inset-0 bg-black/40 items-center justify-center hidden group-hover:flex">
                                        {file.fileType === 'audio' ? (
                                          playingAudioUrl === file.url ? (
                                            <Pause className="w-5 h-5 text-white fill-current" />
                                          ) : (
                                            <Play className="w-5 h-5 text-white fill-current" />
                                          )
                                        ) : (
                                          <Search className="w-4 h-4 text-white" />
                                        )}
                                      </div>
                                    </a>
                                  </React.Fragment>
                                ))}
                              </div>
                            )}

                          {/* Action Buttons for owned messages */}
                          {(isMe || user.role === 'super_admin') && (
                            <div
                              className={cn(
                                'absolute top-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity',
                                isMe ? 'right-full mr-2' : 'left-full ml-2',
                              )}
                            >
                              {(!reply.attachments ||
                                reply.attachments.length === 0) && (
                                <button
                                  onClick={() => handleEditReply(reply)}
                                  className="p-1.5 rounded-full bg-background/50 hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors border border-border/50"
                                >
                                  <Pencil
                                    className="w-3.5 h-3.5"
                                    title="Edit"
                                  />
                                </button>
                              )}
                              <button
                                onClick={() =>
                                  handleDeleteIndividualReply(reply._id)
                                }
                                className="p-1.5 rounded-full bg-background/50 hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 transition-colors border border-border/50"
                              >
                                <Trash2
                                  className="w-3.5 h-3.5"
                                  title="Delete"
                                />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </CardContent>

                {/* Chat Input */}
                <div className="p-4 border-t border-border/50 bg-card/30 backdrop-blur-md shrink-0 space-y-3">
                  {editingReplyId && (
                    <div className="flex items-center justify-between px-4 py-2.5 bg-primary/5 border-l-4 border-primary -mx-4 -mt-4 mb-4 backdrop-blur-sm animate-in slide-in-from-top-2 duration-300">
                      <div className="flex items-center gap-2">
                        <Pencil
                          size={12}
                          className="text-primary animate-pulse"
                        />
                        <span className="text-[10px] font-black text-primary uppercase tracking-wider">
                          Editing message
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingReplyId(null);
                          setReply('');
                        }}
                        className="flex items-center gap-1 text-[10px] font-bold text-rose-500 hover:text-rose-600 transition-colors uppercase tracking-widest"
                      >
                        <X size={12} />
                        <span>Cancel</span>
                      </button>
                    </div>
                  )}
                  {/* Image Preview Area */}
                  {selectedFiles.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                      {selectedFiles.map((file, index) => (
                        <div key={index} className="relative shrink-0 group">
                          <div className="w-16 h-16 rounded-lg overflow-hidden border border-border bg-background flex items-center justify-center">
                            {file.type.startsWith('image/') ? (
                              <img
                                src={file.previewUrl}
                                alt="preview"
                                className="w-full h-full object-cover"
                              />
                            ) : file.type.startsWith('audio/') ? (
                              <div className="flex flex-col items-center justify-center text-primary">
                                {playingAudioUrl === file.previewUrl ? (
                                  <Pause className="w-5 h-5 animate-pulse" />
                                ) : (
                                  <Mic size={20} />
                                )}
                                <span className="text-[8px] font-bold mt-1">
                                  VOICE
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center text-xs font-bold text-muted-foreground uppercase">
                                {file.name.split('.').pop()}
                              </div>
                            )}
                          </div>
                          <div className="absolute inset-0 bg-black/60 rounded-lg flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {file.type.startsWith('audio/') && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  toggleAudioPlayback(file.previewUrl);
                                }}
                                className="w-7 h-7 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/40 transition-colors"
                              >
                                {playingAudioUrl === file.previewUrl ? (
                                  <Pause size={12} fill="currentColor" />
                                ) : (
                                  <Play size={12} fill="currentColor" />
                                )}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedFiles((prev) =>
                                  prev.filter((_, i) => i !== index),
                                );
                              }}
                              className="w-7 h-7 rounded-full bg-rose-500/80 text-white flex items-center justify-center hover:bg-rose-500 transition-colors"
                            >
                              <X size={12} strokeWidth={3} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <form
                    onSubmit={handleSendReply}
                    className="relative flex gap-3 items-center"
                  >
                    <input
                      type="file"
                      multiple
                      accept="image/*,application/pdf"
                      className="hidden"
                      ref={fileInputRef}
                      onChange={(e) => {
                        const files = Array.from(e.target.files);
                        if (selectedFiles.length + files.length > 5) {
                          toast.error('Limit 5 files per message');
                          return;
                        }
                        const filesWithPreviews = files.map((f) => {
                          f.previewUrl = URL.createObjectURL(f);
                          return f;
                        });
                        setSelectedFiles((prev) => [
                          ...prev,
                          ...filesWithPreviews,
                        ]);
                        e.target.value = ''; // Reset input
                      }}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 shrink-0 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Paperclip size={18} />
                    </Button>

                    <div className="relative flex-1 group">
                      {isRecording ? (
                        <div className="w-full h-10 rounded-xl border border-primary/50 bg-primary/5 flex items-center justify-between px-4 animate-pulse">
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                            <span className="text-xs font-bold text-primary tabular-nums">
                              Recording... {formatTime(recordingTime)}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={stopRecording}
                            className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center hover:scale-110 transition-transform"
                          >
                            <Square size={14} fill="currentColor" />
                          </button>
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={reply}
                          onChange={(e) => setReply(e.target.value)}
                          placeholder="Type your reply..."
                          className="w-full pl-5 pr-12 h-10 rounded-xl border border-border/50 bg-background focus:bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-300"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSendReply(e);
                            }
                          }}
                        />
                      )}
                    </div>

                    {!isRecording && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 shrink-0 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                        onClick={startRecording}
                      >
                        <Mic size={18} />
                      </Button>
                    )}

                    <Button
                      type="submit"
                      disabled={
                        sendingReply ||
                        (!reply.trim() && selectedFiles.length === 0)
                      }
                      variant="gradient"
                      className="h-10 px-6 rounded-full flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-primary/20"
                      onClick={
                        editingReplyId ? handleUpdateReply : handleSendReply
                      }
                    >
                      {sendingReply ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <span>{editingReplyId ? 'Update' : 'Send'}</span>
                          <Send className="w-4 h-4" />
                        </>
                      )}
                    </Button>
                  </form>
                  <div className="text-center mt-2">
                    <span className="text-[10px] text-muted-foreground font-medium opacity-60">
                      Press Enter to send
                    </span>
                  </div>
                </div>
              </Card>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-border/50 bg-card/50 backdrop-blur-sm rounded-[2rem] text-muted-foreground hover:bg-muted/30 transition-all duration-500">
                <div className="p-8 rounded-full bg-muted/50 mb-6 group-hover:scale-110 transition-all duration-500">
                  <MessageSquare className="w-16 h-16 opacity-20" />
                </div>
                <h3 className="font-bold text-xl text-foreground mb-2">
                  Select a Ticket
                </h3>
                <p className="text-sm font-medium opacity-60">
                  Choose a conversation from the list to view details
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New Ticket Modal */}
      <Dialog open={showNewTicketModal} onOpenChange={setShowNewTicketModal}>
        <DialogContent className="max-w-lg p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="px-4 py-4 sm:p-6 border-b border-border/40 bg-card/50">
            <DialogTitle className="text-lg sm:text-xl font-black">
              Open Support Ticket
            </DialogTitle>
            <DialogDescription className="text-[11px] sm:text-sm">
              Tell us what's happening and we'll get back to you.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateTicket}>
            <div className="px-4 py-4 sm:p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] sm:text-xs font-black text-muted-foreground uppercase tracking-wider">
                  Subject
                </label>
                <input
                  required
                  type="text"
                  className="w-full bg-muted/40 border border-border/50 rounded-xl px-4 py-2 text-sm font-medium"
                  value={newTicket.subject}
                  onChange={(e) =>
                    setNewTicket({ ...newTicket, subject: e.target.value })
                  }
                  placeholder="Briefly describe the issue"
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-[10px] sm:text-xs font-black text-muted-foreground uppercase tracking-wider">
                    Category
                  </label>
                  <Select
                    value={newTicket.category}
                    onValueChange={(val) =>
                      setNewTicket({ ...newTicket, category: val })
                    }
                  >
                    <SelectTrigger className="w-full h-9 sm:h-10 rounded-xl px-4 text-xs sm:text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Bug Report">Bug Report</SelectItem>
                      <SelectItem value="Feature Request">
                        Feature Request
                      </SelectItem>
                      <SelectItem value="Billing">Billing</SelectItem>
                      <SelectItem value="General Assistance">
                        General Assistance
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] sm:text-xs font-black text-muted-foreground uppercase tracking-wider">
                    Priority
                  </label>
                  <Select
                    value={newTicket.priority}
                    onValueChange={(val) =>
                      setNewTicket({ ...newTicket, priority: val })
                    }
                  >
                    <SelectTrigger className="w-full h-9 sm:h-10 rounded-xl px-4 text-xs sm:text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] sm:text-xs font-black text-muted-foreground uppercase tracking-wider">
                  Description
                </label>
                <textarea
                  required
                  rows={4}
                  className="w-full bg-muted/40 border border-border/50 rounded-xl px-4 py-2 text-sm font-medium resize-none placeholder:text-[10px] sm:placeholder:text-xs"
                  value={newTicket.description}
                  onChange={(e) =>
                    setNewTicket({
                      ...newTicket,
                      description: e.target.value,
                    })
                  }
                  placeholder="Provide details about your request..."
                />
              </div>
            </div>
            <div className="px-4 py-4 sm:p-6 border-t border-border/40 bg-muted/20 flex justify-end gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowNewTicketModal(false)}
                className="px-6 sm:px-8 py-2.5 sm:py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-all rounded-full hover:bg-muted"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="gradient"
                className="px-8 sm:px-10 py-3 sm:py-3.5 rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-widest flex items-center gap-2.5 sm:gap-3"
              >
                Submit Ticket
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <AlertDialogContent className="rounded-2xl border-none shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-slate-800">
              Delete Support Ticket
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 font-medium">
              Are you sure you want to delete this ticket? This will remove all
              conversation history permanently. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={deleting}
              className="rounded-xl border-none bg-slate-100 font-bold hover:bg-slate-200"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteTicket();
              }}
              disabled={deleting}
              className="bg-rose-500 hover:bg-rose-600 rounded-xl font-bold text-white shadow-lg shadow-rose-500/30"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Full Image Viewer Modal */}
      {viewingImage && (
        <div
          className="fixed inset-0 z-[500] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 lg:p-10"
          onClick={() => setViewingImage(null)}
        >
          <button
            onClick={() => setViewingImage(null)}
            className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors border border-white/10"
          >
            <X size={20} />
          </button>

          <div
            className="relative max-w-full max-h-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={viewingImage}
              alt="Full view"
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-200"
            />
            <div className="absolute -bottom-10 left-1/2 -translate-x-1/2">
              <a
                href={viewingImage}
                download
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-full bg-primary text-primary-foreground text-[10px] font-bold hover:opacity-90 transition-opacity shadow-lg flex items-center gap-2 uppercase tracking-widest"
              >
                Open Original
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Support;
