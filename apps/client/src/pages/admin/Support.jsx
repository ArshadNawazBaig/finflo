import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import {
  MessageSquare,
  Plus,
  Search,
  Clock,
  CheckCircle2,
  AlertCircle,
  Filter,
  User,
  Building2,
  Trash2,
  ChevronLeft,
  LifeBuoy,
} from 'lucide-react';
import api from '@/lib/axios';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

import TicketChat from '@/components/support/TicketChat';
import EmptyState from '@/components/ui/EmptyState';
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
  const [user] = useState(() =>
    JSON.parse(localStorage.getItem('user') || '{}'),
  );
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [filters, setFilters] = useState({
    status: 'all',
    category: 'all',
    priority: 'all',
  });
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      subject: '',
      description: '',
      category: 'General Inquiry',
      priority: 'Normal',
    },
  });
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Ref for new ticket form file input - keeping this as it's for ticket CREATION, not chat
  const newTicketFileInputRef = useRef(null);

  const [newTicketFiles, setNewTicketFiles] = useState([]);

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

  const onSubmitNewTicket = async (data) => {
    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('subject', data.subject);
      formData.append('description', data.description);
      formData.append('category', data.category);
      formData.append('priority', data.priority);
      newTicketFiles.forEach((file) => {
        formData.append('attachments', file);
      });

      await api.post('/tickets', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Ticket created successfully');
      setShowNewTicketModal(false);
      reset();
      setNewTicketFiles([]);
      fetchTickets();
    } catch (error) {
      console.error('Failed to create ticket:', error);
      toast.error('Failed to create ticket');
    } finally {
      setSubmitting(false);
    }
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
                  <div
                    key={i}
                    className="h-28 rounded-2xl w-full bg-card/40 backdrop-blur-md border border-border/10 animate-pulse"
                  />
                ))
              ) : tickets.length === 0 ? (
                <EmptyState
                  icon={LifeBuoy}
                  title="No Tickets"
                  description="Need help? Open a new ticket."
                  className="py-12 border-none bg-transparent"
                />
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

                <TicketChat
                  ticket={selectedTicket}
                  currentUser={user}
                  onUpdateTicket={fetchTicketDetails}
                />
              </Card>
            ) : (
              <EmptyState
                icon={MessageSquare}
                title="Select a Ticket"
                description="Choose a conversation from the list to view the support history and respond."
                className="flex-1 h-full border-dashed bg-card/10"
              />
            )}
          </div>
        </div>
      </div>

      {/* New Ticket Modal */}
      <Dialog open={showNewTicketModal} onOpenChange={setShowNewTicketModal}>
        <DialogContent className="max-w-lg max-h-[95vh] !p-0 flex flex-col overflow-hidden border-none shadow-2xl rounded-[2.5rem]">
          <form
            id="new-ticket-form"
            onSubmit={handleSubmit(onSubmitNewTicket)}
            className="flex flex-col h-full overflow-hidden"
          >
            {/* Fixed Header */}
            <div className="px-4 py-4 sm:p-6 border-b border-border/40 bg-card/50 z-10 shrink-0">
              <DialogHeader>
                <DialogTitle className="text-lg sm:text-xl font-black">
                  Open Support Ticket
                </DialogTitle>
                <DialogDescription className="text-[11px] sm:text-sm mt-1">
                  Tell us what's happening and we'll get back to you.
                </DialogDescription>
              </DialogHeader>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
              <div className="space-y-1.5">
                <label className="text-[10px] sm:text-xs font-black text-muted-foreground uppercase tracking-wider">
                  Subject
                </label>
                <input
                  type="text"
                  className="w-full bg-muted/40 border border-border/50 rounded-xl px-4 py-2 text-sm font-medium"
                  {...register('subject', { required: 'Subject is required' })}
                  placeholder="Briefly describe the issue"
                />
                {errors.subject && (
                  <p className="text-destructive text-[10px] font-bold pl-1 animate-in fade-in slide-in-from-top-1">
                    {errors.subject.message}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-[10px] sm:text-xs font-black text-muted-foreground uppercase tracking-wider">
                    Category
                  </label>
                  <Select
                    defaultValue="General Inquiry"
                    onValueChange={(val) => setValue('category', val)}
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
                    defaultValue="Normal"
                    onValueChange={(val) => setValue('priority', val)}
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
                  rows={4}
                  className="w-full bg-muted/40 border border-border/50 rounded-xl px-4 py-2 text-sm font-medium resize-none placeholder:text-[10px] sm:placeholder:text-xs"
                  {...register('description', {
                    required: 'Description is required',
                  })}
                  placeholder="Provide details about your request..."
                />
                {errors.description && (
                  <p className="text-destructive text-[10px] font-bold pl-1 animate-in fade-in slide-in-from-top-1">
                    {errors.description.message}
                  </p>
                )}
              </div>
            </div>

            {/* Fixed Footer */}
            <div className="px-4 py-4 sm:p-6 border-t border-border/40 bg-muted/20 flex justify-end gap-3 z-10 shrink-0">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowNewTicketModal(false)}
                className="px-6 sm:px-8 py-2.5 sm:py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-all rounded-full hover:bg-muted"
              >
                Cancel
              </Button>
              <Button
                form="new-ticket-form"
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
    </div>
  );
};

export default Support;
