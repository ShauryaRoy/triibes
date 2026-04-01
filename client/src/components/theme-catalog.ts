export type ThemeCategoryId = 'minimal' | 'quantum' | 'warp' | 'emoji' | 'confetti' | 'others';
export type ThemeRenderKind = 'minimal' | 'quantum' | 'warp' | 'emoji' | 'confetti' | 'legacy';

export interface ThemeOption {
  id: string;
  name: string;
  description: string;
  category: ThemeCategoryId;
  kind: ThemeRenderKind;
  accentColor: string;
  gradient?: string;
  bgColor?: string;
  solidColor?: string;
  quantumGradient?: string;
  warpTint?: string;
  emoji?: string;
  confettiShape?: 'star' | 'heart' | 'party' | 'circle';
  confettiPalette?: string[];
}

export interface ThemeCategory {
  id: ThemeCategoryId;
  label: string;
  themes: ThemeOption[];
}

export const CUSTOM_EMOJI_THEME_PREFIX = 'emoji-custom:';
export const CUSTOM_CONFETTI_THEME_PREFIX = 'confetti-custom:';

export const emojiChoices = ['🔥', '🎉', '✨', '💖', '🌙', '🎵', '🚀', '😎', '🎯', '🌈'];

export const emojiBackgroundChoices = [
  { name: 'Slate', value: '#0F172A' },
  { name: 'Midnight', value: '#111827' },
  { name: 'Plum', value: '#3B1E54' },
  { name: 'Berry', value: '#4C1429' },
  { name: 'Ocean', value: '#132C54' },
  { name: 'Forest', value: '#163612' },
  { name: 'Charcoal', value: '#2A2E32' },
  { name: 'Rosewood', value: '#5B2333' },
];

export const confettiBackgroundChoices = [
  { name: 'Graphite', value: '#111417' },
  { name: 'Ink', value: '#131313' },
  { name: 'Night Plum', value: '#15131A' },
  { name: 'Deep Ocean', value: '#10151D' },
  { name: 'Midnight', value: '#0F172A' },
  { name: 'Slate', value: '#1F2937' },
  { name: 'Forest', value: '#163612' },
  { name: 'Rosewood', value: '#4C1429' },
];

export const confettiPaletteChoices = [
  { id: 'sunset-pop', name: 'Sunset Pop', colors: ['#f8d15a', '#ffd27d', '#ffae57', '#fff1b2'] },
  { id: 'candy-heart', name: 'Candy Heart', colors: ['#ff7ca5', '#ffa0bf', '#ff8f7c', '#ffd1dc'] },
  { id: 'electric-party', name: 'Electric Party', colors: ['#7cc7ff', '#71e4d4', '#9d8aff', '#ffd67b'] },
  { id: 'mint-fizz', name: 'Mint Fizz', colors: ['#8ed47a', '#86c9ff', '#b69bff', '#ffd27f'] },
  { id: 'coral-citrus', name: 'Coral Citrus', colors: ['#ff8a65', '#ffd166', '#ff5d8f', '#ffe8a3'] },
  { id: 'cool-neon', name: 'Cool Neon', colors: ['#67e8f9', '#22d3ee', '#818cf8', '#a3e635'] },
];

const DEFAULT_CONFETTI_PALETTE_ID = 'mint-fizz';

const getConfettiPaletteById = (paletteId?: string): string[] => {
  return confettiPaletteChoices.find((choice) => choice.id === paletteId)?.colors || confettiPaletteChoices.find((choice) => choice.id === DEFAULT_CONFETTI_PALETTE_ID)?.colors || confettiPaletteChoices[0].colors;
};

const normalizeHexColor = (color: string, fallback: string): string => {
  const sanitizedColor = color.replace('#', '').toUpperCase();
  const normalizedFallback = fallback.replace('#', '').toUpperCase();
  return /^[0-9A-F]{6}$/.test(sanitizedColor) ? sanitizedColor : normalizedFallback;
};

const minimalThemes: ThemeOption[] = [
  {
    id: 'minimal-obsidian',
    name: 'Obsidian',
    description: 'Solid graphite minimal',
    category: 'minimal',
    kind: 'minimal',
    solidColor: '#2A2E32',
    accentColor: '#9CA3AF',
  },
  {
    id: 'minimal-berry',
    name: 'Berry Noir',
    description: 'Deep berry minimal',
    category: 'minimal',
    kind: 'minimal',
    solidColor: '#4C1429',
    accentColor: '#F472B6',
  },
  {
    id: 'minimal-plum',
    name: 'Plum Shadow',
    description: 'Muted plum minimal',
    category: 'minimal',
    kind: 'minimal',
    solidColor: '#392147',
    accentColor: '#C084FC',
  },
  {
    id: 'minimal-indigo',
    name: 'Indigo Static',
    description: 'Calm indigo minimal',
    category: 'minimal',
    kind: 'minimal',
    solidColor: '#2A2458',
    accentColor: '#A5B4FC',
  },
  {
    id: 'minimal-midnight',
    name: 'Midnight Blue',
    description: 'Dark navy minimal',
    category: 'minimal',
    kind: 'minimal',
    solidColor: '#132C54',
    accentColor: '#60A5FA',
  },
  {
    id: 'minimal-forest',
    name: 'Forest Ink',
    description: 'Evergreen minimal',
    category: 'minimal',
    kind: 'minimal',
    solidColor: '#163612',
    accentColor: '#34D399',
  },
];

export const getRandomMinimalThemeId = (): string => {
  if (minimalThemes.length === 0) return 'minimal-obsidian';
  const randomIndex = Math.floor(Math.random() * minimalThemes.length);
  return minimalThemes[randomIndex]?.id || 'minimal-obsidian';
};

const quantumThemes: ThemeOption[] = [
  {
    id: 'quantum-dreamy',
    name: 'Dreamy',
    description: 'Cool ocean mesh',
    category: 'quantum',
    kind: 'quantum',
    quantumGradient: 'radial-gradient(at 20% 30%, rgb(28,163,155) 0%, transparent 50%), radial-gradient(at 80% 20%, rgb(32,91,173) 0%, transparent 50%), radial-gradient(at 30% 80%, rgb(18,45,120) 0%, transparent 60%), radial-gradient(at 70% 70%, rgb(15,120,110) 0%, transparent 60%), rgb(10,20,40)',
    accentColor: '#20a5aa',
  },
  {
    id: 'quantum-summer',
    name: 'Summer',
    description: 'Blue-gold mesh',
    category: 'quantum',
    kind: 'quantum',
    quantumGradient: 'radial-gradient(at 20% 30%, rgb(210,170,40) 0%, transparent 50%), radial-gradient(at 80% 20%, rgb(25,90,170) 0%, transparent 50%), radial-gradient(at 30% 80%, rgb(180,140,30) 0%, transparent 60%), radial-gradient(at 70% 70%, rgb(10,60,120) 0%, transparent 60%), rgb(20,30,50)',
    accentColor: '#d2aa28',
  },
  {
    id: 'quantum-melon',
    name: 'Melon',
    description: 'Warm amber mesh',
    category: 'quantum',
    kind: 'quantum',
    quantumGradient: 'radial-gradient(at 20% 30%, rgb(180,150,40) 0%, transparent 50%), radial-gradient(at 80% 20%, rgb(140,90,20) 0%, transparent 50%), radial-gradient(at 30% 80%, rgb(120,70,10) 0%, transparent 60%), radial-gradient(at 70% 70%, rgb(200,120,30) 0%, transparent 60%), rgb(40,25,10)',
    accentColor: '#b49628',
  },
  {
    id: 'quantum-barbie',
    name: 'Barbie',
    description: 'Magenta-gold mesh',
    category: 'quantum',
    kind: 'quantum',
    quantumGradient: 'radial-gradient(at 20% 30%, rgb(160,40,120) 0%, transparent 50%), radial-gradient(at 80% 20%, rgb(120,20,80) 0%, transparent 50%), radial-gradient(at 30% 80%, rgb(200,150,40) 0%, transparent 60%), radial-gradient(at 70% 70%, rgb(140,30,100) 0%, transparent 60%), rgb(40,10,30)',
    accentColor: '#a02878',
  },
  {
    id: 'quantum-sunset',
    name: 'Sunset',
    description: 'Warm blue-gold mesh',
    category: 'quantum',
    kind: 'quantum',
    quantumGradient: 'radial-gradient(at 20% 30%, rgb(210,170,40) 0%, transparent 50%), radial-gradient(at 80% 20%, rgb(25,90,170) 0%, transparent 50%), radial-gradient(at 30% 80%, rgb(180,140,30) 0%, transparent 60%), radial-gradient(at 70% 70%, rgb(10,60,120) 0%, transparent 60%), rgb(20,30,50)',
    accentColor: '#d2aa28',
  },
  {
    id: 'quantum-ocean',
    name: 'Ocean',
    description: 'Cool ocean mesh',
    category: 'quantum',
    kind: 'quantum',
    quantumGradient: 'radial-gradient(at 20% 30%, rgb(28,163,155) 0%, transparent 50%), radial-gradient(at 80% 20%, rgb(32,91,173) 0%, transparent 50%), radial-gradient(at 30% 80%, rgb(18,45,120) 0%, transparent 60%), radial-gradient(at 70% 70%, rgb(15,120,110) 0%, transparent 60%), rgb(10,20,40)',
    accentColor: '#20a5aa',
  },
  {
    id: 'quantum-forest',
    name: 'Forest',
    description: 'Red-green contrast mesh',
    category: 'quantum',
    kind: 'quantum',
    quantumGradient: 'radial-gradient(at 20% 30%, rgb(190,40,20) 0%, transparent 50%), radial-gradient(at 80% 20%, rgb(30,140,50) 0%, transparent 50%), radial-gradient(at 30% 80%, rgb(120,20,10) 0%, transparent 60%), radial-gradient(at 70% 70%, rgb(20,90,40) 0%, transparent 60%), rgb(30,20,20)',
    accentColor: '#1e8c32',
  },
  {
    id: 'quantum-lavender',
    name: 'Lavender',
    description: 'Magenta-gold mesh',
    category: 'quantum',
    kind: 'quantum',
    quantumGradient: 'radial-gradient(at 20% 30%, rgb(160,40,120) 0%, transparent 50%), radial-gradient(at 80% 20%, rgb(120,20,80) 0%, transparent 50%), radial-gradient(at 30% 80%, rgb(200,150,40) 0%, transparent 60%), radial-gradient(at 70% 70%, rgb(140,30,100) 0%, transparent 60%), rgb(40,10,30)',
    accentColor: '#a02878',
  },
];

const warpThemes: ThemeOption[] = [
  {
    id: 'warp-orange',
    name: 'Warp Orange',
    description: 'Light-speed with amber tint',
    category: 'warp',
    kind: 'warp',
    warpTint: '#F97316',
    accentColor: '#F97316',
  },
  {
    id: 'warp-pink',
    name: 'Warp Pink',
    description: 'Light-speed with pink tint',
    category: 'warp',
    kind: 'warp',
    warpTint: '#EC4899',
    accentColor: '#EC4899',
  },
  {
    id: 'warp-blue',
    name: 'Warp Blue',
    description: 'Light-speed with blue tint',
    category: 'warp',
    kind: 'warp',
    warpTint: '#3B82F6',
    accentColor: '#3B82F6',
  },
  {
    id: 'warp-cyan',
    name: 'Warp Cyan',
    description: 'Light-speed with cyan tint',
    category: 'warp',
    kind: 'warp',
    warpTint: '#06B6D4',
    accentColor: '#06B6D4',
  },
  {
    id: 'warp-violet',
    name: 'Warp Violet',
    description: 'Light-speed with violet tint',
    category: 'warp',
    kind: 'warp',
    warpTint: '#8B5CF6',
    accentColor: '#8B5CF6',
  },
];

const emojiThemes: ThemeOption[] = [
  {
    id: 'emoji-custom',
    name: 'Custom Emoji',
    description: 'Pick emoji + background color',
    category: 'emoji',
    kind: 'emoji',
    emoji: '🔥',
    bgColor: '#0F172A',
    accentColor: '#FB923C',
  },
  {
    id: 'emoji-sparkles',
    name: 'Sparkles',
    description: 'Subtle sparkle drift',
    category: 'emoji',
    kind: 'emoji',
    emoji: '✨',
    bgColor: '#0F172A',
    accentColor: '#FACC15',
  },
  {
    id: 'emoji-party',
    name: 'Party',
    description: 'Soft celebration energy',
    category: 'emoji',
    kind: 'emoji',
    emoji: '🎉',
    bgColor: '#1F2937',
    accentColor: '#F472B6',
  },
  {
    id: 'emoji-heart',
    name: 'Heart',
    description: 'Gentle heart ambience',
    category: 'emoji',
    kind: 'emoji',
    emoji: '💖',
    bgColor: '#3B1E54',
    accentColor: '#FB7185',
  },
  {
    id: 'emoji-fire',
    name: 'Fire',
    description: 'Low-key fire pattern',
    category: 'emoji',
    kind: 'emoji',
    emoji: '🔥',
    bgColor: '#4C1429',
    accentColor: '#FB923C',
  },
  {
    id: 'emoji-moon',
    name: 'Moon',
    description: 'Dreamy moon pattern',
    category: 'emoji',
    kind: 'emoji',
    emoji: '🌙',
    bgColor: '#132C54',
    accentColor: '#93C5FD',
  },
  {
    id: 'emoji-music',
    name: 'Music',
    description: 'Floating note rhythm',
    category: 'emoji',
    kind: 'emoji',
    emoji: '🎵',
    bgColor: '#2A2458',
    accentColor: '#A78BFA',
  },
];

const confettiThemes: ThemeOption[] = [
  {
    id: 'confetti-custom',
    name: 'Custom Confetti',
    description: 'Pick background + confetti palette',
    category: 'confetti',
    kind: 'confetti',
    confettiShape: 'circle',
    confettiPalette: ['#8ed47a', '#86c9ff', '#b69bff', '#ffd27f'],
    accentColor: '#8ed47a',
    bgColor: '#111417',
  },
  {
    id: 'confetti-star',
    name: 'Star',
    description: 'Crisp star pops from the sides',
    category: 'confetti',
    kind: 'confetti',
    confettiShape: 'star',
    confettiPalette: ['#f8d15a', '#ffd27d', '#ffae57', '#fff1b2'],
    accentColor: '#f8d15a',
    bgColor: '#131313',
  },
  {
    id: 'confetti-heart',
    name: 'Heart',
    description: 'Soft heart confetti with subtle flow',
    category: 'confetti',
    kind: 'confetti',
    confettiShape: 'heart',
    confettiPalette: ['#ff7ca5', '#ffa0bf', '#ff8f7c', '#ffd1dc'],
    accentColor: '#ff7ca5',
    bgColor: '#15131a',
  },
  {
    id: 'confetti-party',
    name: 'Party',
    description: 'Irregular polished shard bursts',
    category: 'confetti',
    kind: 'confetti',
    confettiShape: 'party',
    confettiPalette: ['#7cc7ff', '#71e4d4', '#9d8aff', '#ffd67b'],
    accentColor: '#7cc7ff',
    bgColor: '#10151d',
  },
  {
    id: 'confetti-circle',
    name: 'Circle',
    description: 'Minimal circular side pops',
    category: 'confetti',
    kind: 'confetti',
    confettiShape: 'circle',
    confettiPalette: ['#8ed47a', '#86c9ff', '#b69bff', '#ffd27f'],
    accentColor: '#8ed47a',
    bgColor: '#111417',
  },
];

const otherThemes: ThemeOption[] = [
  {
    id: 'matrix-code',
    name: 'Matrix',
    description: 'Digital rain cascade',
    category: 'others',
    kind: 'legacy',
    gradient: 'from-green-600 via-emerald-500 to-green-400',
    bgColor: 'bg-black',
    accentColor: '#22c55e',
  },
  {
    id: 'warp-speed',
    name: 'Warp',
    description: 'Hyperspace travel',
    category: 'others',
    kind: 'legacy',
    gradient: 'from-purple-600 via-violet-500 to-cyan-400',
    bgColor: 'bg-slate-950',
    accentColor: '#a855f7',
  },
  {
    id: 'aurora',
    name: 'Aurora',
    description: 'Northern lights dance',
    category: 'others',
    kind: 'legacy',
    gradient: 'from-green-400 via-purple-500 to-blue-500',
    bgColor: 'bg-slate-900',
    accentColor: '#8b5cf6',
  },
  {
    id: 'fireflies',
    name: 'Fireflies',
    description: 'Gentle floating lights',
    category: 'others',
    kind: 'legacy',
    gradient: 'from-amber-400 via-yellow-500 to-amber-600',
    bgColor: 'bg-slate-950',
    accentColor: '#f59e0b',
  },
  {
    id: 'fire-storm',
    name: 'Fire',
    description: 'Blazing intensity',
    category: 'others',
    kind: 'legacy',
    gradient: 'from-orange-600 via-red-500 to-yellow-500',
    bgColor: 'bg-slate-950',
    accentColor: '#ef4444',
  },
  {
    id: 'none',
    name: 'None',
    description: 'Clean & simple',
    category: 'others',
    kind: 'legacy',
    gradient: 'from-slate-600 via-slate-700 to-slate-800',
    bgColor: 'bg-slate-900',
    accentColor: '#64748b',
  },
];

export const themeCategories: ThemeCategory[] = [
  { id: 'minimal', label: 'Minimal', themes: minimalThemes },
  { id: 'quantum', label: 'Quantum', themes: quantumThemes },
  { id: 'warp', label: 'Warp', themes: warpThemes },
  { id: 'emoji', label: 'Emoji', themes: emojiThemes },
  { id: 'confetti', label: 'Confetti', themes: confettiThemes },
  { id: 'others', label: 'Others', themes: otherThemes },
];

export const allThemes: ThemeOption[] = themeCategories.flatMap((category) => category.themes);

export const isCustomEmojiThemeId = (themeId?: string): boolean => {
  if (!themeId) return false;
  return themeId.startsWith(CUSTOM_EMOJI_THEME_PREFIX);
};

export const isCustomConfettiThemeId = (themeId?: string): boolean => {
  if (!themeId) return false;
  return themeId.startsWith(CUSTOM_CONFETTI_THEME_PREFIX);
};

export const buildCustomEmojiThemeId = (emoji: string, backgroundColor: string): string => {
  const safeColor = normalizeHexColor(backgroundColor, '#0F172A');
  return `${CUSTOM_EMOJI_THEME_PREFIX}${encodeURIComponent(emoji)}:${safeColor}`;
};

export const parseCustomEmojiThemeId = (
  themeId?: string
): { emoji: string; backgroundColor: string } | null => {
  if (!themeId || !isCustomEmojiThemeId(themeId)) return null;
  const payload = themeId.slice(CUSTOM_EMOJI_THEME_PREFIX.length);
  const [encodedEmoji, colorRaw] = payload.split(':');
  if (!encodedEmoji || !colorRaw) return null;

  let emoji = '🔥';
  try {
    emoji = decodeURIComponent(encodedEmoji);
  } catch {
    emoji = '🔥';
  }

  const normalized = colorRaw.replace('#', '').toUpperCase();
  const backgroundColor = /^[0-9A-F]{6}$/.test(normalized) ? `#${normalized}` : '#0F172A';
  return { emoji, backgroundColor };
};

export const buildCustomConfettiThemeId = (
  shape: ThemeOption['confettiShape'],
  backgroundColor: string,
  paletteId: string
): string => {
  const safeShape = shape && ['star', 'heart', 'party', 'circle'].includes(shape) ? shape : 'circle';
  const safeBackground = normalizeHexColor(backgroundColor, '#111417');
  const safePaletteId = confettiPaletteChoices.some((choice) => choice.id === paletteId)
    ? paletteId
    : DEFAULT_CONFETTI_PALETTE_ID;

  // Keep id compact to fit theme_id varchar(50)
  return `${CUSTOM_CONFETTI_THEME_PREFIX}${safeShape}:${safeBackground}:${safePaletteId}`;
};

export const parseCustomConfettiThemeId = (
  themeId?: string
): { shape: 'star' | 'heart' | 'party' | 'circle'; backgroundColor: string; palette: string[]; paletteId: string } | null => {
  if (!themeId || !isCustomConfettiThemeId(themeId)) return null;

  const payload = themeId.slice(CUSTOM_CONFETTI_THEME_PREFIX.length);
  const [shapeRaw, backgroundRaw, paletteRaw] = payload.split(':');
  if (!shapeRaw || !backgroundRaw || !paletteRaw) return null;

  const shape = ['star', 'heart', 'party', 'circle'].includes(shapeRaw)
    ? (shapeRaw as 'star' | 'heart' | 'party' | 'circle')
    : 'circle';

  const normalizedBg = backgroundRaw.replace('#', '').toUpperCase();
  const backgroundColor = /^[0-9A-F]{6}$/.test(normalizedBg) ? `#${normalizedBg}` : '#111417';

  // New compact format uses palette id, but keep backward compatibility with old raw-color format.
  if (confettiPaletteChoices.some((choice) => choice.id === paletteRaw)) {
    return {
      shape,
      backgroundColor,
      palette: getConfettiPaletteById(paletteRaw),
      paletteId: paletteRaw,
    };
  }

  const legacyPalette = paletteRaw
    .split('-')
    .map((part) => part.replace('#', '').toUpperCase())
    .filter((part) => /^[0-9A-F]{6}$/.test(part))
    .slice(0, 4)
    .map((part) => `#${part}`);

  while (legacyPalette.length < 4) {
    legacyPalette.push('#8ED47A');
  }

  return {
    shape,
    backgroundColor,
    palette: legacyPalette,
    paletteId: DEFAULT_CONFETTI_PALETTE_ID,
  };
};

export const getThemeById = (themeId?: string): ThemeOption | undefined => {
  if (!themeId) return undefined;
  return allThemes.find((theme) => theme.id === themeId);
};

export const resolveThemeById = (themeId?: string): ThemeOption | undefined => {
  const directTheme = getThemeById(themeId);
  if (directTheme) return directTheme;

  const customEmoji = parseCustomEmojiThemeId(themeId);
  if (customEmoji) {
    return {
      id: themeId || 'emoji-custom',
      name: 'Custom Emoji',
      description: 'Pick emoji + background color',
      category: 'emoji',
      kind: 'emoji',
      emoji: customEmoji.emoji,
      bgColor: customEmoji.backgroundColor,
      accentColor: customEmoji.backgroundColor,
    };
  }

  const customConfetti = parseCustomConfettiThemeId(themeId);
  if (!customConfetti) {
    if (!isCustomConfettiThemeId(themeId)) return undefined;
    return {
      id: themeId || 'confetti-custom',
      name: 'Custom Confetti',
      description: 'Pick background + confetti palette',
      category: 'confetti',
      kind: 'confetti',
      confettiShape: 'circle',
      confettiPalette: getConfettiPaletteById(DEFAULT_CONFETTI_PALETTE_ID),
      bgColor: '#111417',
      accentColor: '#8ed47a',
    };
  }

  return {
    id: themeId || 'confetti-custom',
    name: 'Custom Confetti',
    description: 'Pick background + confetti palette',
    category: 'confetti',
    kind: 'confetti',
    confettiShape: customConfetti.shape,
    confettiPalette: customConfetti.palette,
    bgColor: customConfetti.backgroundColor,
    accentColor: customConfetti.palette[0] || customConfetti.backgroundColor,
  };
};

export const getCategoryForTheme = (themeId?: string): ThemeCategoryId => {
  const theme = resolveThemeById(themeId);
  return theme?.category ?? 'others';
};
