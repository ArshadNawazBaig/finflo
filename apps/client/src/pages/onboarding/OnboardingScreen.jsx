import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ChevronRight } from 'lucide-react';
import OnboardingSlide from './OnboardingSlide';
import { memberSlides, businessSlides } from './onboardingData';
import { APP_MODE } from '@/lib/constants';
import Logo from '@/components/Logo';

const SWIPE_THRESHOLD = 50;

const OnboardingScreen = ({ onComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isDragging = useRef(false);

  const slides = APP_MODE === 'member' ? memberSlides : businessSlides;
  const isLastSlide = currentIndex === slides.length - 1;

  const completeOnboarding = useCallback(() => {
    localStorage.setItem('onboarding_complete', 'true');
    if (onComplete) {
      onComplete();
    }
  }, [onComplete]);

  const skipOnboarding = useCallback(() => {
    completeOnboarding();
  }, [completeOnboarding]);

  const goToNext = useCallback(() => {
    if (isLastSlide) {
      completeOnboarding();
    } else {
      setDirection(1);
      setCurrentIndex((prev) => prev + 1);
    }
  }, [isLastSlide, completeOnboarding]);

  const goToPrev = useCallback(() => {
    if (currentIndex > 0) {
      setDirection(-1);
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex]);

  const goToSlide = useCallback((index) => {
    setDirection(index > currentIndex ? 1 : -1);
    setCurrentIndex(index);
  }, [currentIndex]);

  // Touch handling for swipe gestures
  const handleTouchStart = useCallback((e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isDragging.current = true;
  }, []);

  const handleTouchEnd = useCallback((e) => {
    if (!isDragging.current) return;
    isDragging.current = false;

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const deltaX = touchStartX.current - touchEndX;
    const deltaY = Math.abs(touchStartY.current - touchEndY);

    // Only horizontal swipes (deltaX > deltaY)
    if (Math.abs(deltaX) > SWIPE_THRESHOLD && Math.abs(deltaX) > deltaY) {
      if (deltaX > 0) {
        // Swiped left → next
        goToNext();
      } else {
        // Swiped right → prev
        goToPrev();
      }
    }
  }, [goToNext, goToPrev]);

  // Mouse drag for desktop testing
  const mouseStartX = useRef(0);
  const handleMouseDown = useCallback((e) => {
    mouseStartX.current = e.clientX;
    isDragging.current = true;
  }, []);

  const handleMouseUp = useCallback((e) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    const deltaX = mouseStartX.current - e.clientX;
    if (Math.abs(deltaX) > SWIPE_THRESHOLD) {
      if (deltaX > 0) goToNext();
      else goToPrev();
    }
  }, [goToNext, goToPrev]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') goToNext();
      if (e.key === 'ArrowLeft') goToPrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNext, goToPrev]);

  const currentSlide = slides[currentIndex];

  // Slide animation variants
  const slideVariants = {
    enter: (dir) => ({
      x: dir > 0 ? '100%' : '-100%',
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir) => ({
      x: dir > 0 ? '-100%' : '100%',
      opacity: 0,
    }),
  };

  return (
    <div
      className="fixed inset-0 z-[9999] bg-background flex flex-col overflow-hidden select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
    >
      {/* Dynamic background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          key={`glow-1-${currentIndex}`}
          className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full blur-[120px]"
          style={{ backgroundColor: currentSlide.gradientFrom }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.08, scale: 1 }}
          transition={{ duration: 0.8 }}
        />
        <motion.div
          key={`glow-2-${currentIndex}`}
          className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full blur-[120px]"
          style={{ backgroundColor: currentSlide.gradientTo }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.06, scale: 1 }}
          transition={{ duration: 0.8 }}
        />
      </div>

      {/* Header: Logo + Skip */}
      <motion.div
        className="relative z-20 flex items-center justify-between px-6 pt-14 pb-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="scale-[0.85] origin-left">
          <Logo showText={true} />
        </div>
        {!isLastSlide && (
          <button
            onClick={skipOnboarding}
            className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-full hover:bg-muted/50"
          >
            Skip
          </button>
        )}
      </motion.div>

      {/* Slide Area */}
      <div className="flex-1 relative z-10 overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <OnboardingSlide slide={currentSlide} isActive={true} />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Controls */}
      <motion.div
        className="relative z-20 px-8 pb-12 pt-4 space-y-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        {/* Dot Indicators */}
        <div className="flex items-center justify-center gap-2.5">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className="relative p-1"
              aria-label={`Go to slide ${index + 1}`}
            >
              <motion.div
                className="h-2 rounded-full"
                animate={{
                  width: index === currentIndex ? 28 : 8,
                  backgroundColor: index === currentIndex
                    ? currentSlide.gradientFrom
                    : 'hsl(var(--muted-foreground) / 0.2)',
                }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              />
            </button>
          ))}
        </div>

        {/* CTA Button */}
        <motion.button
          onClick={isLastSlide ? completeOnboarding : goToNext}
          className="w-full h-14 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] text-white flex items-center justify-center gap-3 group relative overflow-hidden shadow-lg"
          style={{
            background: `linear-gradient(135deg, ${currentSlide.gradientFrom}, ${currentSlide.gradientTo})`,
            boxShadow: `0 8px 32px ${currentSlide.gradientFrom}33`,
          }}
          whileTap={{ scale: 0.98 }}
          whileHover={{ scale: 1.01 }}
        >
          {/* Shimmer effect */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
            animate={{ x: ['-200%', '200%'] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          />
          <span className="relative z-10">
            {isLastSlide ? 'Get Started' : 'Continue'}
          </span>
          <motion.div
            className="relative z-10"
            animate={isLastSlide ? { x: [0, 4, 0] } : {}}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            {isLastSlide ? (
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            ) : (
              <ChevronRight size={16} />
            )}
          </motion.div>
        </motion.button>

        {/* Mode indicator */}
        <p className="text-center text-[9px] font-bold uppercase tracking-[0.3em] text-muted-foreground/40">
          {APP_MODE === 'member' ? 'Member Portal' : 'Business Console'}
        </p>
      </motion.div>
    </div>
  );
};

export default OnboardingScreen;
