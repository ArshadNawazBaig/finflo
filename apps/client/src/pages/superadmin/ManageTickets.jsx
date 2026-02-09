import { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Search,
  Clock,
  CheckCircle2,
  AlertCircle,
  Send,
  Filter,
  User,
  Building2,
  Trash2,
  ChevronLeft,
} from 'lucide-react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const ManageTickets = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [reply, setReply] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    category: 'all',
  });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const messagesEndRef = useRef(null);

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
      const { data } = await api.get('/tickets/all');
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

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!reply.trim()) return;

    try {
      setSendingReply(true);
      await api.post(`/tickets/${selectedTicket._id}/reply`, {
        message: reply,
      });
      setReply('');
      fetchTicketDetails(selectedTicket._id);
      fetchTickets(false); // Refresh list to update status if it changed silently
    } catch (error) {
      toast.error('Failed to send reply');
    } finally {
      setSendingReply(false);
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    try {
      await api.patch(`/tickets/${selectedTicket._id}/status`, {
        status: newStatus,
      });
      toast.success(`Ticket marked as ${newStatus}`);
      fetchTicketDetails(selectedTicket._id);
      fetchTickets();
    } catch (error) {
      toast.error('Failed to update status');
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

  const filteredTickets = tickets.filter((t) => {
    if (filters.status !== 'all' && t.status !== filters.status) return false;
    if (filters.category !== 'all' && t.category !== filters.category)
      return false;
    return true;
  });

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
    <div className="relative space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Background Gradients */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[100px] animate-pulse delay-1000" />
      </div>

      <PageHeader
        title="Manage Tickets"
        description="Respond to business inquiries and resolve issues."
        className="relative z-10"
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-280px)] lg:h-[calc(100vh-280px)] min-h-[500px] relative z-10">
        {/* Ticket List */}
        <div
          className={`${selectedTicket ? 'hidden lg:flex' : 'flex'} lg:col-span-4 flex-col gap-4 overflow-hidden rounded-[2rem] border border-border/50 bg-card/50 backdrop-blur-sm shadow-sm p-4 h-full`}
        >
          <div className="flex gap-2 relative z-10">
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10 group-focus-within:text-primary transition-colors duration-300" />
              <input
                type="text"
                placeholder="Search..."
                className="w-full pl-11 pr-4 h-10 rounded-xl border border-border/50 bg-background/50 focus:bg-background text-sm font-medium transition-all duration-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/50"
              />
            </div>
            <Select
              value={filters.status}
              onValueChange={(val) => setFilters({ ...filters, status: val })}
            >
              <SelectTrigger className="w-[110px] h-10 rounded-xl border border-border/50 bg-background/50 focus:bg-background text-sm font-medium transition-all duration-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 px-3">
                <Filter className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="Open">Open</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Resolved">Resolved</SelectItem>
                <SelectItem value="Closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
            {loading ? (
              [...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-2xl w-full" />
              ))
            ) : filteredTickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
                <div className="p-6 bg-muted/50 rounded-full mb-4">
                  <MessageSquare className="w-10 h-10 opacity-40" />
                </div>
                <p className="text-sm font-bold">No tickets found</p>
                <p className="text-xs opacity-70 mt-1">
                  Check back later for new inquiries.
                </p>
              </div>
            ) : (
              filteredTickets.map((ticket) => (
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
                    <Building2 className="w-3 h-3" />
                    <span className="truncate max-w-[150px]">
                      {ticket.user.businessName || ticket.user.name}
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
                  <div className="flex items-start gap-4 flex-1 min-w-0">
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
                        <CardTitle className="text-xl font-black tracking-tight text-foreground">
                          {selectedTicket.subject}
                        </CardTitle>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                          #{selectedTicket._id.slice(-6)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground font-medium">
                        <span className="flex items-center gap-1.5 bg-muted/50 px-2.5 py-1 rounded-lg border border-border/50">
                          <User className="w-3 h-3" />
                          {selectedTicket.user.name} (
                          {selectedTicket.user.businessName})
                        </span>
                        <span className="flex items-center gap-1.5 bg-muted/50 px-2.5 py-1 rounded-lg border border-border/50">
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
                          className={`font-bold px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${
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

                  <div className="flex gap-2 shrink-0 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide">
                    {selectedTicket.status !== 'Resolved' && (
                      <button
                        onClick={() => handleUpdateStatus('Resolved')}
                        className="flex items-center gap-2 px-3 lg:px-4 h-9 rounded-full border border-emerald-500/20 text-emerald-600 hover:bg-emerald-500/5 text-[9px] lg:text-[10px] font-black uppercase tracking-widest transition-all duration-300 active:scale-95 shadow-sm whitespace-nowrap"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Resolve
                      </button>
                    )}
                    {selectedTicket.status !== 'Closed' && (
                      <button
                        onClick={() => handleUpdateStatus('Closed')}
                        className="flex items-center gap-2 px-3 lg:px-4 h-9 rounded-full border border-amber-500/20 text-amber-600 hover:bg-amber-500/5 text-[9px] lg:text-[10px] font-black uppercase tracking-widest transition-all duration-300 active:scale-95 shadow-sm whitespace-nowrap"
                      >
                        <AlertCircle className="w-3.5 h-3.5" />
                        Close
                      </button>
                    )}
                    <button
                      onClick={() => setShowDeleteModal(true)}
                      className="flex items-center gap-2 px-3 lg:px-4 h-9 rounded-full border border-destructive/20 text-destructive hover:bg-destructive/5 text-[9px] lg:text-[10px] font-black uppercase tracking-widest transition-all duration-300 active:scale-95 shadow-sm whitespace-nowrap"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-6 lg:space-y-8 custom-scrollbar min-h-0">
                {/* Initial Post */}
                <div className="flex flex-col gap-2 max-w-[85%]">
                  <div className="flex items-center gap-2 mb-1 pl-1">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                      {selectedTicket.user.name.charAt(0)}
                    </div>
                    <span className="text-[11px] font-bold text-foreground">
                      {selectedTicket.user.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(selectedTicket.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-card p-5 rounded-2xl rounded-tl-none shadow-sm border border-border/50 text-foreground text-sm leading-relaxed relative group">
                    <p>{selectedTicket.description}</p>
                    <div className="absolute top-0 left-0 w-1 h-full bg-primary rounded-l-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>

                {/* Replies */}
                {selectedTicket.replies.map((reply, i) => {
                  const isAdmin = reply.user.role === 'super_admin';
                  return (
                    <div
                      key={i}
                      className={`flex flex-col gap-2 max-w-[85%] ${
                        isAdmin ? 'self-end items-end' : 'self-start'
                      }`}
                    >
                      <div
                        className={`flex items-center gap-2 mb-1 px-1 ${isAdmin ? 'flex-row-reverse' : ''}`}
                      >
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            isAdmin
                              ? 'bg-primary/20 text-primary'
                              : 'bg-primary/10 text-primary'
                          }`}
                        >
                          {isAdmin ? 'S' : selectedTicket.user.name.charAt(0)}
                        </div>
                        <span className="text-[11px] font-bold text-foreground">
                          {isAdmin ? 'Support Team' : selectedTicket.user.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(reply.createdAt).toLocaleString()}
                        </span>
                      </div>

                      <div
                        className={`p-5 rounded-3xl shadow-sm text-sm leading-relaxed border ${
                          isAdmin
                            ? 'bg-primary text-primary-foreground border-primary rounded-tr-none'
                            : 'bg-card text-foreground border-border/50 rounded-tl-none'
                        }`}
                      >
                        <p>{reply.message}</p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </CardContent>

              {/* Chat Input */}
              <div className="p-4 border-t border-border/50 bg-card/30 backdrop-blur-md shrink-0">
                <form
                  onSubmit={handleSendReply}
                  className="relative flex gap-3 items-center"
                >
                  <div className="relative flex-1 group">
                    <input
                      type="text"
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      placeholder="Reply to business..."
                      className="w-full pl-5 pr-12 h-10 rounded-xl border border-border/50 bg-background focus:bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-300"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSendReply(e);
                        }
                      }}
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={sendingReply || !reply.trim()}
                    variant="gradient"
                    className="h-10 w-10 shrink-0 rounded-full flex items-center justify-center p-0"
                  >
                    {sendingReply ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
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

      <AlertDialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <AlertDialogContent className="rounded-2xl border-none shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-foreground">
              Delete Support Ticket
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground font-medium">
              Are you sure you want to delete this ticket? This will remove all
              conversation history permanently. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={deleting}
              className="rounded-xl border-none bg-muted font-bold hover:bg-muted/80"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteTicket();
              }}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90 rounded-xl font-bold text-white shadow-lg shadow-destructive/30"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ManageTickets;
