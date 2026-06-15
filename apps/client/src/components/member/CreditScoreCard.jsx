import { useState, useEffect, useRef } from 'react';
import {
  Shield,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Info,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Tooltip from '@/components/ui/Tooltip';
import { Button } from '@/components/ui/button';

const GRADE_CONFIG = {
  Excellent: { tier: 'excellent', min: 800 },
  'Very Good': { tier: 'veryGood', min: 740 },
  Good: { tier: 'good', min: 670 },
  Fair: { tier: 'fair', min: 580 },
  Poor: { tier: 'poor', min: 300 },
  'Very Poor': { tier: 'poor', min: 300 },
};

const TIER_STYLES = {
  excellent: {
    gradient: 'from-violet-500 via-fuchsia-500 to-pink-500',
    glow: 'shadow-violet-500/25',
    text: 'text-violet-500',
    bg: 'bg-violet-500',
    bgLight: 'bg-violet-500/10',
    border: 'border-violet-500/20',
    ring: 'stroke-violet-500',
    particle: '#8b5cf6',
    barColors: ['#8b5cf6', '#a855f7', '#d946ef'],
  },
  veryGood: {
    gradient: 'from-emerald-400 via-emerald-500 to-teal-500',
    glow: 'shadow-emerald-500/25',
    text: 'text-emerald-500',
    bg: 'bg-emerald-500',
    bgLight: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    ring: 'stroke-emerald-500',
    particle: '#10b981',
    barColors: ['#10b981', '#14b8a6', '#2dd4bf'],
  },
  good: {
    gradient: 'from-blue-400 via-blue-500 to-indigo-500',
    glow: 'shadow-blue-500/25',
    text: 'text-blue-500',
    bg: 'bg-blue-500',
    bgLight: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    ring: 'stroke-blue-500',
    particle: '#3b82f6',
    barColors: ['#3b82f6', '#6366f1', '#818cf8'],
  },
  fair: {
    gradient: 'from-amber-400 via-orange-500 to-amber-500',
    glow: 'shadow-amber-500/25',
    text: 'text-amber-500',
    bg: 'bg-amber-500',
    bgLight: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    ring: 'stroke-amber-500',
    particle: '#f59e0b',
    barColors: ['#f59e0b', '#f97316', '#fb923c'],
  },
  poor: {
    gradient: 'from-red-400 via-rose-500 to-red-600',
    glow: 'shadow-red-500/25',
    text: 'text-red-500',
    bg: 'bg-red-500',
    bgLight: 'bg-red-500/10',
    border: 'border-red-500/20',
    ring: 'stroke-red-500',
    particle: '#ef4444',
    barColors: ['#ef4444', '#f43f5e', '#fb7185'],
  },
};

const CreditScoreCard = ({ creditScore }) => {
  const [animatedScore, setAnimatedScore] = useState(300);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const animationRef = useRef(null);

  const score = creditScore?.score ?? 550;
  const grade = creditScore?.grade ?? 'Fair';
  const factors = creditScore?.factors ?? [];

  const config = GRADE_CONFIG[grade] || GRADE_CONFIG.Fair;
  const styles = TIER_STYLES[config.tier] || TIER_STYLES.fair;

  // Animate score counting on mount
  useEffect(() => {
    const startVal = 300;
    const duration = 2000;
    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startVal + eased * (score - startVal));
      setAnimatedScore(current);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [score]);

  // SVG gauge calculations (semicircle)
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const arc = circumference * 0.75;
  const normalizedScore = (animatedScore - 300) / 550; // 300-850 range
  const filledArc = normalizedScore * arc;
  const dashOffset = arc - filledArc;

  // Tick marks
  const ticks = [];
  for (let i = 0; i <= 20; i++) {
    const angle = -225 + (i / 20) * 270;
    const rad = (angle * Math.PI) / 180;
    const isMajor = i % 5 === 0;
    const innerR = isMajor ? 48 : 51;
    const outerR = 54;
    ticks.push({
      x1: 65 + innerR * Math.cos(rad),
      y1: 65 + innerR * Math.sin(rad),
      x2: 65 + outerR * Math.cos(rad),
      y2: 65 + outerR * Math.sin(rad),
      isMajor,
    });
  }

  if (!creditScore) return null;

  return (
    <div
      className={cn(
        'group relative rounded-[2rem] bg-card p-6 sm:p-8 transition-all duration-500 border border-slate-100 dark:border-white/[0.06] cursor-default shadow-xs',
        isHovered && styles.glow,
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      id="credit-score-card"
    >
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'p-2.5 rounded-2xl  text-white bg-primary transition-transform duration-500',
                isHovered && 'scale-110 rotate-6',
              )}
            >
              <Shield size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                Credit Score
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs font-black uppercase tracking-wider text-primary">
                  {grade}
                </span>
                {score >= 740 && (
                  <Sparkles size={12} className="animate-pulse text-primary" />
                )}
              </div>
            </div>
          </div>
          <Tooltip
            content="FICO-style score based on your repayment history, credit utilization, account age, and financial activity."
            position="left"
          >
            <div className="p-2 rounded-full cursor-help hover:bg-muted/50 transition-colors">
              <Info size={14} className="text-muted-foreground" />
            </div>
          </Tooltip>
        </div>

        {/* Gauge + Score */}
        <div className="flex items-center justify-between gap-4">
          {/* Left: Score number */}
          <div className="space-y-1">
            <div className="flex items-baseline gap-1">
              <span
                className={cn(
                  'text-5xl sm:text-6xl font-black tracking-tighter tabular-nums transition-all duration-300',
                  isHovered && 'scale-105',
                )}
              >
                {animatedScore}
              </span>
              <span className="text-sm font-bold text-muted-foreground/60">
                /850
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-white transition-all bg-primary',
                  isHovered && 'shadow-lg',
                )}
              >
                <Zap size={10} />
                {grade}
              </span>
            </div>
          </div>

          {/* Right: Gauge */}
          <div className="relative w-[130px] h-[130px] sm:w-[140px] sm:h-[140px] shrink-0">
            <svg viewBox="0 0 130 130" className="w-full h-full">
              {ticks.map((t, i) => (
                <line
                  key={i}
                  x1={t.x1}
                  y1={t.y1}
                  x2={t.x2}
                  y2={t.y2}
                  stroke="currentColor"
                  className="text-muted/20"
                  strokeWidth={t.isMajor ? 1.5 : 0.5}
                  strokeLinecap="round"
                />
              ))}
              <circle
                cx="65"
                cy="65"
                r={radius}
                fill="none"
                className="text-muted/15"
                stroke="currentColor"
                strokeWidth="10"
                strokeDasharray={`${arc} ${circumference}`}
                strokeDashoffset="0"
                strokeLinecap="round"
                transform="rotate(-225 65 65)"
              />
              <circle
                cx="65"
                cy="65"
                r={radius}
                fill="none"
                className="stroke-primary transition-all duration-1000 ease-out"
                stroke="currentColor"
                strokeWidth="10"
                strokeDasharray={`${arc} ${circumference}`}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                transform="rotate(-225 65 65)"
                style={{
                  filter: isHovered
                    ? 'drop-shadow(0 0 6px hsl(var(--primary) / 0.25))'
                    : 'none',
                }}
              />
              <circle
                cx="65"
                cy="65"
                r={radius}
                fill="none"
                className="stroke-primary opacity-30"
                stroke="currentColor"
                strokeWidth="16"
                strokeDasharray={`${arc} ${circumference}`}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                transform="rotate(-225 65 65)"
                style={{ filter: 'blur(4px)' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-black tracking-tighter text-primary">
                {animatedScore}
              </span>
              <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
                Score
              </span>
            </div>
          </div>
        </div>

        {/* Range bar */}
        <div className="mt-6 space-y-2">
          <div className="flex items-center justify-between text-[9px] font-black text-muted-foreground/50 uppercase tracking-widest">
            <span>300</span>
            <span>440</span>
            <span>580</span>
            <span>670</span>
            <span>740</span>
            <span>850</span>
          </div>
          <div className="h-2 w-full bg-muted/20 rounded-full overflow-hidden relative">
            <div className="absolute inset-0 flex">
              <div className="flex-1 border-r border-background/30" />
              <div className="flex-1 border-r border-background/30" />
              <div className="flex-1 border-r border-background/30" />
              <div className="flex-1 border-r border-background/30" />
              <div className="flex-1" />
            </div>
            <div
              className={cn(
                'h-full rounded-full transition-all duration-1000 ease-out bg-primary relative',
              )}
              style={{ width: `${normalizedScore * 100}%` }}
            >
              <div className="absolute inset-0 overflow-hidden rounded-full">
                <div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  style={{ animation: 'shimmer 2s infinite' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Expandable factors */}
        {factors.length > 0 && (
          <div className="mt-4">
            <Button
              variant="ghost"
              onClick={() => setIsExpanded(!isExpanded)}
              className={cn(
                'flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-colors w-full justify-center py-2 rounded-xl',
                'text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/30',
              )}
            >
              {isExpanded ? 'Hide' : 'View'} Score Factors
              {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </Button>

            <div
              className={cn(
                'overflow-hidden transition-all duration-500 ease-out',
                isExpanded
                  ? 'max-h-60 opacity-100 mt-3'
                  : 'max-h-0 opacity-0 mt-0',
              )}
            >
              <div className="space-y-2">
                {factors.map((factor, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      'flex items-start gap-3 p-3 rounded-xl border transition-all duration-300',
                      'bg-muted/5 border-border/30 hover:bg-muted/15',
                    )}
                    style={{
                      transitionDelay: isExpanded ? `${idx * 80}ms` : '0ms',
                      transform: isExpanded
                        ? 'translateY(0)'
                        : 'translateY(-8px)',
                      opacity: isExpanded ? 1 : 0,
                    }}
                  >
                    <div
                      className={cn(
                        'mt-1 h-1.5 w-1.5 rounded-full shrink-0',
                        styles.bg,
                      )}
                    />
                    <span className="text-[11px] font-medium leading-tight text-muted-foreground">
                      {factor}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
};

export default CreditScoreCard;
