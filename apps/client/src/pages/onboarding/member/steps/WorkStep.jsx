/* eslint-disable react/prop-types -- project convention: no propTypes */
import { useState } from 'react';
import { Briefcase } from 'lucide-react';
import api from '@/lib/axios';
import { Input } from '@/components/ui/input';
import FormField from '@/components/ui/FormField';
import StepFrame from '../../business/StepFrame';

const WorkStep = ({ member, setMember, onNext, onBack }) => {
  const [job, setJob] = useState(member?.job || '');
  const [jobDetail, setJobDetail] = useState(member?.jobDetail || '');
  const [monthlyIncome, setMonthlyIncome] = useState(
    member?.monthlyIncome != null ? String(member.monthlyIncome) : '',
  );
  const [error, setError] = useState('');

  const canContinue = job.trim() && monthlyIncome !== '';

  const handleContinue = async () => {
    if (!job.trim()) {
      setError('Occupation is required.');
      return;
    }
    if (monthlyIncome === '' || Number(monthlyIncome) < 0) {
      setError('Enter a valid monthly income.');
      return;
    }

    const payload = {
      job: job.trim(),
      monthlyIncome,
    };
    if (jobDetail.trim()) payload.jobDetail = jobDetail.trim();

    try {
      const { data } = await api.put('/member-auth/updatedetails', payload);
      setMember((prev) => ({ ...prev, ...(data?.data || {}) }));
      window.dispatchEvent(new Event('memberUpdated'));
      onNext();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save your details');
    }
  };

  return (
    <StepFrame
      icon={Briefcase}
      eyebrow="Step 2 · Work & income"
      title="Tell us what you do"
      description="This helps your lender assess products and limits that suit you."
      onPrimary={handleContinue}
      onBack={onBack}
      primaryDisabled={!canContinue}
    >
      <FormField label="Occupation" htmlFor="member-job" required>
        <Input
          id="member-job"
          value={job}
          onChange={(e) => {
            setJob(e.target.value);
            if (error) setError('');
          }}
          placeholder="e.g. Shopkeeper, Teacher, Farmer"
          className="h-12 rounded-xl"
        />
      </FormField>

      <FormField
        label="Employer / business"
        htmlFor="member-job-detail"
        hint="Optional — where you work or your business name."
      >
        <Input
          id="member-job-detail"
          value={jobDetail}
          onChange={(e) => setJobDetail(e.target.value)}
          placeholder="e.g. Al-Madina General Store"
          className="h-12 rounded-xl"
        />
      </FormField>

      <FormField
        label="Monthly income"
        htmlFor="member-income"
        required
        error={error}
      >
        <Input
          id="member-income"
          type="number"
          min="0"
          step="any"
          inputMode="numeric"
          value={monthlyIncome}
          onChange={(e) => {
            setMonthlyIncome(e.target.value);
            if (error) setError('');
          }}
          placeholder="e.g. 50000"
          className="h-12 rounded-xl"
        />
      </FormField>
    </StepFrame>
  );
};

export default WorkStep;
