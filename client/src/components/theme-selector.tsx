import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Moon, Sun, X } from "lucide-react";
import {
  allThemes,
  buildCustomEmojiThemeId,
  emojiBackgroundChoices,
  emojiChoices,
  isCustomEmojiThemeId,
  parseCustomEmojiThemeId,
  resolveThemeById,
  type ThemeOption,
} from "./theme-catalog";
import type { DisplayMode } from "@/hooks/useDisplayMode";

type UICategoryId = 'minimal' | 'quantum' | 'warp' | 'emoji';

const uiCategories: Array<{ id: UICategoryId; label: string }> = [
  { id: 'minimal', label: 'Minimal' },
  { id: 'quantum', label: 'Quantum' },
  { id: 'warp', label: 'Warp' },
  { id: 'emoji', label: 'Emoji' },
];

const uiCategoryThemeMap: Record<UICategoryId, string[]> = {
  minimal: [
    'minimal-obsidian',
    'minimal-berry',
    'minimal-plum',
    'minimal-indigo',
    'minimal-midnight',
    'minimal-forest',
  ],
  quantum: [
    'quantum-dreamy',
    'quantum-summer',
    'quantum-melon',
    'quantum-barbie',
    'quantum-sunset',
    'quantum-ocean',
    'quantum-forest',
    'quantum-lavender',
  ],
  warp: ['warp-orange', 'warp-pink', 'warp-blue', 'warp-cyan', 'warp-violet'],
  emoji: ['emoji-custom', 'emoji-sparkles', 'emoji-party', 'emoji-heart', 'emoji-fire', 'emoji-moon', 'emoji-music'],
};

const categoryColorThemeMap: Record<Exclude<UICategoryId, 'emoji'>, string[]> = {
  minimal: ['minimal-obsidian', 'minimal-berry', 'minimal-plum', 'minimal-indigo', 'minimal-midnight', 'minimal-forest'],
  quantum: ['quantum-dreamy', 'quantum-summer', 'quantum-melon', 'quantum-barbie', 'quantum-sunset', 'quantum-ocean', 'quantum-forest', 'quantum-lavender'],
  warp: ['warp-orange', 'warp-pink', 'warp-blue', 'warp-cyan', 'warp-violet'],
};

const quantumPalette: Record<string, string> = {
  'quantum-dreamy': 'linear-gradient(90deg, #4f8ef7 0%, #4f8ef7 34%, #a855f7 34%, #a855f7 66%, #06b6d4 66%, #06b6d4 100%)',
  'quantum-summer': 'linear-gradient(90deg, #3b82f6 0%, #3b82f6 34%, #f59e0b 34%, #f59e0b 66%, #8b5cf6 66%, #8b5cf6 100%)',
  'quantum-melon': 'linear-gradient(90deg, #ff6eb4 0%, #ff6eb4 34%, #ffce5c 34%, #ffce5c 66%, #ff4499 66%, #ff4499 100%)',
  'quantum-barbie': 'linear-gradient(90deg, #c026d3 0%, #c026d3 34%, #e11d48 34%, #e11d48 66%, #f97316 66%, #f97316 100%)',
  'quantum-sunset': 'linear-gradient(90deg, #ff6eb4 0%, #ff6eb4 34%, #ffce5c 34%, #ffce5c 66%, #ff4499 66%, #ff4499 100%)',
  'quantum-ocean': 'linear-gradient(90deg, #00e5c3 0%, #00e5c3 34%, #0ea5e9 34%, #0ea5e9 66%, #6366f1 66%, #6366f1 100%)',
  'quantum-forest': 'linear-gradient(90deg, #ef4444 0%, #ef4444 34%, #22c55e 34%, #22c55e 66%, #84cc16 66%, #84cc16 100%)',
  'quantum-lavender': 'linear-gradient(90deg, #84cc16 0%, #84cc16 34%, #b45309 34%, #b45309 66%, #dc2626 66%, #dc2626 100%)',
};

const getThemesForUiCategory = (category: UICategoryId): ThemeOption[] => {
  const themeIds = uiCategoryThemeMap[category];
  return themeIds
    .map((id) => resolveThemeById(id))
    .filter((theme): theme is ThemeOption => Boolean(theme));
};

const getRandomThemeIdForCategory = (category: UICategoryId): string | null => {
  const themes = getThemesForUiCategory(category);
  if (themes.length === 0) return null;

  // Prefer concrete presets for random picks when available.
  const nonCustomThemes = themes.filter((theme) => !theme.id.endsWith('-custom'));
  const source = nonCustomThemes.length > 0 ? nonCustomThemes : themes;
  const randomIndex = Math.floor(Math.random() * source.length);
  return source[randomIndex]?.id || null;
};

const getUiCategoryForTheme = (themeId: string): UICategoryId => {
  const found = uiCategories.find((category) => uiCategoryThemeMap[category.id].includes(themeId));
  if (found) return found.id;
  if (isCustomEmojiThemeId(themeId)) return 'emoji';
  return 'minimal';
};

interface ThemeSelectorProps {
  selectedTheme: string;
  onThemeChange: (themeId: string) => void;
  selectedDisplayMode?: DisplayMode;
  onDisplayModeChange?: (mode: DisplayMode) => void;
}

// Animated theme preview component
function ThemePreview({ theme, isActive }: { theme: ThemeOption, isActive: boolean }) {
  const previewDots = Array.from({ length: 10 }, (_, i) => ({
    id: i,
    top: 12 + (i % 5) * 16,
    left: 12 + Math.floor(i / 5) * 38,
  }));

  return (
    <div className="relative w-full h-full overflow-hidden rounded-lg">
      {/* Base preview background */}
      {theme.kind === 'minimal' && (
        <div className="absolute inset-0" style={{ backgroundColor: theme.solidColor }} />
      )}

      {theme.kind === 'quantum' && (
        <motion.div
          className="absolute inset-0"
          style={{
            backgroundImage: theme.quantumGradient,
            backgroundSize: '220% 220%',
          }}
          animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      {theme.kind === 'warp' && (
        <div className="absolute inset-0 overflow-hidden bg-slate-950">
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-950 to-black" />
          {previewDots.map((dot) => (
            <motion.div
              key={dot.id}
              className="absolute w-[2px] h-6 rounded-full bg-white/85"
              style={{ top: `${dot.top}%`, left: `${dot.left}%` }}
              animate={{
                scaleY: [0.2, 1.2, 0.2],
                opacity: [0.2, 1, 0.2],
                x: [-4, 4, -4],
              }}
              transition={{ duration: 1.4 + dot.id * 0.08, repeat: Infinity, ease: 'easeInOut' }}
            />
          ))}
          <div
            className="absolute inset-0"
            style={{
              backgroundColor: theme.warpTint,
              mixBlendMode: 'soft-light',
              opacity: 0.55,
            }}
          />
        </div>
      )}

      {theme.kind === 'emoji' && (
        <div className="absolute inset-0 overflow-hidden" style={{ backgroundColor: theme.bgColor || '#0F172A' }}>
          {previewDots.map((dot) => (
            <motion.span
              key={dot.id}
              className="absolute select-none"
              style={{
                top: `${dot.top}%`,
                left: `${dot.left}%`,
                fontSize: '18px',
                opacity: 0.22,
              }}
              animate={{ y: [0, -8, 0], opacity: [0.12, 0.28, 0.12] }}
              transition={{ duration: 2.2 + dot.id * 0.1, repeat: Infinity, ease: 'easeInOut' }}
            >
              {theme.emoji}
            </motion.span>
          ))}
        </div>
      )}

      {theme.kind === 'confetti' && (
        <div className="absolute inset-0 overflow-hidden" style={{ backgroundColor: theme.bgColor || '#111417' }}>
          {previewDots.slice(0, 8).map((dot, index) => {
            const palette = theme.confettiPalette || ['#8ed47a', '#86c9ff', '#b69bff', '#ffd27f'];
            const particleColor = palette[index % palette.length];
            return (
              <motion.span
                key={dot.id}
                className="absolute block h-2.5 w-2.5 rounded-sm"
                style={{
                  top: `${dot.top}%`,
                  left: `${dot.left}%`,
                  backgroundColor: particleColor,
                }}
                animate={{
                  x: [0, index % 2 === 0 ? 10 : -10, 0],
                  y: [0, -6, 0],
                  rotate: [0, 100, 210],
                  opacity: [0.45, 0.95, 0.45],
                }}
                transition={{ duration: 1.5 + index * 0.08, repeat: Infinity, ease: 'easeInOut' }}
              />
            );
          })}
        </div>
      )}

      {theme.kind === 'legacy' && (
        <div className={`absolute inset-0 bg-gradient-to-br ${theme.gradient} opacity-65`} />
      )}
      
      {/* Animated overlay based on theme */}
      {theme.kind === 'legacy' && theme.id === 'matrix-code' && (
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
      
      {theme.kind === 'legacy' && theme.id === 'warp-speed' && (
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
      
      {theme.kind === 'legacy' && theme.id === 'aurora' && (
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
      
      {theme.kind === 'legacy' && theme.id === 'fireflies' && (
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
      
      {theme.kind === 'legacy' && theme.id === 'fire-storm' && (
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
      
      <div className="absolute inset-0 bg-black/25" />
      {isActive && <div className="absolute inset-0 rounded-lg ring-1 ring-white/45" />}
    </div>
  );
}

export function ThemeSelector({
  selectedTheme,
  onThemeChange,
  selectedDisplayMode = 'auto',
  onDisplayModeChange,
}: ThemeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<UICategoryId>(getUiCategoryForTheme(selectedTheme));
  const [emojiValue, setEmojiValue] = useState('🔥');
  const [emojiBgColor, setEmojiBgColor] = useState('#0F172A');
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [isStylePickerOpen, setIsStylePickerOpen] = useState(false);
  const [isDisplayPickerOpen, setIsDisplayPickerOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const effectiveDisplayMode: "light" | "dark" = selectedDisplayMode === "light" ? "light" : "dark";
  
  const currentTheme = resolveThemeById(selectedTheme) || allThemes[0];
  const visibleThemes = useMemo(() => getThemesForUiCategory(activeCategory), [activeCategory]);

  useEffect(() => {
    const parsedCustom = parseCustomEmojiThemeId(selectedTheme);
    if (parsedCustom) {
      setEmojiValue(parsedCustom.emoji);
      setEmojiBgColor(parsedCustom.backgroundColor);
      return;
    }

    const selected = resolveThemeById(selectedTheme);
    if (selected?.kind === 'emoji') {
      setEmojiValue(selected.emoji || '🔥');
      setEmojiBgColor(selected.bgColor || '#0F172A');
    }
  }, [selectedTheme]);

  useEffect(() => {
    if (isOpen) {
      setActiveCategory(getUiCategoryForTheme(selectedTheme));
    } else {
      setIsColorPickerOpen(false);
      setIsStylePickerOpen(false);
      setIsDisplayPickerOpen(false);
    }
  }, [isOpen, selectedTheme]);

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
    if (themeId === 'emoji-custom') {
      onThemeChange(buildCustomEmojiThemeId(emojiValue, emojiBgColor));
      return;
    }

    onThemeChange(themeId);
    // Don't auto-close - let user explore themes
  };

  const handleCustomEmojiChange = (nextEmoji: string, nextColor: string) => {
    setEmojiValue(nextEmoji);
    setEmojiBgColor(nextColor);
    onThemeChange(buildCustomEmojiThemeId(nextEmoji, nextColor));
  };

  const selectedStyleValue = isCustomEmojiThemeId(selectedTheme)
    ? 'emoji-custom'
    : (visibleThemes.find((theme) => theme.id === selectedTheme)?.id ?? visibleThemes[0]?.id ?? '');

  const isStyleDisabled = activeCategory !== 'emoji';
  const isQuantumCategory = activeCategory === 'quantum';

  const colorSwatches = activeCategory === 'emoji'
    ? emojiBackgroundChoices.map((option) => ({
        id: option.value,
        value: option.value,
        color: option.value,
        active: emojiBgColor === option.value,
      }))
    : categoryColorThemeMap[activeCategory]
        .map((themeId) => resolveThemeById(themeId))
        .filter((theme): theme is ThemeOption => Boolean(theme))
        .map((theme) => ({
          id: theme.id,
          value: theme.id,
          color: theme.solidColor || theme.warpTint || theme.accentColor || '#94a3b8',
          active: selectedStyleValue === theme.id,
        }));

  const activeColor = colorSwatches.find((swatch) => swatch.active) || colorSwatches[0];

  return (
    <>
      {/* Theme selector trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="w-full focus:outline-none"
      >
        <div className="rounded-lg border border-white/10 bg-slate-900 px-2.5 py-2 transition-colors duration-150 hover:border-white/20">
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-white/20">
              <ThemePreview theme={currentTheme} isActive={false} />
            </div>

            <div className="flex-1 text-left">
              <p className="text-white/50 text-[11px]">Theme</p>
              <p className="text-white text-sm font-medium leading-tight">{currentTheme.name}</p>
            </div>

            <span className="text-white/35 text-[11px]">Edit</span>
          </div>
        </div>
      </button>

      {/* Bottom Sheet Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={panelRef}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed bottom-0 left-0 right-0 z-50 max-h-[85vh] overflow-visible"
          >
            <div className="bg-[#1a1307]/68 backdrop-blur-md border-t border-white/10 rounded-t-2xl">
              <div className="flex justify-center pt-2 pb-1">
                <div className="h-1 w-16 rounded-full bg-white/40" />
              </div>

              {/* Header */}
              <div className="relative flex items-center justify-center px-5 pt-3 pb-1.5">
                <div className="text-center">
                  <h2 className="text-white/85 text-sm font-normal">Theme</h2>
                  <p className="text-white/40 text-[11px]">Choose style</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-md hover:bg-white/10 flex items-center justify-center transition-colors duration-150 focus:outline-none"
                >
                  <X className="w-4 h-4 text-white/65" />
                </button>
              </div>

              <div className="px-5 pb-4">
                {/* Category icons row */}
                <div className="relative flex justify-center gap-6 overflow-x-auto overflow-y-visible whitespace-nowrap pt-1 pb-3 scrollbar-hide">
                  <div className="pointer-events-none absolute left-1/2 top-0 h-full w-[38%] -translate-x-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent blur-xl" />
                  {uiCategories.map((category) => {
                    const isCategoryActive = category.id === activeCategory;
                    const previewTheme = getThemesForUiCategory(category.id)[0] || currentTheme;
                    return (
                      <motion.button
                        key={category.id}
                        type="button"
                        onClick={() => {
                          setActiveCategory(category.id);
                          const randomThemeId = getRandomThemeIdForCategory(category.id);
                          if (randomThemeId) {
                            handleThemeSelect(randomThemeId);
                          }
                        }}
                        whileHover={{ scale: 1.02 }}
                        animate={{ scale: isCategoryActive ? 1.05 : 1 }}
                        transition={{ duration: 0.18 }}
                        className="relative z-10 flex-shrink-0 flex flex-col items-center focus:outline-none"
                      >
                        <div
                          className={`w-16 aspect-[5/4] rounded-md overflow-hidden border shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] transition-all ${
                            isCategoryActive ? 'border-white/75' : 'border-white/35'
                          }`}
                        >
                          <ThemePreview theme={previewTheme} isActive={false} />
                        </div>
                        <p className={`mt-1 text-[10px] ${isCategoryActive ? 'text-white/90' : 'text-white/55'}`}>
                          {category.label}
                        </p>
                      </motion.button>
                    );
                  })}
                </div>

                {/* Inline controls (last) */}
                <div className="mt-4 flex justify-center overflow-visible">
                  <div className="flex items-center gap-2 overflow-visible whitespace-nowrap pb-1">
                    <label className="relative inline-flex min-w-[290px] items-center gap-2 rounded-md border border-white/20 bg-white/[0.04] px-3 py-2.5 text-[11px] text-white/70">
                      <span className="h-3.5 w-3.5 rounded-full bg-amber-300/90" />
                      <span>Colour</span>
                      <button
                        type="button"
                        onClick={() => {
                          setIsColorPickerOpen((prev) => !prev);
                          setIsStylePickerOpen(false);
                          setIsDisplayPickerOpen(false);
                        }}
                        className="ml-auto inline-flex items-center rounded-md border border-white/20 bg-white/[0.03] px-2 py-1 text-white/80"
                      >
                        <span className="h-3.5 w-3.5 rounded-full border border-white/40" style={{ backgroundColor: activeColor?.color || '#94a3b8' }} />
                      </button>

                      {isColorPickerOpen && (
                        <>
                          {isQuantumCategory ? (
                            <div className="absolute left-1/2 bottom-full z-30 mb-2 w-[470px] -translate-x-1/2 rounded-lg border border-slate-300 bg-slate-100 p-4 shadow-[0_8px_24px_rgba(0,0,0,0.2)]">
                              <div className="grid grid-cols-4 gap-x-5 gap-y-4">
                                {visibleThemes.map((theme) => {
                                  const isActiveQuantum = selectedStyleValue === theme.id;
                                  const previewBg = quantumPalette[theme.id] || (theme.quantumGradient || 'linear-gradient(90deg, #8b5cf6, #22d3ee)');
                                  return (
                                    <button
                                      key={theme.id}
                                      type="button"
                                      onClick={() => {
                                        handleThemeSelect(theme.id);
                                        setIsColorPickerOpen(false);
                                      }}
                                      className="flex flex-col items-center gap-1.5"
                                    >
                                      <span
                                        className={`
                                          h-16 w-16 rounded-full border transition-all duration-150
                                          ${isActiveQuantum ? 'border-black ring-2 ring-black/70 ring-offset-2 ring-offset-slate-100' : 'border-slate-300 hover:border-slate-500'}
                                        `}
                                        style={{
                                          backgroundImage: previewBg,
                                          backgroundSize: '220% 220%',
                                          animation: 'gradient-shift 8s ease-in-out infinite',
                                        }}
                                      />
                                      <span className={`text-[10px] ${isActiveQuantum ? 'text-slate-900 font-medium' : 'text-slate-500'}`}>
                                        {theme.name}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ) : (
                            <div className="absolute right-0 bottom-full z-30 mb-2 w-[230px] rounded-lg border border-slate-300 bg-slate-100 p-2 shadow-[0_8px_24px_rgba(0,0,0,0.2)]">
                              <div className="flex flex-wrap gap-2">
                                {colorSwatches.map((swatch) => (
                                  <button
                                    key={swatch.id}
                                    type="button"
                                    onClick={() => {
                                      if (activeCategory === 'emoji') {
                                        handleCustomEmojiChange(emojiValue, swatch.value);
                                      } else {
                                        handleThemeSelect(swatch.value);
                                      }
                                      setIsColorPickerOpen(false);
                                    }}
                                    className={`
                                      h-7 w-7 rounded-full border transition-all duration-150
                                      ${swatch.active ? 'border-[#ffd37a] ring-2 ring-[#ffd37a]/60' : 'border-slate-300 hover:border-slate-500'}
                                    `}
                                    style={{ backgroundColor: swatch.color }}
                                    aria-label={`Select color ${swatch.color}`}
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </label>

                    <label className="relative inline-flex min-w-[185px] items-center gap-2 rounded-md border border-white/20 bg-white/[0.04] px-3 py-2.5 text-[11px] text-white/70">
                      <span className="h-3.5 w-3.5 rounded-full bg-white/20" />
                      <span>Style</span>

                      {activeCategory === 'emoji' ? (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setIsStylePickerOpen((prev) => !prev);
                              setIsColorPickerOpen(false);
                              setIsDisplayPickerOpen(false);
                            }}
                            className="ml-auto inline-flex items-center gap-2 rounded-md border border-white/20 bg-white/[0.03] px-2 py-1 text-white/80"
                          >
                            <span className="text-sm leading-none">{emojiValue}</span>
                          </button>

                          {isStylePickerOpen && (
                            <div className="absolute right-0 bottom-full z-30 mb-2 w-[300px] rounded-lg border border-slate-300 bg-slate-100 p-3 shadow-[0_8px_24px_rgba(0,0,0,0.2)]">
                              <div className="grid grid-cols-5 gap-2">
                                {emojiChoices.map((emoji) => {
                                  const isActiveEmoji = emojiValue === emoji;
                                  return (
                                    <button
                                      key={emoji}
                                      type="button"
                                      onClick={() => {
                                        handleCustomEmojiChange(emoji, emojiBgColor);
                                        setIsStylePickerOpen(false);
                                      }}
                                      className={`
                                        flex h-11 w-11 items-center justify-center rounded-full border text-lg leading-none transition-all duration-150
                                        ${isActiveEmoji
                                          ? 'border-black ring-2 ring-black/70 ring-offset-2 ring-offset-slate-100 bg-white'
                                          : 'border-slate-300 bg-white hover:border-slate-500'
                                        }
                                      `}
                                    >
                                      {emoji}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <select
                          value={selectedStyleValue}
                          onChange={(event) => handleThemeSelect(event.target.value)}
                          disabled={isStyleDisabled}
                          className={`
                            ml-auto rounded-md border border-white/20 bg-white/[0.03] px-2 py-1 text-[11px] focus:outline-none
                            ${isStyleDisabled ? 'text-white/35 cursor-not-allowed' : 'text-white/75'}
                          `}
                        >
                          {isStyleDisabled ? (
                            <option value={selectedStyleValue} className="bg-slate-900 text-white">-</option>
                          ) : (
                            visibleThemes.map((theme) => (
                              <option key={theme.id} value={theme.id} className="bg-slate-900 text-white">
                                {theme.name}
                              </option>
                            ))
                          )}
                        </select>
                      )}
                    </label>

                    <label className="relative inline-flex min-w-[185px] items-center gap-2 rounded-md border border-white/20 bg-white/[0.04] px-3 py-2.5 text-[11px] text-white/70">
                      <span className="h-3.5 w-3.5 rounded-full border border-white/40" />
                      <span>Display</span>
                      <button
                        type="button"
                        onClick={() => {
                          setIsDisplayPickerOpen((prev) => !prev);
                          setIsColorPickerOpen(false);
                          setIsStylePickerOpen(false);
                        }}
                        className="ml-auto inline-flex items-center gap-2 rounded-md border border-white/20 bg-white/[0.03] px-2 py-1 text-white/80"
                      >
                        {effectiveDisplayMode === "light" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                        <span className="capitalize">{effectiveDisplayMode}</span>
                      </button>

                      {isDisplayPickerOpen && (
                        <div className="absolute right-0 bottom-full z-30 mb-2 w-[250px] rounded-lg border border-slate-300 bg-slate-100 p-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.2)]">
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                onDisplayModeChange?.("light");
                                setIsDisplayPickerOpen(false);
                              }}
                              className={`flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-[12px] font-medium transition-all ${
                                effectiveDisplayMode === "light"
                                  ? "border-black bg-white text-slate-900 ring-2 ring-black/70 ring-offset-1 ring-offset-slate-100"
                                  : "border-slate-300 bg-white text-slate-700 hover:border-slate-500"
                              }`}
                            >
                              <Sun className="h-4 w-4" />
                              Light
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                onDisplayModeChange?.("dark");
                                setIsDisplayPickerOpen(false);
                              }}
                              className={`flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-[12px] font-medium transition-all ${
                                effectiveDisplayMode === "dark"
                                  ? "border-black bg-white text-slate-900 ring-2 ring-black/70 ring-offset-1 ring-offset-slate-100"
                                  : "border-slate-300 bg-white text-slate-700 hover:border-slate-500"
                              }`}
                            >
                              <Moon className="h-4 w-4" />
                              Dark
                            </button>
                          </div>
                        </div>
                      )}
                    </label>
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
