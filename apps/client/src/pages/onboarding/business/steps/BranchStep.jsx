/* eslint-disable react/prop-types -- project convention: no propTypes */
import { useState, useEffect } from 'react';
import { Building, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/axios';
import { Input } from '@/components/ui/input';
import FormField from '@/components/ui/FormField';
import StepFrame from '../StepFrame';

const BranchStep = ({ onNext, onBack }) => {
  const [name, setName] = useState('Main Branch');
  const [address, setAddress] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [error, setError] = useState('');
  const [existing, setExisting] = useState(null); // first existing branch, if any
  const [checking, setChecking] = useState(true);

  // A tenant may already have a branch (e.g. resuming onboarding). Don't create
  // a duplicate — surface the existing one and let them continue.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data } = await api.get('/branches');
        const list = Array.isArray(data) ? data : data?.data || [];
        if (active && list.length > 0) setExisting(list[0]);
      } catch {
        /* non-fatal — fall through to the create form */
      } finally {
        if (active) setChecking(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleContinue = async () => {
    if (existing) {
      onNext();
      return;
    }
    const branchName = name.trim();
    if (!branchName) {
      setError('Branch name is required');
      return;
    }
    try {
      await api.post('/branches', {
        name: branchName,
        address: address.trim(),
        contactNumber: contactNumber.trim(),
      });
      onNext();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create branch');
    }
  };

  return (
    <StepFrame
      icon={Building}
      eyebrow="Step 3 · Your first branch"
      title={existing ? 'Your branch is ready' : 'Create your first branch'}
      description={
        existing
          ? 'Members, customers, and loans are organised by branch — you already have one set up.'
          : 'Members, customers, and loans are organised by branch. This first one becomes your default.'
      }
      onPrimary={handleContinue}
      onBack={onBack}
      primaryDisabled={checking}
    >
      {existing ? (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 size={18} />
          </span>
          <div>
            <p className="text-[13px] font-extrabold tracking-tight text-slate-900 dark:text-white">
              {existing.name}
            </p>
            {existing.address && (
              <p className="text-[12px] font-medium text-slate-500 dark:text-slate-400">
                {existing.address}
              </p>
            )}
          </div>
        </div>
      ) : (
        <>
          <FormField label="Branch name" htmlFor="branch-name" required error={error}>
            <Input
              id="branch-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError('');
              }}
              placeholder="Main Branch"
              className="h-12 rounded-xl"
            />
          </FormField>

          <FormField label="Address" htmlFor="branch-address">
            <Input
              id="branch-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Street, city"
              className="h-12 rounded-xl"
            />
          </FormField>

          <FormField label="Contact number" htmlFor="branch-phone">
            <Input
              id="branch-phone"
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value)}
              placeholder="+92 300 0000000"
              className="h-12 rounded-xl"
            />
          </FormField>
        </>
      )}
    </StepFrame>
  );
};

export default BranchStep;
