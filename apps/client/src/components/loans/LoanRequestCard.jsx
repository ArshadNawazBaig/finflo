import { useState } from 'react';
import { Check, X, Loader2, Calendar, Paperclip } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import LoanDocumentViewer from './LoanDocumentViewer';

const LoanRequestCard = ({ request, onApprove, onReject, processingId }) => {
  const [docViewerOpen, setDocViewerOpen] = useState(false);
  const docCount = request.documents?.filter(d => d.url !== 'N/A').length || 0;

  return (
    <>
    <div className="bg-card p-3 rounded-lg border border-border/50 shadow-xs hover:shadow-md transition-all">
      <div className="flex justify-between items-start mb-2.5">
        <div>
          <Link
            to={
              request.customer?._id ? `/customers/${request.customer._id}` : '#'
            }
            className="text-sm font-bold hover:text-primary transition-colors"
          >
            {request.customer?.name}
          </Link>
          <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
            <Calendar size={10} />
            {format(new Date(request.createdAt), 'MMM dd, yyyy')}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
              request.status === 'active'
                ? 'bg-emerald-500/10 text-emerald-600'
                : request.status === 'pending'
                  ? 'bg-amber-500/10 text-amber-600'
                  : request.status === 'completed'
                    ? 'bg-blue-500/10 text-blue-600'
                    : 'bg-red-500/10 text-red-600'
            }`}
          >
            {request.status}
          </span>
          {request.riskDetails ? (
            <span
              className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${
                ['A+', 'A'].includes(request.riskDetails.grade)
                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                  : ['B', 'C'].includes(request.riskDetails.grade)
                    ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                    : 'bg-red-500/10 text-red-600 border-red-500/20'
              }`}
            >
              Risk: {request.riskDetails.grade}
            </span>
          ) : (
            <span className="px-2 py-0.5 text-[9px] font-black text-muted-foreground/50 uppercase">
              Risk: —
            </span>
          )}
        </div>
      </div>

      <div className="space-y-1.5 mb-3">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Amount</span>
          <span className="font-bold text-primary">
            {formatCurrency(request.principal)}
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Duration</span>
          <span className="font-bold">{request.duration} Months</span>
        </div>
        {request.notes && (
          <div className="pt-0.5">
            <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">
              "{request.notes}"
            </p>
          </div>
        )}
        {docCount > 0 && (
          <div className="pt-1">
            <button
              onClick={() => setDocViewerOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black"
            >
              <Paperclip size={10} />
              {docCount} document{docCount > 1 ? 's' : ''}
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        {request.status === 'pending' ? (
          <>
            <Button
              className="flex-1 h-8 text-[10px]"
              variant="outline"
              onClick={() => onReject(request._id)}
              disabled={processingId === request._id}
            >
              {processingId === request._id ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <X size={12} className="mr-1" />
                  Reject
                </>
              )}
            </Button>
            <Button
              className="flex-1 h-8 text-[10px] bg-emerald-500 hover:bg-emerald-600"
              onClick={() => onApprove(request)}
              disabled={processingId === request._id}
            >
              <Check size={12} className="mr-1" />
              Approve
            </Button>
          </>
        ) : (
          <div className="w-full py-1.5 bg-muted/30 rounded-md text-center text-[10px] font-bold text-muted-foreground ">
            Request {request.status}
          </div>
        )}
      </div>
    </div>

    {docCount > 0 && (
      <LoanDocumentViewer
        isOpen={docViewerOpen}
        onClose={() => setDocViewerOpen(false)}
        documents={request.documents}
        memberName={request.customer?.name || 'Member'}
      />
    )}
    </>
  );
};

export default LoanRequestCard;
