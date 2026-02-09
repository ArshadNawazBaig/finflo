import { useState, useEffect } from 'react';
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

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      setLoading(true);
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
    if (!reply.trim()) return;

    try {
      setSendingReply(true);
      await api.post(`/tickets/${selectedTicket._id}/reply`, {
        message: reply,
      });
      setReply('');
      fetchTicketDetails(selectedTicket._id);
    } catch (error) {
      toast.error('Failed to send reply');
    } finally {
      setSendingReply(false);
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

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-280px)]">
          {/* Ticket List */}
          <div className="lg:col-span-4 flex flex-col gap-4 overflow-hidden rounded-[2rem] border border-border/50 bg-card/50 backdrop-blur-sm shadow-sm p-4">
            <div className="relative group">
              <Search className="absolute left-4 z-10 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors duration-300" />
              <input
                type="text"
                placeholder="Search tickets..."
                className="w-full pl-11 pr-4 py-4 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm focus:bg-background text-sm font-medium transition-all duration-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/50"
              />
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
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {ticket.description}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Ticket Details / Chat */}
          <div className="lg:col-span-8 overflow-hidden flex flex-col">
            {selectedTicket ? (
              <Card className="flex-1 flex flex-col border border-border/50 bg-card/50 backdrop-blur-sm shadow-sm rounded-[2rem] overflow-hidden">
                <CardHeader className="border-b border-border/50 shrink-0 bg-card/30 backdrop-blur-md p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1.5">
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

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowDeleteModal(true)}
                      className="rounded-xl h-10 border-destructive/20 text-destructive hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 text-[10px] font-bold uppercase tracking-wider transition-all duration-300 group"
                    >
                      <div className="bg-destructive/10 p-1.5 rounded-md mr-2 group-hover:bg-destructive/20 transition-colors">
                        <Trash2 className="w-3 h-3" />
                      </div>
                      Delete
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
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
                            {isAdmin
                              ? 'Support Team'
                              : selectedTicket.user.name}
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
                        placeholder="Type your reply..."
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
                      className="h-10 w-10 shrink-0 rounded-xl p-0 flex items-center justify-center"
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
      </div>

      {/* New Ticket Modal (Simplified local implementation) */}
      {showNewTicketModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
          style={{ margin: 0 }}
        >
          <Card className="w-full max-w-lg border border-border/50 shadow-2xl rounded-3xl overflow-hidden animate-in zoom-in-95 duration-200">
            <CardHeader className="border-b border-border/40">
              <CardTitle className="text-xl font-black">
                Open Support Ticket
              </CardTitle>
              <CardDescription>
                Tell us what's happening and we'll get back to you.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleCreateTicket}>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Subject
                  </label>
                  <input
                    required
                    type="text"
                    className="w-full bg-muted/40 border border-border/50 rounded-xl px-4 py-2 text-sm"
                    value={newTicket.subject}
                    onChange={(e) =>
                      setNewTicket({ ...newTicket, subject: e.target.value })
                    }
                    placeholder="Briefly describe the issue"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Category
                    </label>
                    <Select
                      value={newTicket.category}
                      onValueChange={(val) =>
                        setNewTicket({ ...newTicket, category: val })
                      }
                    >
                      <SelectTrigger className="w-full h-10 rounded-xl px-4">
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
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Priority
                    </label>
                    <Select
                      value={newTicket.priority}
                      onValueChange={(val) =>
                        setNewTicket({ ...newTicket, priority: val })
                      }
                    >
                      <SelectTrigger className="w-full h-10 rounded-xl px-4">
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
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Description
                  </label>
                  <textarea
                    required
                    rows={4}
                    className="w-full bg-muted/40 border border-border/50 rounded-xl px-4 py-2 text-sm resize-none"
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
              </CardContent>
              <div className="p-6 border-t border-border/40 bg-muted/20 flex justify-end gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowNewTicketModal(false)}
                  className="px-8 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-all rounded-full hover:bg-muted"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="gradient"
                  className="px-10 py-3.5 rounded-full text-[11px] font-black uppercase tracking-widest flex items-center gap-3"
                >
                  Submit Ticket
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

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
    </div>
  );
};

export default Support;
