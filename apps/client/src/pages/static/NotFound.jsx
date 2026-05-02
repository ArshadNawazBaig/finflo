import { motion } from 'framer-motion';
import { Home, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden selection:bg-primary/30">
      {/* Animated Mesh Gradient Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none flex items-center justify-center">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute w-[800px] h-[800px] rounded-full bg-gradient-to-tr from-primary/20 to-indigo-500/20 blur-[100px] dark:from-primary/10 dark:to-indigo-500/10 opacity-70"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            rotate: [90, 0, 90],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute w-[600px] h-[600px] rounded-full bg-gradient-to-bl from-rose-500/10 to-violet-500/20 blur-[100px] dark:from-rose-500/5 dark:to-violet-500/10 opacity-70 translate-x-1/4"
        />
      </div>

      <div className="relative z-10 w-full max-w-4xl mx-auto flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center"
        >
          {/* Subtle Label */}
          <motion.span 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 1 }}
            className="px-4 py-1.5 rounded-full bg-muted/50 border border-border/50 text-xs font-semibold text-muted-foreground uppercase tracking-[0.3em] mb-8"
          >
            System Error
          </motion.span>

          {/* Huge Typography */}
          <h1 className="text-[12rem] sm:text-[18rem] md:text-[22rem] leading-none font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-foreground via-foreground/80 to-background select-none filter drop-shadow-xl">
            404
          </h1>
          
          {/* Negative margin to pull text closer to the massive 404 */}
          <div className="-mt-8 sm:-mt-16 md:-mt-20 z-10">
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-foreground mb-6">
              Looks like you're lost.
            </h2>
            <p className="text-muted-foreground text-lg sm:text-xl max-w-lg mx-auto font-medium leading-relaxed mb-12">
              The page you are looking for has vanished into the void, or perhaps it never existed at all.
            </p>

            {/* Elegant Pill Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button
                onClick={() => navigate('/')}
                className="group flex items-center justify-center gap-3 px-8 py-4 bg-primary text-primary-foreground hover:bg-primary/90 rounded-full font-bold transition-all hover:scale-105 active:scale-95 shadow-xl w-full sm:w-auto shadow-primary/20 hover:shadow-primary/40"
              >
                <Home className="w-5 h-5" />
                <span>Return to Home</span>
              </button>
              
              <button
                onClick={() => navigate(-1)}
                className="group flex items-center justify-center gap-3 px-8 py-4 bg-card hover:bg-muted border border-border text-foreground rounded-full font-bold transition-all hover:scale-105 active:scale-95 shadow-sm w-full sm:w-auto"
              >
                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                <span>Go Back</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
      
      {/* Footer minimal elements */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 1 }}
        className="absolute bottom-8 left-0 w-full flex justify-center text-xs text-muted-foreground font-mono tracking-widest uppercase opacity-50"
      >
        <span>Error Code_404 // Sector_Not_Found</span>
      </motion.div>
    </div>
  );
};

export default NotFound;
