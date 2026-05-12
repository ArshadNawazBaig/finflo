import { useState, useEffect } from 'react';
import {
  MessageSquare,
  Search,
  CheckCircle2,
  AlertCircle,
  Filter,
  User,
  Building2,
  Trash2,
  ChevronLeft,
} from 'lucide-react';
import api from '@/lib/axios';
import PageHeader from '@/components/PageHeader';
import { TablePageSkeleton } from '@/components/ui/PageSkeletons';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
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
  const [filters, setFilters] = useState({
    status: 'all',
    category: 'all',
  });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Note: currentUser prop for TicketChat needs to have super_admin role for admin features to work
  // We can construct a mock user object since this page is protected for super_admins anyway
  const adminUser = { role: 'super_admin', _id: 'admin', name: 'Super Admin' };

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

  if (loading && tickets.length === 0) {
    return <TablePageSkeleton />;
  }

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
                <div
                  key={i}
                  className="p-5 rounded-2xl border border-border/30 bg-card/30 animate-pulse space-y-4"
                >
                  <div className="flex justify-between items-center">
                    <div className="h-4 w-16 rounded bg-muted/30" />
                    <div className="h-4 w-20 rounded bg-muted/30" />
                  </div>
                  <div className="h-5 w-3/4 rounded bg-muted/30" />
                  <div className="flex items-center gap-2 pt-2">
                    <div className="h-3 w-3 rounded-full bg-muted/30" />
                    <div className="h-3 w-32 rounded bg-muted/30" />
                  </div>
                </div>
              ))
            ) : filteredTickets.length === 0 ? (
              <EmptyState
                icon={MessageSquare}
                title="No Tickets Found"
                description="Check back later for new inquiries or try adjusting your filters."
                className="py-12 bg-transparent border-none"
              />
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
                        <span className="flex items-center gap-1.5 bg-muted/50 px-2.5 py-1 rounded-lg border border-border/50">
                          <User className="w-3 h-3" />
                          {selectedTicket.user.name} (
                          {selectedTicket.user.businessName})
                        </span>
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

              <TicketChat
                ticket={selectedTicket}
                currentUser={adminUser}
                onUpdateTicket={fetchTicketDetails}
              />
            </Card>
          ) : (
            <EmptyState
              icon={MessageSquare}
              title="Select a Ticket"
              description="Choose a conversation from the list to view the support history and respond."
              className="flex-1 h-full border-dashed bg-card/30"
            />
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
