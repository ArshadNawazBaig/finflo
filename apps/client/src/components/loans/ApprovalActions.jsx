import { Check, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import ApproveLoanModal from './ApproveLoanModal';
import RejectLoanModal from './RejectLoanModal';

const ApprovalActions = ({ loan, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);

  const handleAction = async (action) => {
    if (action === 'approve') {
      setIsApproveModalOpen(true);
      return;
    }

    if (action === 'reject') {
      setIsRejectModalOpen(true);
      return;
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          onClick={(e) => {
            e.stopPropagation();
            handleAction('approve');
          }}
          isLoading={loading}
          size="sm"
          variant="outline"
          className="h-8 w-8 p-0 rounded-full border-emerald-500/50 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700"
        >
          <Check size={14} />
        </Button>
        <Button
          onClick={(e) => {
            e.stopPropagation();
            handleAction('reject');
          }}
          isLoading={loading}
          size="sm"
          variant="outline"
          className="h-8 w-8 p-0 rounded-full border-red-500/50 text-red-600 hover:bg-red-500/10 hover:text-red-700"
        >
          <X size={14} />
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
      <RejectLoanModal
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        loan={loan}
        onSuccess={() => {
          setIsRejectModalOpen(false);
          onSuccess();
        }}
      />
    </>
  );
};

export default ApprovalActions;
