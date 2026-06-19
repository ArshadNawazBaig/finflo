/* eslint-disable react/prop-types -- project convention: no propTypes */
import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '@/lib/axios';

const OnboardingGuide = ({ steps, userId, role, autoStart = true }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [targetRect, setTargetRect] = useState(null);
  const [borderRadius, setBorderRadius] = useState('0px');
  const navigate = useNavigate();
  const location = useLocation();
  const observerRef = useRef(null);

  // Determine which API endpoint to use based on role.
  // Note: axios baseURL already includes '/api', so paths start after that.
  const onboardingEndpoint =
    role === 'member' ? '/member-auth/onboarding' : '/auth/onboarding';

  // Auto-show the tour on first run from the DB status. Skipped when
  // `autoStart` is false (business admins onboard via the setup wizard instead,
  // and re-trigger this tour manually — see the effect below).
  useEffect(() => {
    if (!autoStart || !userId || !steps || steps.length === 0) return;
    const fetchStatus = async () => {
      try {
        const { data } = await api.get(onboardingEndpoint);
        if (!data.isCompleted) {
          // Resume from last saved step
          if (data.currentStep > 0 && data.currentStep < steps.length) {
            const resumeStep = steps[data.currentStep];
            if (resumeStep?.path) navigate(resumeStep.path);
            setCurrentStep(data.currentStep);
          }
          const timer = setTimeout(() => setIsVisible(true), 1500);
          return () => clearTimeout(timer);
        }
      } catch (err) {
        // Fallback: show guide if fetch fails (e.g. network issues)
        console.error('Onboarding fetch error:', err);
        const timer = setTimeout(() => setIsVisible(true), 1500);
        return () => clearTimeout(timer);
      }
    };
    fetchStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, onboardingEndpoint, autoStart]);

  // Manual start: a `finflo:start-tour` event ("Take a tour"), or a pending
  // flag set right before navigating here from the setup wizard.
  useEffect(() => {
    if (!steps || steps.length === 0) return;
    const start = () => {
      setCurrentStep(0);
      setIsVisible(true);
    };
    let timer;
    if (sessionStorage.getItem('finflo_pending_tour') === '1') {
      sessionStorage.removeItem('finflo_pending_tour');
      timer = setTimeout(start, 800);
    }
    window.addEventListener('finflo:start-tour', start);
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener('finflo:start-tour', start);
    };
  }, [steps]);

  const updateTargetRect = () => {
    if (!isVisible || !steps[currentStep]) return;
    const step = steps[currentStep];
    if (step.elementId) {
      const element = document.querySelector(
        `[data-onboarding-id="${step.elementId}"]`,
      );
      if (element) {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);

        // Pad the rect slightly for a cleaner look
        const padding = 2;
        const paddedRect = {
          left: rect.left - padding,
          top: rect.top - padding,
          right: rect.right + padding,
          bottom: rect.bottom + padding,
          width: rect.width + padding * 2,
          height: rect.height + padding * 2,
        };

        setTargetRect(paddedRect);

        // Robust border radius parsing with capsule support
        const rawRadius = style.borderRadius.split(' ')[0] || '0px';
        let radius = parseFloat(rawRadius) || 0;

        if (rawRadius.includes('rem')) {
          const rootFontSize =
            parseFloat(getComputedStyle(document.documentElement).fontSize) ||
            16;
          radius *= rootFontSize;
        } else if (rawRadius.includes('%')) {
          radius = (Math.min(rect.width, rect.height) * radius) / 100;
        }

        // Cap radius to half of smallest dimension and add padding
        const maxRadius = Math.min(rect.width, rect.height) / 2;
        const finalRadius = Math.min(radius, maxRadius) + padding;

        setBorderRadius(`${finalRadius}px`);
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        setTargetRect(null);
        setBorderRadius('0px');
      }
    } else {
      setTargetRect(null);
      setBorderRadius('0px');
    }
  };

  useLayoutEffect(() => {
    updateTargetRect();
    const handleEvents = () => requestAnimationFrame(updateTargetRect);

    window.addEventListener('resize', handleEvents);
    window.addEventListener('scroll', handleEvents, true);

    observerRef.current = new MutationObserver(handleEvents);
    observerRef.current.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
    });

    return () => {
      window.removeEventListener('resize', handleEvents);
      window.removeEventListener('scroll', handleEvents, true);
      if (observerRef.current) observerRef.current.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, isVisible, location.pathname]);

  const handleNext = () => {
    const nextStep = currentStep + 1;
    if (nextStep < steps.length) {
      const step = steps[nextStep];
      if (step.path && location.pathname !== step.path) {
        navigate(step.path);
      }
      setCurrentStep(nextStep);
      // Persist progress to DB (fire-and-forget)
      api
        .put(onboardingEndpoint, { isCompleted: false, currentStep: nextStep })
        .catch(console.error);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    api
      .put(onboardingEndpoint, { isCompleted: true, currentStep })
      .catch(console.error);
    setIsVisible(false);
  };

  if (!isVisible || !steps || steps.length === 0) return null;

  const step = steps[currentStep];

  const getTooltipPosition = () => {
    if (!targetRect) {
      return {
        isCentered: true,
        top: '50%',
        left: '50%',
        x: '-50%',
        y: '-50%',
      };
    }

    const padding = 20;
    const tooltipWidth = 420;
    const tooltipHeight = 340; // Estimated height for content
    const { top, left, width, height, right, bottom } = targetRect;

    // Desktop: Advanced Placement
    if (window.innerWidth > 768) {
      // 1. Try RIGHT
      const isSidebar =
        step?.elementId?.includes('sidebar') ||
        step?.elementId === 'sidebar-settings';
      const sidePadding = isSidebar ? 100 : padding;
      if (right + tooltipWidth + sidePadding < window.innerWidth) {
        return {
          top: Math.max(
            padding,
            Math.min(
              window.innerHeight - tooltipHeight - padding,
              top + height / 2 - tooltipHeight / 2,
            ),
          ),
          left: right + sidePadding,
        };
      }

      // 2. Try LEFT
      if (left - tooltipWidth - padding > 0) {
        return {
          top: Math.max(
            padding,
            Math.min(
              window.innerHeight - tooltipHeight - padding,
              top + height / 2 - tooltipHeight / 2,
            ),
          ),
          left: left - tooltipWidth - padding,
        };
      }

      // 3. Try BOTTOM
      if (bottom + tooltipHeight + padding < window.innerHeight) {
        return {
          top: bottom + padding,
          left: Math.max(
            padding,
            Math.min(
              window.innerWidth - tooltipWidth - padding,
              left + width / 2 - tooltipWidth / 2,
            ),
          ),
        };
      }

      // 4. Try TOP
      if (top - tooltipHeight - padding > 0) {
        return {
          top: top - tooltipHeight - padding,
          left: Math.max(
            padding,
            Math.min(
              window.innerWidth - tooltipWidth - padding,
              left + width / 2 - tooltipWidth / 2,
            ),
          ),
        };
      }

      // Fallback: Center
      return {
        isCentered: true,
        top: '50%',
        left: '50%',
        x: '-50%',
        y: '-50%',
      };
    }

    // Mobile: Bottom/Top Overlay
    const isBottomHalf = bottom > window.innerHeight / 2;
    return {
      bottom: isBottomHalf ? window.innerHeight - top + padding : 'auto',
      top: isBottomHalf ? 'auto' : bottom + padding,
      left: '20px',
      right: '20px',
      width: 'auto',
      maxWidth: 'calc(100% - 40px)',
    };
  };

  const stepPos = getTooltipPosition();

  return (
    <div className="fixed inset-0 z-[200] pointer-events-none overflow-hidden">
      <AnimatePresence mode="wait">
        {isVisible && (
          <div className="absolute inset-0">
            {/* Modern SVG Spotlight Mask - Visual Only */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden">
              <defs>
                <mask id="onboarding-focal-mask">
                  <rect width="100%" height="100%" fill="white" />
                  {targetRect && (
                    <motion.rect
                      initial={false}
                      animate={{
                        x: targetRect.left,
                        y: targetRect.top,
                        width: targetRect.width,
                        height: targetRect.height,
                        rx: parseFloat(borderRadius) || 0,
                      }}
                      transition={{
                        type: 'spring',
                        damping: 25,
                        stiffness: 200,
                      }}
                      fill="black"
                    />
                  )}
                </mask>
              </defs>
              <rect
                width="100%"
                height="100%"
                fill="rgba(2, 6, 23, 0.75)"
                mask="url(#onboarding-focal-mask)"
              />
            </svg>

            {/* Interactive Overlay — captures backdrop clicks (so the page
                behind isn't interactable) but does NOT dismiss the guide.
                The guide only closes via the Skip/Close or finish buttons.
                The highlighted item stays clickable through the clipPath hole. */}
            <div
              className="absolute inset-0 pointer-events-auto cursor-default"
              style={{
                clipPath: targetRect
                  ? `polygon(0% 0%, 0% 100%, ${targetRect.left}px 100%, ${targetRect.left}px ${targetRect.top}px, ${targetRect.right}px ${targetRect.top}px, ${targetRect.right}px ${targetRect.bottom}px, ${targetRect.left}px ${targetRect.bottom}px, ${targetRect.left}px 100%, 100% 100%, 100% 0%)`
                  : 'none',
              }}
            />

            {/* Premium Focal Highlights */}
            <AnimatePresence>
              {targetRect && (
                <motion.div
                  key="highlight"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    top: targetRect.top,
                    left: targetRect.left,
                    width: targetRect.width,
                    height: targetRect.height,
                  }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                  className="absolute pointer-events-none z-[201]"
                >
                  {/* Precise Focus Ring */}
                  <div
                    className="absolute inset-0 border-2 border-primary shadow-[0_0_10px_rgba(var(--primary),0.3)]"
                    style={{ borderRadius: parseFloat(borderRadius) || 0 }}
                  />

                  {/* Glassy Overlay for "Exactly Like Button" feel */}
                  <div
                    className="absolute inset-0 bg-primary/5"
                    style={{ borderRadius: parseFloat(borderRadius) || 0 }}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Professional Tooltip Container */}
            <motion.div
              key={`tooltip-${currentStep}`}
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{
                opacity: 1,
                scale: 1,
                y: stepPos.isCentered ? stepPos.y : 0,
                x: stepPos.isCentered ? stepPos.x : 0,
              }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              transition={{
                type: 'spring',
                damping: 20,
                stiffness: 150,
                delay: 0.1,
              }}
              className="absolute pointer-events-auto bg-white dark:bg-slate-900 border border-border/50 rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] dark:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] z-[202] overflow-hidden"
              style={{
                width: window.innerWidth < 768 ? 'auto' : '420px',
                ...stepPos,
              }}
            >
              {/* Animated Progress Bar */}
              <div className="absolute top-0 left-0 w-full h-[3px] bg-white/5 overflow-hidden rounded-t-[2.5rem]">
                <motion.div
                  className="h-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{
                    width: `${((currentStep + 1) / steps.length) * 100}%`,
                  }}
                  transition={{ duration: 0.6, ease: 'circOut' }}
                />
              </div>

              <div className="p-8 pb-6 sm:p-10 sm:pb-7 space-y-5 overflow-hidden min-w-[350px]">
                <div className="flex items-start justify-between">
                  <motion.div
                    initial={{ rotate: -15, scale: 0.8 }}
                    animate={{ rotate: 0, scale: 1 }}
                    className="w-14 h-14 rounded-3xl bg-primary/10 flex items-center justify-center text-primary shadow-lg shadow-primary/5"
                  >
                    {step.icon}
                  </motion.div>
                  <button
                    onClick={handleComplete}
                    className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 hover:text-primary transition-all px-4 py-2 rounded-full hover:bg-primary/5 border border-border/10 flex items-center gap-2 group"
                  >
                    Skip <X size={14} className="group-hover:rotate-90 transition-transform" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="text-[10px] font-black uppercase tracking-widest text-primary px-3 py-1 rounded-full bg-primary/10 border border-primary/10">
                      Step {currentStep + 1}
                    </div>
                  </div>
                  <h4 className="font-black text-2xl tracking-tighter text-foreground leading-[1.1]">
                    {step.title}
                  </h4>
                  <p className="text-xs font-semibold text-muted-foreground/80 leading-relaxed">
                    {step.description}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-border/10">
                  <div className="flex gap-1.5 flex-wrap justify-center w-full">
                    {steps.map((_, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          'h-1.5 rounded-full transition-all duration-500',
                          idx === currentStep
                            ? 'bg-primary w-6'
                            : 'bg-primary/10 w-1.5',
                        )}
                      />
                    ))}
                  </div>
                  <div className="flex gap-3 justify-between w-full items-center">
                    {currentStep > 0 ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleBack}
                        className="h-10 text-[10px] font-black uppercase tracking-[0.2em] px-5 rounded-full border border-primary/10"
                      >
                        <ChevronLeft size={14} className="mr-1" /> Back
                      </Button>
                    ) : (
                      <div />
                    )}
                    <Button
                      variant="gradient"
                      size="sm"
                      onClick={handleNext}
                      className="h-10 text-[10px] font-black uppercase tracking-[0.2em] px-6 rounded-full shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-shadow"
                    >
                      {currentStep === steps.length - 1 ? (
                        <>
                          Finish <Sparkles size={14} className="ml-2" />
                        </>
                      ) : (
                        <>
                          Next <ChevronRight size={14} className="ml-2" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default OnboardingGuide;
