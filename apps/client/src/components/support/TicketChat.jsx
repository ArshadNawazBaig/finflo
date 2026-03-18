import { useState, useEffect, useRef } from 'react';
import React from 'react';
import {
  Send,
  Trash2,
  Paperclip,
  Mic,
  X,
  Pause,
  Play,
  Square,
  Pencil,
  Search,
} from 'lucide-react';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
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

const TicketChat = ({ ticket, currentUser, onUpdateTicket }) => {
  const [reply, setReply] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [playingAudioUrl, setPlayingAudioUrl] = useState(null);
  const [editingReplyId, setEditingReplyId] = useState(null);
  const [viewingImage, setViewingImage] = useState(null);
  const [replyToDelete, setReplyToDelete] = useState(null);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const audioPlayerRef = useRef(new Audio());
  const recordingIntervalRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [ticket?.replies, sendingReply]);

  useEffect(() => {
    const audio = audioPlayerRef.current;
    const handleEnded = () => setPlayingAudioUrl(null);
    audio.addEventListener('ended', handleEnded);
    return () => {
      audio.removeEventListener('ended', handleEnded);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, []);

  const toggleAudioPlayback = (url) => {
    const audio = audioPlayerRef.current;
    if (playingAudioUrl === url) {
      audio.pause();
      setPlayingAudioUrl(null);
    } else {
      audio.src = url;
      audio.play();
      setPlayingAudioUrl(url);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const file = new File([blob], `voice-${Date.now()}.webm`, {
          type: 'audio/webm',
        });
        file.previewUrl = URL.createObjectURL(blob);
        setSelectedFiles((prev) => [...prev, file]);
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingTime(0);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Recording error:', error);
      toast.error('Failed to start recording');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      setIsRecording(false);
      clearInterval(recordingIntervalRef.current);
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!reply.trim() && selectedFiles.length === 0) return;

    try {
      setSendingReply(true);
      const formData = new FormData();
      formData.append('message', reply || '');
      selectedFiles.forEach((file) => {
        formData.append('attachments', file);
      });

      await api.post(`/tickets/${ticket._id}/reply`, formData);

      setReply('');
      setSelectedFiles([]);
      onUpdateTicket(ticket._id);
    } catch (error) {
      console.error('Send reply error:', error);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        'Failed to send reply';
      toast.error(errorMessage);
    } finally {
      setSendingReply(false);
    }
  };

  const handleEditReply = (item) => {
    setEditingReplyId(item._id);
    setReply(item.message || '');
    fileInputRef.current?.focus();
  };

  const handleUpdateReply = async (e) => {
    e.preventDefault();
    if (!reply.trim()) return;

    try {
      setSendingReply(true);
      await api.patch(`/tickets/${ticket._id}/reply/${editingReplyId}`, {
        message: reply,
      });
      setReply('');
      setEditingReplyId(null);
      onUpdateTicket(ticket._id);
      toast.success('Reply updated');
    } catch (error) {
      console.error('Update reply error:', error);
      toast.error('Failed to update reply');
    } finally {
      setSendingReply(false);
    }
  };

  const handleDeleteIndividualReply = (replyId) => {
    setReplyToDelete(replyId);
  };

  const confirmDeleteReply = async () => {
    if (!replyToDelete) return;

    try {
      await api.delete(`/tickets/${ticket._id}/reply/${replyToDelete}`);
      onUpdateTicket(ticket._id);
      toast.success('Reply deleted');
    } catch (error) {
      console.error('Delete reply error:', error);
      toast.error('Failed to delete reply');
    } finally {
      setReplyToDelete(null);
    }
  };

  return (
    <>
      <div className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-6 lg:space-y-8 custom-scrollbar min-h-0">
        {/* Initial Post - User is on the right for themselves */}
        {ticket && (
          <div
            className={`flex flex-col gap-1 max-w-[85%] ${
              currentUser._id === ticket.user._id ||
              (currentUser.role === 'super_admin' && false) // Admin sees user post on left usually, but if admin IS user (unlikely)
                ? 'self-end items-end'
                : 'self-start'
            }`}
          >
            <div
              className={`flex items-center gap-2 mb-0.5 px-1 ${
                currentUser._id === ticket.user._id ? 'flex-row-reverse' : ''
              }`}
            >
              <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[9px] font-bold">
                {ticket.user.name.charAt(0)}
              </div>
              <span className="text-[10px] font-bold text-foreground">
                {ticket.user.name}
                {currentUser._id === ticket.user._id ? ' (You)' : ''}
              </span>
              <span className="text-[9px] text-muted-foreground">
                {new Date(ticket.createdAt).toLocaleString()}
              </span>
            </div>
            <div
              className={`bg-primary text-primary-foreground p-3 rounded-2xl shadow-sm border border-primary text-xs leading-relaxed relative group ${
                currentUser._id === ticket.user._id
                  ? 'rounded-tr-none'
                  : 'rounded-tl-none bg-muted/50 text-foreground border-border/50'
              }`}
            >
              <p>{ticket.description}</p>
              {/* Initial Attachments */}
              {ticket.attachments && ticket.attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-white/20">
                  {ticket.attachments.map((file, idx) => (
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
            </div>
          </div>
        )}

        {/* Replies */}
        {ticket?.replies?.map((reply, i) => {
          const currentUserId = currentUser._id || currentUser.id;
          const replyUserId =
            reply.user?._id ||
            (typeof reply.user === 'string' ? reply.user : null);

          // If viewing as Admin:
          // - "Me" is if reply.user.role === 'super_admin' OR replyUserId === currentUserId
          // - "Staff" label for other admins?

          const ticketOwnerId = ticket.user._id || ticket.user;
          const replyRole = reply.user?.role || '';

          // "Staff" is an admin/super_admin who is NOT the ticket owner.
          const isReplyFromStaff =
            (replyRole === 'super_admin' || replyRole === 'admin') &&
            replyUserId !== ticketOwnerId;

          // Determine "isMe"
          let isMe = false;

          if (currentUser.role === 'super_admin') {
            // Admin View:
            // If reply is from the ticket owner, it is "The User" (Left).
            // Unless I (the admin) am actually the ticket owner context (unlikely but possible).
            // Any other reply is assumed to be from Staff/Me (Right).
            if (replyUserId === ticketOwnerId) {
              isMe = replyUserId === currentUserId;
            } else {
              isMe = true;
            }
          } else {
            // User View: "Me" is the ticket owner (me).
            isMe = replyUserId === currentUserId;
          }

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
                    : reply.user?.name?.charAt(0) || ticket.user.name.charAt(0)}
                </div>
                <span className="text-[10px] font-bold text-foreground">
                  {isMe
                    ? 'You'
                    : isReplyFromStaff
                      ? 'Support Team'
                      : reply.user?.name || ticket.user.name}
                </span>
                <span className="text-[9px] text-muted-foreground flex items-center gap-1.5">
                  {new Date(reply.createdAt).toLocaleString()}
                  {reply.isEdited && (
                    <span className=" opacity-60">(edited)</span>
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
                {reply.attachments && reply.attachments.length > 0 && (
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
                {(isMe || currentUser.role === 'super_admin') && (
                  <div
                    className={cn(
                      'absolute top-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity',
                      isMe ? 'right-full mr-2' : 'left-full ml-2',
                    )}
                  >
                    {(!reply.attachments || reply.attachments.length === 0) && (
                      <button
                        onClick={() => handleEditReply(reply)}
                        className="p-1.5 rounded-full bg-background/50 hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors border border-border/50"
                      >
                        <Pencil className="w-3.5 h-3.5" title="Edit" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteIndividualReply(reply._id)}
                      className="p-1.5 rounded-full bg-background/50 hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 transition-colors border border-border/50"
                    >
                      <Trash2 className="w-3.5 h-3.5" title="Delete" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input */}
      <div className="p-4 border-t border-border/50 bg-card/30 backdrop-blur-md shrink-0 space-y-3">
        {editingReplyId && (
          <div className="flex items-center justify-between px-4 py-2.5 bg-primary/5 border-l-4 border-primary -mx-4 -mt-4 mb-4 backdrop-blur-sm animate-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-2">
              <Pencil size={12} className="text-primary animate-pulse" />
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
                      <span className="text-[8px] font-bold mt-1">VOICE</span>
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
              setSelectedFiles((prev) => [...prev, ...filesWithPreviews]);
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
                    if (editingReplyId) handleUpdateReply(e);
                    else handleSendReply(e);
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
              sendingReply || (!reply.trim() && selectedFiles.length === 0)
            }
            variant="gradient"
            className="h-10 px-6 rounded-full flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-primary/20"
            onClick={editingReplyId ? handleUpdateReply : handleSendReply}
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

      {/* Image Lightbox */}
      {viewingImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-300"
          onClick={() => setViewingImage(null)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]">
            <button
              onClick={() => setViewingImage(null)}
              className="absolute -top-10 right-0 text-white hover:text-white/80 transition-colors"
            >
              <X size={24} />
            </button>
            <img
              src={viewingImage}
              alt="Full view"
              className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!replyToDelete}
        onOpenChange={(open) => !open && setReplyToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Message?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this
              message and any attachments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-500 hover:bg-rose-600"
              onClick={confirmDeleteReply}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default TicketChat;
