import { Check, X, Loader2 } from 'lucide-react';
import { useState } from 'react';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import ApproveLoanModal from './ApproveLoanModal';

const ApprovalActions = ({ loan, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);

  const handleAction = async (action) => {
    if (action === 'approve') {
      setIsApproveModalOpen(true);
      return;
    }

    if (!confirm('Are you sure you want to reject this loan?')) return;

    setLoading(true);
    try {
      await api.patch(`/loans/${loan._id}/${action}`);
      toast.success(
        `Loan ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
      );
      onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.message || `Failed to ${action} loan`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          onClick={() => handleAction('approve')}
          disabled={loading}
          size="sm"
          variant="outline"
          className="h-8 w-8 p-0 rounded-full border-emerald-500/50 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700"
        >
          {loading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Check size={14} />
          )}
        </Button>
        <Button
          onClick={() => handleAction('reject')}
          disabled={loading}
          size="sm"
          variant="outline"
          className="h-8 w-8 p-0 rounded-full border-red-500/50 text-red-600 hover:bg-red-500/10 hover:text-red-700"
        >
          {loading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <X size={14} />
          )}
        </Button>
      </div>

      <ApproveLoanModal
        isOpen={isApproveModalOpen}
        onClose={() => setIsApproveModalOpen(false)}
        loan={loan}
        onSuccess={() => {
          setIsApproveModalOpen(false);
          onSuccess();
        }}
      />
    </>
  );
};

export default ApprovalActions;
