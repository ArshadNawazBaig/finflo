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
  // name, address and contactNumber are all required by the Branch model.
  const [errors, setErrors] = useState({});
  const [existing, setExisting] = useState(null); // first existing branch, if any
  const [checking, setChecking] = useState(true);

  const clearError = (field) => setErrors((p) => ({ ...p, [field]: undefined }));

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
    const branchAddress = address.trim();
    const branchContact = contactNumber.trim();

    // Validate every required field up front and show inline errors, instead
    // of letting the server's Mongoose validation fail into a generic toast.
    const next = {};
    if (!branchName) next.name = 'Branch name is required';
    if (!branchAddress) next.address = 'Address is required';
    if (!branchContact) next.contactNumber = 'Contact number is required';
    if (Object.keys(next).length) {
      setErrors(next);
      return;
    }

    try {
      await api.post('/branches', {
        name: branchName,
        address: branchAddress,
        contactNumber: branchContact,
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
          <FormField
            label="Branch name"
            htmlFor="branch-name"
            required
            error={errors.name}
          >
            <Input
              id="branch-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                clearError('name');
              }}
              placeholder="Main Branch"
              className="h-12 rounded-xl"
            />
          </FormField>

          <FormField
            label="Address"
            htmlFor="branch-address"
            required
            error={errors.address}
          >
            <Input
              id="branch-address"
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                clearError('address');
              }}
              placeholder="Street, city"
              className="h-12 rounded-xl"
            />
          </FormField>

          <FormField
            label="Contact number"
            htmlFor="branch-phone"
            required
            error={errors.contactNumber}
          >
            <Input
              id="branch-phone"
              value={contactNumber}
              onChange={(e) => {
                setContactNumber(e.target.value);
                clearError('contactNumber');
              }}
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
