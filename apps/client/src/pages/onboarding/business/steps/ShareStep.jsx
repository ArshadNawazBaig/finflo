/* eslint-disable react/prop-types -- project convention: no propTypes */
import { useState } from 'react';
import { Share2, Copy, Check, KeyRound, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import StepFrame from '../StepFrame';

const ShareStep = ({ user, onNext, onBack }) => {
  const [copied, setCopied] = useState('');
  const securityCode = user?.securityCode || '';
  const registrationLink = securityCode
    ? `${window.location.origin}/join/${securityCode}`
    : '';

  const copy = async (value, key) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(''), 2000);
    } catch {
      toast.error('Could not copy');
    }
  };

  return (
    <StepFrame
      icon={Share2}
      eyebrow="Step 6 · Invite your members"
      title="Share your member portal"
      description="Members use your security code or registration link to request access to your portal. You'll approve them from the Verification Queue."
      onPrimary={onNext}
      onBack={onBack}
    >
      {/* Security code */}
      <div className="rounded-2xl border border-slate-100 bg-slate-50/40 p-4 dark:border-white/[0.06] dark:bg-white/[0.02]">
        <div className="mb-2 flex items-center gap-2">
          <KeyRound size={14} className="text-primary" />
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
            Business security code
          </p>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="font-mono text-lg font-extrabold tracking-[0.2em] text-slate-900 dark:text-white">
            {securityCode || '••••••'}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!securityCode}
            onClick={() => copy(securityCode, 'code')}
            className="h-9 gap-2 rounded-full px-3"
          >
            {copied === 'code' ? <Check size={14} /> : <Copy size={14} />}
            {copied === 'code' ? 'Copied' : 'Copy'}
          </Button>
        </div>
      </div>

      {/* Registration link */}
      <div className="rounded-2xl border border-slate-100 bg-slate-50/40 p-4 dark:border-white/[0.06] dark:bg-white/[0.02]">
        <div className="mb-2 flex items-center gap-2">
          <Link2 size={14} className="text-primary" />
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
            Registration link
          </p>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-slate-600 dark:text-slate-300">
            {registrationLink || 'Generating…'}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!registrationLink}
            onClick={() => copy(registrationLink, 'link')}
            className="h-9 shrink-0 gap-2 rounded-full px-3"
          >
            {copied === 'link' ? <Check size={14} /> : <Copy size={14} />}
            {copied === 'link' ? 'Copied' : 'Copy'}
          </Button>
        </div>
      </div>

      <p className="text-[12px] font-medium text-slate-400 dark:text-slate-500">
        Tip: you can always find these again under Settings → Member registration.
      </p>
    </StepFrame>
  );
};

export default ShareStep;
