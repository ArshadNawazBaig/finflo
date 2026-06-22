/* eslint-disable react/prop-types -- project convention: no propTypes */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAtom } from 'jotai';
import { memberAtom } from '@/atoms';
import api from '@/lib/axios';
import WizardShell from '../business/WizardShell';
import WelcomeStep from './steps/WelcomeStep';
import ProfileStep from './steps/ProfileStep';
import WorkStep from './steps/WorkStep';
import SignatureStep from './steps/SignatureStep';
import DocumentsStep from './steps/DocumentsStep';
import NomineeStep from './steps/NomineeStep';
import PinStep from './steps/PinStep';
import DoneStep from './steps/DoneStep';
import { memberOnboardedKey } from '@/lib/onboarding';

const STEPS = [
  WelcomeStep,
  ProfileStep,
  WorkStep,
  SignatureStep,
  DocumentsStep,
  NomineeStep,
  PinStep,
  DoneStep,
];
const TOTAL = STEPS.length;

// Roadmap labels shown in the brand panel (the middle steps; Welcome/Done excluded).
const ROADMAP = [
  'Your profile',
  'Work & income',
  'Signature',
  'Documents',
  'Nominee',
  'Security PIN',
];

const MemberSetupWizard = () => {
  const navigate = useNavigate();
  const [member, setMember] = useAtom(memberAtom);
  const [step, setStep] = useState(0);

  // Hydrate the latest member and resume from the last persisted step.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [{ data: me }, { data: status }] = await Promise.all([
          api.get('/member-auth/me'),
          api.get('/member-auth/onboarding'),
        ]);
        if (!active) return;
        setMember((prev) => ({ ...prev, ...me }));
        if (status?.isCompleted) {
          localStorage.setItem(memberOnboardedKey(me?._id), '1');
          navigate('/member/dashboard', { replace: true });
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
    api.put('/member-auth/onboarding', { currentStep: nextStep }).catch(() => {});
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

  const complete = useCallback(async () => {
    try {
      await api.put('/member-auth/onboarding', {
        isCompleted: true,
        currentStep: TOTAL,
      });
    } catch {
      /* best-effort — proceed to the dashboard regardless */
    }
    localStorage.setItem(memberOnboardedKey(member?._id), '1');
    navigate('/member/dashboard', { replace: true });
  }, [navigate, member?._id]);

  const StepComponent = STEPS[step];

  return (
    <WizardShell
      roadmap={ROADMAP}
      activeIndex={step - 1}
      eyebrow="Account setup"
      heading={
        <>
          Welcome to your{' '}
          <span className="text-gradient-primary">member</span> portal.
        </>
      }
      subtext="A few quick steps to set up your profile and secure your account — you can change everything later in Settings."
      footer="Your money, managed with confidence"
    >
      <StepComponent
        member={member}
        setMember={setMember}
        onNext={goNext}
        onBack={goBack}
        onSkip={goNext}
        onComplete={complete}
      />
    </WizardShell>
  );
};

export default MemberSetupWizard;
