/* eslint-disable react/prop-types -- project convention: no propTypes */
import { useState } from 'react';
import { WalletMinimal } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/axios';
import { Input } from '@/components/ui/input';
import FormField from '@/components/ui/FormField';
import PillSelect from '@/components/ui/PillSelect';
import StepFrame from '../StepFrame';

const INTEREST_TYPES = [
  { value: 'simple', label: 'Simple interest' },
  { value: 'emi', label: 'EMI (equal instalments)' },
  { value: 'compound', label: 'Compound interest' },
];

const LoanProductStep = ({ user, onNext, onBack, onSkip }) => {
  const [name, setName] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [duration, setDuration] = useState('');
  const [interestType, setInterestType] = useState('simple');
  const [errors, setErrors] = useState({});

  const handleContinue = async () => {
    const next = {};
    if (!name.trim()) next.name = 'Product name is required';
    if (interestRate === '' || isNaN(parseFloat(interestRate)))
      next.interestRate = 'Enter a valid rate';
    if (duration === '' || isNaN(parseInt(duration, 10)))
      next.duration = 'Enter a valid duration';
    if (Object.keys(next).length) {
      setErrors(next);
      return;
    }
    try {
      await api.post('/loan-products', {
        name: name.trim(),
        interestRate: parseFloat(interestRate),
        duration: parseInt(duration, 10),
        interestType,
      });
      toast.success('Loan product created');
      onNext();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create loan product');
    }
  };

  const currency = user?.currency || 'Rs.';

  return (
    <StepFrame
      icon={WalletMinimal}
      eyebrow="Step 4 · First loan product"
      title="Define a loan product"
      description="Set up one product so you can issue loans right away. You can add more — with custom rates and cycles — anytime."
      onPrimary={handleContinue}
      primaryLabel="Create product"
      onBack={onBack}
      onSkip={onSkip}
    >
      <FormField label="Product name" htmlFor="lp-name" required error={errors.name}>
        <Input
          id="lp-name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setErrors((p) => ({ ...p, name: undefined }));
          }}
          placeholder="e.g. Standard Business Loan"
          className="h-12 rounded-xl"
        />
      </FormField>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <FormField
          label="Interest rate (%)"
          htmlFor="lp-rate"
          required
          error={errors.interestRate}
        >
          <Input
            id="lp-rate"
            type="number"
            inputMode="decimal"
            value={interestRate}
            onChange={(e) => {
              setInterestRate(e.target.value);
              setErrors((p) => ({ ...p, interestRate: undefined }));
            }}
            placeholder="10"
            className="h-12 rounded-xl"
          />
        </FormField>

        <FormField
          label="Duration (months)"
          htmlFor="lp-duration"
          required
          error={errors.duration}
        >
          <Input
            id="lp-duration"
            type="number"
            inputMode="numeric"
            value={duration}
            onChange={(e) => {
              setDuration(e.target.value);
              setErrors((p) => ({ ...p, duration: undefined }));
            }}
            placeholder="12"
            className="h-12 rounded-xl"
          />
        </FormField>
      </div>

      <FormField
        label="Interest type"
        htmlFor="lp-type"
        hint={`Amounts will display in ${currency}.`}
      >
        <PillSelect
          value={interestType}
          onValueChange={setInterestType}
          options={INTEREST_TYPES}
          className="h-12 w-full rounded-xl"
        />
      </FormField>
    </StepFrame>
  );
};

export default LoanProductStep;
