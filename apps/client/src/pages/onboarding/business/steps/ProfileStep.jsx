/* eslint-disable react/prop-types -- project convention: no propTypes */
import { useState } from 'react';
import { Building2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/axios';
import { Input } from '@/components/ui/input';
import FormField from '@/components/ui/FormField';
import PillSelect from '@/components/ui/PillSelect';
import StepFrame from '../StepFrame';

const BUSINESS_TYPES = [
  { value: 'micro-finance', label: 'Micro-finance lender' },
  { value: 'cooperative', label: 'Lending cooperative' },
  { value: 'savings-committee', label: 'Savings committee' },
  { value: 'other', label: 'Other' },
];

const CURRENCIES = [
  { value: 'Rs.', label: 'Rs. — Pakistani Rupee' },
  { value: '₹', label: '₹ — Indian Rupee' },
  { value: '$', label: '$ — US Dollar' },
  { value: '€', label: '€ — Euro' },
  { value: '£', label: '£ — British Pound' },
  { value: '₦', label: '₦ — Nigerian Naira' },
  { value: 'KSh', label: 'KSh — Kenyan Shilling' },
];

const ProfileStep = ({ user, setUser, onNext, onBack }) => {
  const [businessName, setBusinessName] = useState(user?.businessName || '');
  const [businessType, setBusinessType] = useState(
    user?.businessType || 'micro-finance',
  );
  const [currency, setCurrency] = useState(user?.currency || 'Rs.');
  const [error, setError] = useState('');

  const handleContinue = async () => {
    const name = businessName.trim();
    if (!name) {
      setError('Business name is required');
      return;
    }
    try {
      const { data } = await api.put('/auth/updatedetails', {
        businessName: name,
        businessType,
        currency,
      });
      setUser((prev) => ({ ...prev, ...data }));
      window.dispatchEvent(new Event('userUpdated'));
      onNext();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save business profile');
    }
  };

  return (
    <StepFrame
      icon={Building2}
      eyebrow="Step 1 · Business profile"
      title="Tell us about your business"
      description="This is how your business appears to your team and members across the platform."
      onPrimary={handleContinue}
      onBack={onBack}
    >
      <FormField label="Business name" htmlFor="biz-name" required error={error}>
        <Input
          id="biz-name"
          value={businessName}
          onChange={(e) => {
            setBusinessName(e.target.value);
            if (error) setError('');
          }}
          placeholder="e.g. Horizon Micro-finance"
          className="h-12 rounded-xl"
        />
      </FormField>

      <FormField label="Business type" htmlFor="biz-type">
        <PillSelect
          value={businessType}
          onValueChange={setBusinessType}
          options={BUSINESS_TYPES}
          className="h-12 w-full rounded-xl"
        />
      </FormField>

      <FormField
        label="Default currency"
        htmlFor="biz-currency"
        hint="Used to format every amount across your dashboard and reports."
      >
        <PillSelect
          value={currency}
          onValueChange={setCurrency}
          options={CURRENCIES}
          className="h-12 w-full rounded-xl"
        />
      </FormField>
    </StepFrame>
  );
};

export default ProfileStep;
