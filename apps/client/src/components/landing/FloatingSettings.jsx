import { useState, useRef, useEffect } from 'react';
import { Palette, X, Sun, Moon, Laptop } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTheme } from '@/context/ThemeContext';
import ColorPalette from '@/components/ui/ColorPalette';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

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
      <Button
        variant="ghost"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-10 h-10 rounded-2xl bg-primary text-primary-foreground shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 group cursor-grab',
          isOpen ? 'rotate-90' : 'hover:rotate-45',
        )}
      >
        {isOpen ? <X size={16} /> : <Palette size={16} />}
      </Button>

      {/* Settings Panel */}
      {isOpen && (
        <div className="absolute bottom-14 right-0 w-[240px] bg-card/95 backdrop-blur-2xl border border-border/50 rounded-2xl shadow-2xl p-4 animate-in fade-in zoom-in-95 slide-in-from-bottom-10 h-auto max-h-[80vh] overflow-y-auto overflow-x-hidden scrollbar-hide">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                Theme Settings
              </h3>
              <Button
                variant="ghost"
                onClick={() => setIsOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={14} />
              </Button>
            </div>

            {/* Theme Mode */}
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'light', icon: <Sun size={14} />, label: 'Light' },
                  { id: 'dark', icon: <Moon size={14} />, label: 'Dark' },
                  { id: 'system', icon: <Laptop size={14} />, label: 'System' },
                ].map((mode) => (
                  <Button
                    key={mode.id}
                    variant="ghost"
                    onClick={() => setTheme(mode.id)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 py-2 px-1 rounded-xl border transition-all',
                      theme === mode.id
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border/40 hover:bg-muted/50 text-muted-foreground',
                    )}
                    title={mode.label}
                  >
                    {mode.icon}
                    <span className="text-[8px] font-bold uppercase tracking-tighter">
                      {mode.label}
                    </span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Color Palette */}
            <div className="space-y-2 border-t border-border/40 pt-3">
              <h4 className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">
                Primary Hue
              </h4>
              <ColorPalette
                primaryColor={primaryColor}
                setPrimaryColor={setPrimaryColor}
                className="gap-1.5 justify-center"
              />
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default FloatingSettings;
