import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const SplashScreen = () => {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white dark:bg-[#020617] overflow-hidden transition-colors duration-500">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 100, 0],
            y: [0, 50, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: 'linear',
          }}
          className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/20 dark:bg-primary/10 blur-[120px]"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            x: [0, -100, 0],
            y: [0, -50, 0],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: 'linear',
          }}
          className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-500/20 dark:bg-purple-500/10 blur-[120px]"
        />
      </div>

      <div className="relative flex flex-col items-center gap-8 z-10">
        {/* Animated Logo Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="relative w-24 h-24 flex items-center justify-center"
        >
          {/* Outer Glow Ring */}
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute inset-0 rounded-full bg-primary/25 dark:bg-primary/20 blur-2xl"
          />

          <svg
            viewBox="0 0 40 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full relative z-10 drop-shadow-[0_0_20px_rgba(59,130,246,0.5)]"
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
            <motion.circle
              cx="20"
              cy="20"
              r="14"
              fill="url(#splash-gradient)"
              className="opacity-20 blur-[6px]"
              animate={{
                scale: [1, 1.1, 1],
              }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            />

            {/* The Pulse Wave Line */}
            <motion.path
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1.5, delay: 0.5, ease: 'easeInOut' }}
              d="M6 28C6 28 10 10 20 10C30 10 34 20 25 20C16 20 10 30 20 30C30 30 34 20 34 20"
              stroke="url(#splash-gradient)"
              strokeWidth="4"
              strokeLinecap="round"
            />

            {/* Kinetic Point */}
            <motion.circle
              cx="34"
              cy="20"
              r="3.5"
              fill="#ec4899"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [1, 0.5, 1],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
          </svg>
        </motion.div>

        {/* Branding */}
        <div className="flex flex-col items-center gap-4">
          {/* <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center"
          >
            Finance<span className="text-primary italic">Flow</span>
          </motion.h1> */}

          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            transition={{ duration: 1, delay: 0.8 }}
            className="flex items-center gap-4 overflow-hidden whitespace-nowrap"
          >
            <span className="h-px w-8 bg-gradient-to-r from-transparent to-slate-200 dark:to-white/20" />
            <p className="text-[10px] font-medium tracking-[0.4em] text-slate-500 dark:text-slate-400 uppercase">
              The Banking OS
            </p>
            <span className="h-px w-8 bg-gradient-to-l from-transparent to-slate-200 dark:to-white/20" />
          </motion.div>
        </div>

        {/* Minimal Progress Bar */}
        <div className="absolute -bottom-16 flex flex-col items-center gap-2">
          <div className="w-48 h-[2px] bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: '100%' }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="h-full w-1/2 bg-gradient-to-r from-transparent via-primary to-transparent"
            />
          </div>
          <motion.span
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-[8px] text-slate-400 dark:text-slate-500 font-medium tracking-widest uppercase"
          >
            Securely initializing
          </motion.span>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
