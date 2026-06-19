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

  // Warm the profile avatar in the background while the user is in setup.
  // Google sign-up stores Google's CDN URL first, then mirrors it to Cloudinary
  // a few seconds later. Poll until the mirrored (cloudinary) URL lands, push it
  // into the cached user, and preload the image — so the dashboard shows the
  // avatar instantly instead of a rate-limited Google hotlink that 429s.
  useEffect(() => {
    let active = true;
    let attempts = 0;
    let timer;

    const preload = (url) => {
      if (url) {
        const img = new Image();
        img.src = url;
      }
    };
    const isMirrored = (url) =>
      typeof url === 'string' && url.includes('res.cloudinary.com');

    const tick = async () => {
      if (!active) return;
      attempts += 1;
      try {
        const { data: me } = await api.get('/auth/me');
        if (!active) return;
        if (me?.profilePicture) {
          setUser((prev) => ({ ...prev, profilePicture: me.profilePicture }));
          preload(me.profilePicture);
          if (isMirrored(me.profilePicture)) return; // mirror done — stop
        }
      } catch {
        /* best-effort — ignore */
      }
      if (active && attempts < 5) timer = setTimeout(tick, 3000);
    };

    // Small initial delay so the server-side mirror has a moment to start.
    timer = setTimeout(tick, 2000);
    return () => {
      active = false;
      clearTimeout(timer);
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
