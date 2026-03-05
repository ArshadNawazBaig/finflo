import React from 'react';
import { motion } from 'framer-motion';
import { Home, ArrowLeft, Ghost } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 overflow-hidden relative">
      {/* Background Blobs */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-primary/20 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob" />
      <div className="absolute top-0 -right-4 w-72 h-72 bg-indigo-500/20 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000" />
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-violet-500/20 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000" />

      <div className="relative z-10 max-w-2xl w-full">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-12 text-center shadow-[0_32px_128px_-16px_rgba(0,0,0,0.5)]"
        >
          {/* Animated 404 Icon */}
          <motion.div
            animate={{
              y: [0, -20, 0],
              rotate: [0, 5, -5, 0],
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="inline-flex items-center justify-center w-32 h-32 bg-gradient-to-br from-primary via-indigo-600 to-violet-700 rounded-3xl mb-8 shadow-2xl relative"
          >
            <Ghost className="w-16 h-16 text-white" />
            <div className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-widest shadow-lg">
              Lost
            </div>
          </motion.div>

          {/* Typography */}
          <h1 className="text-8xl font-black tracking-tighter text-white mb-4 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/50">
            404
          </h1>
          <h2 className="text-2xl font-black tracking-tight text-white/90 mb-6 uppercase">
            Void Detected
          </h2>
          <p className="text-slate-400 text-lg mb-12 max-w-md mx-auto font-medium leading-relaxed">
            The coordinates you provided lead to deep space. This page doesn't
            exist or has been moved to another dimension.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={() => navigate('/')}
              className="group relative px-8 py-4 bg-primary text-primary-foreground rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-2xl shadow-primary/30 hover:shadow-primary/50 hover:scale-[1.05] active:scale-95 transition-all w-full sm:w-auto"
            >
              <span className="flex items-center justify-center gap-2">
                <Home className="w-4 h-4" />
                Return Base
              </span>
            </button>
            <button
              onClick={() => navigate(-1)}
              className="group px-8 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs transition-all border border-white/10 w-full sm:w-auto"
            >
              <span className="flex items-center justify-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                Initiate Warp Back
              </span>
            </button>
          </div>
        </motion.div>

        {/* System Metadata */}
        <div className="mt-8 flex justify-center gap-8 opacity-20 pointer-events-none">
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-black tracking-[0.5em] text-white uppercase ">
              Status
            </span>
            <span className="text-xs font-mono text-red-500">OFFLINE</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-black tracking-[0.5em] text-white uppercase ">
              System
            </span>
            <span className="text-xs font-mono text-primary">FINFLO_PRO</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
