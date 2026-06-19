/* eslint-disable react/prop-types -- project convention: no propTypes */
import { useState } from 'react';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Inner frame every onboarding step renders into: an icon chip + eyebrow +
 * title + description header, the form body (children), and a footer with
 * Back / Skip / primary-action buttons. The primary button manages its own
 * loading state by awaiting `onPrimary` (which performs the step's API write).
 */
const StepFrame = ({
  icon: Icon,
  eyebrow,
  title,
  description,
  children,
  onPrimary,
  primaryLabel = 'Continue',
  primaryDisabled = false,
  onBack,
  showBack = true,
  onSkip,
  skipLabel = 'Skip for now',
}) => {
  const [submitting, setSubmitting] = useState(false);

  const handlePrimary = async () => {
    if (!onPrimary || submitting) return;
    try {
      setSubmitting(true);
      await onPrimary();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex w-full max-w-xl flex-col">
      {/* Header */}
      <div className="space-y-4">
        {Icon && (
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary [&_svg]:h-5 [&_svg]:w-5">
            <Icon strokeWidth={2.25} />
          </div>
        )}
        {eyebrow && (
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
            {eyebrow}
          </p>
        )}
        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold leading-tight tracking-[-0.03em] text-slate-900 dark:text-white sm:text-3xl">
            {title}
          </h1>
          {description && (
            <p className="text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
              {description}
            </p>
          )}
        </div>
      </div>

      {/* Body */}
      {children && <div className="mt-8 space-y-5">{children}</div>}

      {/* Footer */}
      <div className="mt-10 flex items-center justify-between gap-3">
        <div>
          {showBack && onBack && (
            <Button
              type="button"
              variant="ghost"
              onClick={onBack}
              disabled={submitting}
              className="h-11 gap-2 rounded-full px-4 text-slate-500 hover:text-slate-900 dark:hover:text-white"
            >
              <ArrowLeft size={16} />
              Back
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onSkip && (
            <Button
              type="button"
              variant="ghost"
              onClick={onSkip}
              disabled={submitting}
              className="h-11 rounded-full px-4 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            >
              {skipLabel}
            </Button>
          )}
          <Button
            type="button"
            onClick={handlePrimary}
            disabled={primaryDisabled || submitting}
            className="h-11 min-w-[8.5rem] gap-2 rounded-full bg-primary px-6 font-bold text-white shadow-[0_10px_30px_-10px_rgba(99,102,241,0.5)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-primary/90"
          >
            {submitting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <>
                {primaryLabel}
                <ArrowRight size={16} />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default StepFrame;
