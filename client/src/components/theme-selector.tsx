import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shuffle, Check, X } from "lucide-react";

// Theme definitions with categories
const themeCategories = [
  {
    id: 'tech',
    label: 'Tech / Futuristic',
    themes: [
      { 
        id: 'matrix-code', 
        name: 'Matrix', 
        gradient: 'from-green-600 via-emerald-500 to-green-400',
        bgColor: 'bg-black',
        accentColor: '#22c55e',
        description: 'Digital rain cascade'
      },
      { 
        id: 'warp-speed', 
        name: 'Warp', 
        gradient: 'from-purple-600 via-violet-500 to-cyan-400',
        bgColor: 'bg-slate-950',
        accentColor: '#a855f7',
        description: 'Hyperspace travel'
      },
    ]
  },
  {
    id: 'atmospheric',
    label: 'Atmospheric',
    themes: [
      { 
        id: 'aurora', 
        name: 'Aurora', 
        gradient: 'from-green-400 via-purple-500 to-blue-500',
        bgColor: 'bg-slate-900',
        accentColor: '#8b5cf6',
        description: 'Northern lights dance'
      },
      { 
        id: 'fireflies', 
        name: 'Fireflies', 
        gradient: 'from-amber-400 via-yellow-500 to-amber-600',
        bgColor: 'bg-slate-950',
        accentColor: '#f59e0b',
        description: 'Gentle floating lights'
      },
    ]
  },
  {
    id: 'energy',
    label: 'Energy',
    themes: [
      { 
        id: 'fire-storm', 
        name: 'Fire', 
        gradient: 'from-orange-600 via-red-500 to-yellow-500',
        bgColor: 'bg-slate-950',
        accentColor: '#ef4444',
        description: 'Blazing intensity'
      },
    ]
  },
  {
    id: 'minimal',
    label: 'Minimal',
    themes: [
      { 
        id: 'none', 
        name: 'None', 
        gradient: 'from-slate-600 via-slate-700 to-slate-800',
        bgColor: 'bg-slate-900',
        accentColor: '#64748b',
        description: 'Clean & simple'
      },
    ]
  }
];

// Flatten themes for easy lookup
const allThemes = themeCategories.flatMap(cat => cat.themes);

interface ThemeSelectorProps {
  selectedTheme: string;
  onThemeChange: (themeId: string) => void;
}

// Animated theme preview component
function ThemePreview({ theme, isActive }: { theme: typeof allThemes[0], isActive: boolean }) {
  return (
    <div className="relative w-full h-full overflow-hidden rounded-lg">
      {/* Base gradient background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${theme.gradient} opacity-80`} />
      
      {/* Animated overlay based on theme */}
      {theme.id === 'matrix-code' && (
        <div className="absolute inset-0">
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-0.5 bg-gradient-to-b from-green-400 to-transparent"
              style={{ left: `${12 + i * 12}%`, height: '60%' }}
              animate={{ 
                y: ['-100%', '200%'],
                opacity: [0, 1, 0]
              }}
              transition={{ 
                duration: 1.5 + i * 0.2, 
                repeat: Infinity, 
                ease: 'linear',
                delay: i * 0.15
              }}
            />
          ))}
        </div>
      )}
      
      {theme.id === 'warp-speed' && (
        <div className="absolute inset-0 flex items-center justify-center">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-white"
              style={{ 
                top: `${20 + Math.random() * 60}%`,
                left: `${10 + Math.random() * 80}%`
              }}
              animate={{ 
                scale: [0, 1, 3],
                opacity: [0, 1, 0],
                x: [0, (i % 2 === 0 ? 1 : -1) * 50]
              }}
              transition={{ 
                duration: 0.8, 
                repeat: Infinity, 
                delay: i * 0.15
              }}
            />
          ))}
        </div>
      )}
      
      {theme.id === 'aurora' && (
        <div className="absolute inset-0">
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-green-400/40 via-purple-500/40 to-blue-500/40"
            animate={{ 
              backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
            }}
            transition={{ 
              duration: 4, 
              repeat: Infinity, 
              ease: 'easeInOut'
            }}
            style={{ backgroundSize: '200% 200%' }}
          />
        </div>
      )}
      
      {theme.id === 'fireflies' && (
        <div className="absolute inset-0">
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1.5 h-1.5 rounded-full bg-amber-300 shadow-[0_0_8px_#fbbf24]"
              style={{ 
                top: `${20 + Math.random() * 60}%`,
                left: `${15 + Math.random() * 70}%`
              }}
              animate={{ 
                y: [0, -8, 0],
                x: [0, 4, -4, 0],
                opacity: [0.3, 1, 0.3]
              }}
              transition={{ 
                duration: 2 + i * 0.3, 
                repeat: Infinity, 
                ease: 'easeInOut',
                delay: i * 0.2
              }}
            />
          ))}
        </div>
      )}
      
      {theme.id === 'fire-storm' && (
        <div className="absolute inset-0">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute bottom-0 w-3 rounded-full bg-gradient-to-t from-orange-500 via-red-500 to-yellow-400"
              style={{ 
                left: `${10 + i * 16}%`,
                height: '50%'
              }}
              animate={{ 
                scaleY: [0.6, 1, 0.6],
                opacity: [0.6, 1, 0.6]
              }}
              transition={{ 
                duration: 0.4 + i * 0.1, 
                repeat: Infinity, 
                ease: 'easeInOut',
                delay: i * 0.08
              }}
            />
          ))}
        </div>
      )}
      
      {/* Selected glow effect */}
      {isActive && (
        <motion.div
          className="absolute inset-0 rounded-lg"
          style={{ boxShadow: `0 0 20px ${theme.accentColor}, 0 0 40px ${theme.accentColor}40` }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
    </div>
  );
}

export function ThemeSelector({ selectedTheme, onThemeChange }: ThemeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  
  const currentTheme = allThemes.find(t => t.id === selectedTheme) || allThemes[0];

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false);
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  const handleThemeSelect = (themeId: string) => {
    onThemeChange(themeId);
    // Don't auto-close - let user explore themes
  };

  return (
    <>
      {/* Theme Selector Button - Glassmorphic card */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="w-full group"
      >
        <div className="relative overflow-hidden rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl p-4 shadow-xl transition-all duration-300 hover:bg-white/15 hover:border-white/30 hover:scale-[1.02]">
          {/* Live thumbnail preview */}
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16 rounded-xl overflow-hidden ring-2 ring-white/20 shadow-lg">
              <ThemePreview theme={currentTheme} isActive={false} />
            </div>
            
            <div className="flex-1 text-left">
              <p className="text-white/50 text-xs font-medium uppercase tracking-wider mb-1">Theme</p>
              <p className="text-white font-semibold text-lg">{currentTheme.name}</p>
              <p className="text-white/40 text-xs mt-0.5">{currentTheme.description}</p>
            </div>
            
            {/* Shuffle icon */}
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 group-hover:bg-white/20 transition-colors">
              <Shuffle className="w-4 h-4 text-white/70 group-hover:text-white transition-colors" />
            </div>
          </div>
          
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        </div>
      </button>

      {/* Backdrop overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Bottom Sheet Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={panelRef}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 max-h-[85vh] overflow-hidden"
          >
            <div className="bg-slate-950/95 backdrop-blur-xl border-t border-white/10 rounded-t-3xl shadow-2xl">
              {/* Handle bar */}
              <div className="flex justify-center pt-4 pb-2">
                <div className="w-12 h-1.5 rounded-full bg-white/20" />
              </div>
              
              {/* Header */}
              <div className="flex items-center justify-between px-6 pb-4">
                <div>
                  <h2 className="text-white text-xl font-bold">Choose Theme</h2>
                  <p className="text-white/50 text-sm mt-0.5">Set the mood for your event</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5 text-white/70" />
                </button>
              </div>

              {/* Scrollable content - All themes in single horizontal row */}
              <div className="px-6 pb-8">
                {/* Horizontal scrolling theme cards */}
                <div className="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1 scrollbar-hide">
                  {allThemes.map((theme) => {
                    const isActive = selectedTheme === theme.id;
                    return (
                      <motion.button
                        key={theme.id}
                        type="button"
                        onClick={() => handleThemeSelect(theme.id)}
                        className="flex-shrink-0 relative group"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {/* Theme card */}
                        <div 
                          className={`
                            relative w-32 h-44 sm:w-36 sm:h-48 rounded-2xl overflow-hidden transition-all duration-300
                            ${isActive 
                              ? 'scale-105 shadow-2xl' 
                              : 'ring-1 ring-white/10 hover:ring-white/30'
                            }
                          `}
                          style={isActive ? { 
                            boxShadow: `0 0 30px ${theme.accentColor}40, 0 0 0 2px ${theme.accentColor}, 0 0 0 4px rgb(2, 6, 23)`
                          } : {}}
                        >
                          {/* Animated preview */}
                          <ThemePreview theme={theme} isActive={isActive} />
                          
                          {/* Theme info overlay */}
                          <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 via-black/50 to-transparent">
                            <p className="text-white font-semibold text-sm">{theme.name}</p>
                            <p className="text-white/60 text-[10px] mt-0.5 line-clamp-1">{theme.description}</p>
                          </div>
                          
                          {/* Selected badge */}
                          {isActive && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-lg"
                            >
                              <Check className="w-3.5 h-3.5" style={{ color: theme.accentColor }} />
                            </motion.div>
                          )}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>

                {/* Current selection summary */}
                <div className="mt-4 p-4 rounded-2xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl overflow-hidden ring-2 ring-white/20">
                      <ThemePreview theme={currentTheme} isActive={true} />
                    </div>
                    <div className="flex-1">
                      <p className="text-white/50 text-xs uppercase tracking-wider">Active Theme</p>
                      <p className="text-white font-semibold">{currentTheme.name}</p>
                    </div>
                    <div 
                      className="px-3 py-1.5 rounded-full text-xs font-medium"
                      style={{ 
                        backgroundColor: `${currentTheme.accentColor}20`,
                        color: currentTheme.accentColor
                      }}
                    >
                      Selected
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default ThemeSelector;
