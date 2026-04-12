import { useState, useEffect, useRef } from 'react';
import {
  Award,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Tooltip from '@/components/ui/Tooltip';

const GRADE_CONFIG = {
  'A+': { label: 'Outstanding', tier: 'elite' },
  A: { label: 'Excellent', tier: 'high' },
  B: { label: 'Good', tier: 'good' },
  C: { label: 'Average', tier: 'fair' },
  D: { label: 'Below Average', tier: 'low' },
  F: { label: 'Poor', tier: 'critical' },
};

const TIER_STYLES = {
  elite: {
    gradient: 'from-violet-500 via-fuchsia-500 to-pink-500',
    glow: 'shadow-violet-500/25',
    text: 'text-violet-500',
    bg: 'bg-violet-500',
    bgLight: 'bg-violet-500/10',
    border: 'border-violet-500/20',
    ring: 'stroke-violet-500',
    particle: '#8b5cf6',
  },
  high: {
    gradient: 'from-emerald-400 via-emerald-500 to-teal-500',
    glow: 'shadow-emerald-500/25',
    text: 'text-emerald-500',
    bg: 'bg-emerald-500',
    bgLight: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    ring: 'stroke-emerald-500',
    particle: '#10b981',
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
  },
  fair: {
    gradient: 'from-primary/70 via-primary to-primary/90',
    glow: 'shadow-primary/25',
    text: 'text-primary',
    bg: 'bg-primary',
    bgLight: 'bg-primary/10',
    border: 'border-primary/20',
    ring: 'stroke-primary',
    particle: 'hsl(var(--primary))',
  },
  low: {
    gradient: 'from-orange-400 via-orange-500 to-red-400',
    glow: 'shadow-orange-500/25',
    text: 'text-orange-500',
    bg: 'bg-orange-500',
    bgLight: 'bg-orange-500/10',
    border: 'border-orange-500/20',
    ring: 'stroke-orange-500',
    particle: '#f97316',
  },
  critical: {
    gradient: 'from-red-400 via-rose-500 to-red-600',
    glow: 'shadow-red-500/25',
    text: 'text-red-500',
    bg: 'bg-red-500',
    bgLight: 'bg-red-500/10',
    border: 'border-red-500/20',
    ring: 'stroke-red-500',
    particle: '#ef4444',
  },
};

const MemberGradeCard = ({ memberGrade }) => {
  const [animatedScore, setAnimatedScore] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const animationRef = useRef(null);

  const score = memberGrade?.score ?? 0;
  const grade = memberGrade?.grade ?? 'C';
  const config = GRADE_CONFIG[grade] || GRADE_CONFIG.C;
  const styles = TIER_STYLES[config.tier] || TIER_STYLES.fair;

  // Animate score counting on mount
  useEffect(() => {
    let start = 0;
    const duration = 1500;
    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      start = Math.round(eased * score);
      setAnimatedScore(start);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [score]);

  // SVG gauge calculations
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const arc = circumference * 0.75; // 270 degrees
  const filledArc = (animatedScore / 100) * arc;
  const dashOffset = arc - filledArc;

  // Tick marks for the gauge
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

  if (!memberGrade) return null;

  return (
    <div
      className={cn(
        'group relative rounded-[2rem] bg-card p-6 sm:p-8 transition-all duration-500 border cursor-default shadow-xs',
        styles.border,
        isHovered && styles.glow,
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      id="member-grade-card"
    >
      {/* Background gradient accent */}
      {/* <div className="absolute inset-0 overflow-hidden rounded-[2rem] pointer-events-none">
        <div
          className={cn(
            'absolute -right-16 -top-16 h-48 w-48 rounded-full blur-3xl opacity-[0.08] transition-all duration-700',
            isHovered && 'scale-150 opacity-[0.15]',
            styles.bg,
          )}
        />
        <div
          className={cn(
            'absolute -left-8 -bottom-8 h-32 w-32 rounded-full blur-2xl opacity-[0.05] transition-all duration-700',
            isHovered && 'scale-125 opacity-[0.1]',
            styles.bg,
          )}
        />
      </div> */}

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'p-2.5 rounded-2xl shadow-inner text-white bg-gradient-to-br transition-transform duration-500',
                styles.gradient,
                isHovered && 'scale-110 rotate-6',
              )}
            >
              <Award size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                Member Grade
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className={cn(
                    'text-xs font-black uppercase tracking-wider',
                    styles.text,
                  )}
                >
                  {config.label}
                </span>
                {score >= 80 && (
                  <Sparkles
                    size={12}
                    className={cn('animate-pulse', styles.text)}
                  />
                )}
              </div>
            </div>
          </div>
          <Tooltip content="Based on your repayment history and trust rating.">
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
                /100
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-white transition-all',
                  `bg-gradient-to-r ${styles.gradient}`,
                  isHovered && 'shadow-lg',
                )}
              >
                <TrendingUp size={10} />
                Grade {grade}
              </span>
            </div>
          </div>

          {/* Right: Gauge */}
          <div className="relative w-[130px] h-[130px] sm:w-[140px] sm:h-[140px] shrink-0">
            <svg viewBox="0 0 130 130" className="w-full h-full">
              {/* Tick marks */}
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

              {/* Background arc */}
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

              {/* Filled arc */}
              <circle
                cx="65"
                cy="65"
                r={radius}
                fill="none"
                className={cn(
                  styles.ring,
                  'transition-all duration-1000 ease-out',
                )}
                stroke="currentColor"
                strokeWidth="10"
                strokeDasharray={`${arc} ${circumference}`}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                transform="rotate(-225 65 65)"
                style={{
                  filter: isHovered
                    ? `drop-shadow(0 0 6px ${styles.particle}40)`
                    : 'none',
                }}
              />

              {/* Glow overlay on filled arc */}
              <circle
                cx="65"
                cy="65"
                r={radius}
                fill="none"
                className={cn(styles.ring, 'opacity-30')}
                stroke="currentColor"
                strokeWidth="16"
                strokeDasharray={`${arc} ${circumference}`}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                transform="rotate(-225 65 65)"
                style={{ filter: 'blur(4px)' }}
              />
            </svg>

            {/* Center label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span
                className={cn(
                  'text-2xl font-black tracking-tighter',
                  styles.text,
                )}
              >
                {grade}
              </span>
              <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
                Rating
              </span>
            </div>
          </div>
        </div>

        {/* Score bar mini visual */}
        <div className="mt-6 space-y-2">
          <div className="flex items-center justify-between text-[9px] font-black text-muted-foreground/50 uppercase tracking-widest">
            <span>0</span>
            <span>25</span>
            <span>50</span>
            <span>75</span>
            <span>100</span>
          </div>
          <div className="h-2 w-full bg-muted/20 rounded-full overflow-hidden relative">
            {/* Segment markers */}
            <div className="absolute inset-0 flex">
              <div className="flex-1 border-r border-background/30" />
              <div className="flex-1 border-r border-background/30" />
              <div className="flex-1 border-r border-background/30" />
              <div className="flex-1" />
            </div>
            <div
              className={cn(
                'h-full rounded-full transition-all duration-1000 ease-out bg-gradient-to-r relative',
                styles.gradient,
              )}
              style={{ width: `${animatedScore}%` }}
            >
              {/* Shimmer effect */}
              <div className="absolute inset-0 overflow-hidden rounded-full">
                <div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"
                  style={{
                    animation: 'shimmer 2s infinite',
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Suggestion badge */}
        {memberGrade.suggestion && (
          <div className="mt-4 flex items-center gap-2">
            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">
              Assessment:
            </span>
            <span
              className={cn(
                'px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider',
                memberGrade.suggestion === 'Approve'
                  ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                  : memberGrade.suggestion === 'Caution'
                    ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                    : 'bg-red-500/10 text-red-600 border border-red-500/20',
              )}
            >
              {memberGrade.suggestion}
            </span>
          </div>
        )}

        {/* Expandable factors */}
        {memberGrade.factors?.length > 0 && (
          <div className="mt-4">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className={cn(
                'flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-colors w-full justify-center py-2 rounded-xl',
                'text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/30',
              )}
            >
              {isExpanded ? 'Hide' : 'View'} Grade Factors
              {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>

            <div
              className={cn(
                'overflow-hidden transition-all duration-500 ease-out',
                isExpanded
                  ? 'max-h-60 opacity-100 mt-3'
                  : 'max-h-0 opacity-0 mt-0',
              )}
            >
              <div className="space-y-2">
                {memberGrade.factors.map((factor, idx) => (
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

      {/* CSS for shimmer animation */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
};

export default MemberGradeCard;
