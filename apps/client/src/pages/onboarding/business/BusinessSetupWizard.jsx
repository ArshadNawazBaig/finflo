/* eslint-disable react/prop-types -- project convention: no propTypes */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAtom } from 'jotai';
import { userAtom } from '@/atoms';
import api from '@/lib/axios';
import WizardShell from './WizardShell';
import WelcomeStep from './steps/WelcomeStep';
import ProfileStep from './steps/ProfileStep';
import BrandingStep from './steps/BrandingStep';
import BranchStep from './steps/BranchStep';
import LoanProductStep from './steps/LoanProductStep';
import TeamStep from './steps/TeamStep';
import ShareStep from './steps/ShareStep';
import DoneStep from './steps/DoneStep';
import { bizOnboardedKey } from '@/lib/onboarding';

const STEPS = [
  WelcomeStep,
  ProfileStep,
  BrandingStep,
  BranchStep,
  LoanProductStep,
  TeamStep,
  ShareStep,
  DoneStep,
];
const TOTAL = STEPS.length;

// Roadmap labels shown in the brand panel (steps 1–6; Welcome/Done excluded).
const ROADMAP = [
  'Business profile',
  'Branding',
  'First branch',
  'Loan product',
  'Team',
  'Invite members',
];

const BusinessSetupWizard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useAtom(userAtom);
  const [step, setStep] = useState(0);

  // Hydrate the latest user (securityCode, plan, businessName…) and resume from
  // the last persisted step. The login response omits some of these fields.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [{ data: me }, { data: status }] = await Promise.all([
          api.get('/auth/me'),
          api.get('/auth/onboarding'),
        ]);
        if (!active) return;
        setUser((prev) => ({ ...prev, ...me }));
        if (status?.isCompleted) {
          localStorage.setItem(bizOnboardedKey(me?._id), '1');
          navigate('/dashboard', { replace: true });
          return;
        }
        const resume = Number(status?.currentStep) || 0;
        if (resume > 0 && resume < TOTAL) setStep(resume);
      } catch {
        /* offline / error — start from the beginning */
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persist = useCallback((nextStep) => {
    // Best-effort progress save so onboarding resumes where it left off.
    api.put('/auth/onboarding', { currentStep: nextStep }).catch(() => {});
  }, []);

  const goNext = useCallback(() => {
    setStep((s) => {
      const next = Math.min(s + 1, TOTAL - 1);
      persist(next);
      return next;
    });
  }, [persist]);

  const goBack = useCallback(() => {
    setStep((s) => Math.max(s - 1, 0));
  }, []);

  const complete = useCallback(
    async (opts = {}) => {
      try {
        await api.put('/auth/onboarding', {
          isCompleted: true,
          currentStep: TOTAL,
        });
      } catch {
        /* best-effort — proceed to the dashboard regardless */
      }
      localStorage.setItem(bizOnboardedKey(user?._id), '1');
      if (opts?.tour) sessionStorage.setItem('finflo_pending_tour', '1');
      navigate('/dashboard', { replace: true });
    },
    [navigate, user?._id],
  );

  const StepComponent = STEPS[step];

  return (
    <WizardShell roadmap={ROADMAP} activeIndex={step - 1}>
      <StepComponent
        user={user}
        setUser={setUser}
        onNext={goNext}
        onBack={goBack}
        onSkip={goNext}
        onComplete={complete}
      />
    </WizardShell>
  );
};

export default BusinessSetupWizard;
