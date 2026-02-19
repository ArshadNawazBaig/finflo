import React from 'react';
import { cn } from '@/lib/utils';

const SplashScreen = () => {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white dark:bg-[#020617] transition-colors duration-300">
      <div className="relative flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-1000 ease-out">
        {/* Animated Logo Container */}
        <div className="relative w-20 h-20 sm:w-20 sm:h-20 flex items-center justify-center">
          {/* Outer Glow Ring */}
          <div className="absolute inset-0 rounded-full bg-primary/10 blur-3xl animate-pulse scale-150" />

          <svg
            viewBox="0 0 40 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full relative z-10 drop-shadow-2xl"
          >
            <defs>
              <linearGradient
                id="splash-gradient"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="50%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#ec4899" />
              </linearGradient>
            </defs>

            {/* Background Soft Mesh */}
            <circle
              cx="20"
              cy="20"
              r="14"
              fill="url(#splash-gradient)"
              className="opacity-20 blur-[8px]"
            />

            {/* The Pulse Wave Line */}
            <path
              d="M6 28C6 28 10 10 20 10C30 10 34 20 25 20C16 20 10 30 20 30C30 30 34 20 34 20"
              stroke="url(#splash-gradient)"
              strokeWidth="4.5"
              strokeLinecap="round"
              className="drop-shadow-[0_0_15px_rgba(139,92,246,0.4)]"
            />

            {/* Kinetic Point */}
            <circle
              cx="34"
              cy="20"
              r="3.5"
              fill="#ec4899"
              className="animate-pulse"
            />
          </svg>
        </div>

        {/* Branding */}
        <div className="flex flex-col items-center gap-3">
          <h1 className="text-3xl sm:text-3xl font-black tracking-[-0.08em] text-slate-900 dark:text-white text-center flex items-center">
            Finance<span className="text-primary">Flow</span>
          </h1>
          <div className="flex items-center gap-4">
            <span className="h-px w-6 bg-slate-200 dark:bg-white/10" />
            <p className="text-[10px] font-bold tracking-[0.5em] text-slate-500 uppercase">
              The Banking OS
            </p>
            <span className="h-px w-6 bg-slate-200 dark:bg-white/10" />
          </div>
        </div>

        {/* Loading Progress Bar */}
        <div className="absolute -bottom-24 w-48 h-1 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
          <div className="h-full bg-primary w-1/3 rounded-full animate-[loading_1.5s_infinite_ease-in-out]" />
        </div>
      </div>

      <style>{`
        @keyframes loading {
          0% {
            transform: translateX(-100%);
          }
          to {
            transform: translateX(250%);
          }
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;
