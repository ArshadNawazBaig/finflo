/* eslint-disable react/prop-types -- project convention: no propTypes */
import { useState } from 'react';
import { IdCard } from 'lucide-react';
import api from '@/lib/axios';
import StepFrame from '../../business/StepFrame';
import CnicUploadTile from './CnicUploadTile';

const DocumentsStep = ({ member, setMember, onNext, onBack }) => {
  // Already-on-file Cloudinary URLs for each side (e.g. resuming onboarding).
  const docUrl = (name) =>
    member?.documents?.find((d) => d.type === 'CNIC' && d.name === name)?.url ||
    '';
  const existingFront = docUrl('CNIC Front');
  const existingBack = docUrl('CNIC Back');

  // Fresh base64 captures (null until the member picks an image this session).
  const [front, setFront] = useState(null);
  const [back, setBack] = useState(null);
  const [error, setError] = useState('');

  const canContinue = !!(front || existingFront) && !!(back || existingBack);

  const handleContinue = async () => {
    if (!canContinue) {
      setError('Please upload both the front and back of your CNIC.');
      return;
    }

    // Only send sides captured this session; existing ones stay untouched.
    const payload = {};
    if (front) payload.cnicFront = front;
    if (back) payload.cnicBack = back;
    if (Object.keys(payload).length === 0) {
      onNext();
      return;
    }

    try {
      const { data } = await api.put('/member-auth/updatedetails', payload);
      setMember((prev) => ({ ...prev, ...(data?.data || {}) }));
      window.dispatchEvent(new Event('memberUpdated'));
      onNext();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload your CNIC');
    }
  };

  return (
    <StepFrame
      icon={IdCard}
      eyebrow="Step 4 · Documents"
      title="Upload your CNIC"
      description="Upload clear photos of both sides of your CNIC. This is required to verify your identity — make sure the text is readable and the whole card is visible."
      onPrimary={handleContinue}
      onBack={onBack}
      primaryDisabled={!canContinue}
    >
      <div className="grid grid-cols-2 gap-4">
        <CnicUploadTile
          label="CNIC front"
          required
          preview={front || existingFront}
          onSelect={(dataUrl) => {
            setFront(dataUrl);
            setError('');
          }}
        />
        <CnicUploadTile
          label="CNIC back"
          required
          preview={back || existingBack}
          onSelect={(dataUrl) => {
            setBack(dataUrl);
            setError('');
          }}
        />
      </div>

      {error && (
        <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">
          {error}
        </p>
      )}
    </StepFrame>
  );
};

export default DocumentsStep;
