/* eslint-disable react/prop-types -- project convention: no propTypes */
import { useState } from 'react';
import { Users } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/axios';
import { Input } from '@/components/ui/input';
import FormField from '@/components/ui/FormField';
import StepFrame from '../../business/StepFrame';

const NomineeStep = ({ member, setMember, onNext, onBack, onSkip }) => {
  const [name, setName] = useState(member?.nominee?.name || '');
  const [cnic, setCnic] = useState(member?.nominee?.cnic || '');
  const [relation, setRelation] = useState(member?.nominee?.relation || '');

  const handleContinue = async () => {
    const nominee = {};
    if (name.trim()) nominee.name = name.trim();
    if (cnic.trim()) nominee.cnic = cnic.trim();
    if (relation.trim()) nominee.relation = relation.trim();

    // Nothing entered — treat Continue like a skip.
    if (Object.keys(nominee).length === 0) {
      onNext();
      return;
    }

    try {
      const { data } = await api.put('/member-auth/updatedetails', { nominee });
      setMember((prev) => ({ ...prev, ...(data?.data || {}) }));
      window.dispatchEvent(new Event('memberUpdated'));
      onNext();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save your nominee');
    }
  };

  return (
    <StepFrame
      icon={Users}
      eyebrow="Step 4 · Nominee (optional)"
      title="Add a nominee"
      description="A nominee is the person who can claim your account in your absence. This step is optional — you can add or change it anytime in Settings."
      onPrimary={handleContinue}
      onBack={onBack}
      onSkip={onSkip}
    >
      <FormField label="Nominee name" htmlFor="nominee-name">
        <Input
          id="nominee-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Full name"
          className="h-12 rounded-xl"
        />
      </FormField>

      <FormField label="Nominee CNIC" htmlFor="nominee-cnic">
        <Input
          id="nominee-cnic"
          value={cnic}
          onChange={(e) => setCnic(e.target.value)}
          placeholder="e.g. 35202-1234567-8"
          className="h-12 rounded-xl"
        />
      </FormField>

      <FormField label="Relationship" htmlFor="nominee-relation">
        <Input
          id="nominee-relation"
          value={relation}
          onChange={(e) => setRelation(e.target.value)}
          placeholder="e.g. Spouse, Parent, Sibling"
          className="h-12 rounded-xl"
        />
      </FormField>
    </StepFrame>
  );
};

export default NomineeStep;
