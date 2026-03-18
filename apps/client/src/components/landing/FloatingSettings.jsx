import { useState, useRef, useEffect } from 'react';
import { Settings, X, Sun, Moon, Laptop } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTheme } from '@/context/ThemeContext';
import ColorPalette from '@/components/ui/ColorPalette';
import { cn } from '@/lib/utils';

const FloatingSettings = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { theme, setTheme, primaryColor, setPrimaryColor } = useTheme();
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <motion.div
      drag
      dragMomentum={false}
      dragTransition={{ bounceStiffness: 600, bounceDamping: 20 }}
      whileDrag={{ scale: 1.1, cursor: 'grabbing' }}
      className="fixed bottom-24 sm:bottom-6 right-6 z-[200] flex flex-col items-end"
      ref={menuRef}
    >
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-10 h-10 rounded-2xl bg-primary text-primary-foreground shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 group cursor-grab',
          isOpen ? 'rotate-90' : 'hover:rotate-45',
        )}
      >
        {isOpen ? <X size={16} /> : <Settings size={16} />}
      </button>

      {/* Settings Panel */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-[320px] sm:w-[380px] bg-card/95 backdrop-blur-2xl border border-border/50 rounded-3xl shadow-2xl p-6 animate-in fade-in zoom-in-95 slide-in-from-bottom-10 h-auto max-h-[80vh] overflow-y-auto overflow-x-hidden scrollbar-hide">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-black tracking-tight mb-1">
                Theme Customization
              </h3>
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">
                Adjust the look and feel
              </p>
            </div>

            {/* Theme Mode */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
                Appearance
              </h4>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'light', icon: <Sun size={18} />, label: 'Light' },
                  { id: 'dark', icon: <Moon size={18} />, label: 'Dark' },
                  { id: 'system', icon: <Laptop size={18} />, label: 'System' },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => setTheme(mode.id)}
                    className={cn(
                      'flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all',
                      theme === mode.id
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border/50 hover:bg-muted/50 text-muted-foreground',
                    )}
                  >
                    {mode.icon}
                    <span className="text-[10px] font-bold uppercase">
                      {mode.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Color Palette */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
                Primary Hue
              </h4>
              <ColorPalette
                primaryColor={primaryColor}
                setPrimaryColor={setPrimaryColor}
                className="gap-3 sm:gap-4 justify-between"
              />
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default FloatingSettings;
