/* eslint-disable react/prop-types -- project convention: no propTypes */
import { useState } from 'react';
import { PenLine } from 'lucide-react';
import api from '@/lib/axios';
import SignaturePad from '@/components/ui/SignaturePad';
import StepFrame from '../../business/StepFrame';

const SignatureStep = ({ member, setMember, onNext, onBack }) => {
  // A captured signature is a fresh base64 data URL; an existing one is a saved
  // Cloudinary URL. Either satisfies the requirement.
  const [pendingSignature, setPendingSignature] = useState(null);
  const [error, setError] = useState('');

  const hasExisting = !!member?.signature;
  const canContinue = !!pendingSignature || hasExisting;

  const handleContinue = async () => {
    if (!canContinue) {
      setError('Please draw or upload your signature, then tap Finalize.');
      return;
    }
    // No new capture but an existing signature is on file — keep it.
    if (!pendingSignature) {
      onNext();
      return;
    }
    try {
      // Saved to Cloudinary by the server; we get back the secure URL.
      const { data } = await api.put('/member-auth/updatedetails', {
        signature: pendingSignature,
      });
      setMember((prev) => ({ ...prev, ...(data?.data || {}) }));
      window.dispatchEvent(new Event('memberUpdated'));
      onNext();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save your signature');
    }
  };

  return (
    <StepFrame
      icon={PenLine}
      eyebrow="Step 3 · Signature"
      title="Add your signature"
      description="Your signature is kept on file for your account and loan documents. Draw it below or upload an image, then tap Finalize."
      onPrimary={handleContinue}
      onBack={onBack}
      primaryDisabled={!canContinue}
    >
      <SignaturePad
        onSave={(dataUrl) => {
          setPendingSignature(dataUrl);
          setError('');
        }}
        onClear={() => setPendingSignature(null)}
      />

      {hasExisting && !pendingSignature && (
        <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
          A signature is already on file — you can continue or capture a new one.
        </p>
      )}
      {error && (
        <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">
          {error}
        </p>
      )}
    </StepFrame>
  );
};

export default SignatureStep;
