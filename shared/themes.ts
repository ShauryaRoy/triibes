export type ThemeCategory = 
  | 'minimal' 
  | 'confetti' 
  | 'emoji' 
  | 'pattern' 
  | 'seasonal' 
  | 'holiday' 
  | 'special-effects';

export interface EventTheme {
  id: string;
  name: string;
  category: ThemeCategory;
  preview: string; // Preview description
  
  // Minimal themes
  gradient?: string;
  solidColor?: string;
  
  // Confetti themes
  confettiType?: 'hearts' | 'stars' | 'circles' | 'sparkles' | 'emojis';
  confettiColors?: string[];
  
  // Emoji themes
  emojiPattern?: string;
  emojiSize?: 'small' | 'medium' | 'large';
  
  // Pattern themes
  patternType?: 'polkadot' | 'waves' | 'zigzag' | 'stripes' | 'grid' | 'hexagon';
  patternColor?: string;
  backgroundColor?: string;
  
  // Seasonal themes
  seasonalImage?: string;
  seasonalOverlay?: string;
  
  // Holiday themes
  holidayImage?: string;
  holidayOverlay?: string;
  
  // Special Effects
  effectType?: 'warp' | 'champagne' | 'bokeh' | 'particles' | 'matrix';
  effectIntensity?: 'low' | 'medium' | 'high';
  
  // Common properties
  textColor?: string;
  accent?: string;
  darkMode?: boolean;
}

export const eventThemes: EventTheme[] = [
  // === MINIMAL THEMES ===
  {
    id: 'quantum-light',
    name: 'Quantum Light',
    category: 'minimal',
    preview: 'Clean light gradient',
    gradient: 'from-slate-100 via-white to-slate-100',
    accent: '#6366f1',
    textColor: '#1f2937',
    darkMode: false,
  },
  {
    id: 'quantum-dark',
    name: 'Quantum Dark',
    category: 'minimal',
    preview: 'Sleek dark gradient',
    gradient: 'from-gray-900 via-gray-800 to-gray-900',
    accent: '#8b5cf6',
    textColor: '#ffffff',
    darkMode: true,
  },
  {
    id: 'ocean-breeze',
    name: 'Ocean Breeze',
    category: 'minimal',
    preview: 'Calming blue gradient',
    gradient: 'from-blue-400 via-cyan-400 to-teal-400',
    accent: '#0ea5e9',
    textColor: '#ffffff',
  },
  {
    id: 'sunset-glow',
    name: 'Sunset Glow',
    category: 'minimal',
    preview: 'Warm sunset colors',
    gradient: 'from-orange-400 via-red-400 to-pink-500',
    accent: '#f97316',
    textColor: '#ffffff',
  },
  {
    id: 'forest-mist',
    name: 'Forest Mist',
    category: 'minimal',
    preview: 'Natural green gradient',
    gradient: 'from-green-400 via-emerald-400 to-teal-500',
    accent: '#10b981',
    textColor: '#ffffff',
  },

  // === CONFETTI THEMES ===
  {
    id: 'hearts-confetti',
    name: 'Love Celebration',
    category: 'confetti',
    preview: 'Animated heart confetti',
    confettiType: 'hearts',
    confettiColors: ['#ff6b9d', '#ff8fab', '#ffadc6', '#ffc2d4'],
    backgroundColor: '#fdf2f8',
    accent: '#ec4899',
    textColor: '#be185d',
  },
  {
    id: 'stars-confetti',
    name: 'Starry Night',
    category: 'confetti',
    preview: 'Twinkling star confetti',
    confettiType: 'stars',
    confettiColors: ['#fbbf24', '#f59e0b', '#d97706', '#92400e'],
    backgroundColor: '#1e1b4b',
    accent: '#fbbf24',
    textColor: '#ffffff',
  },
  {
    id: 'sparkles-confetti',
    name: 'Magic Sparkles',
    category: 'confetti',
    preview: 'Magical sparkle animation',
    confettiType: 'sparkles',
    confettiColors: ['#a855f7', '#c084fc', '#d8b4fe', '#e9d5ff'],
    backgroundColor: '#581c87',
    accent: '#a855f7',
    textColor: '#ffffff',
  },
  {
    id: 'celebration-confetti',
    name: 'Party Time',
    category: 'confetti',
    preview: 'Colorful party confetti',
    confettiType: 'circles',
    confettiColors: ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6'],
    backgroundColor: '#fef3c7',
    accent: '#f97316',
    textColor: '#92400e',
  },

  // === EMOJI THEMES ===
  {
    id: 'gaming-emoji',
    name: 'Gaming Zone',
    category: 'emoji',
    preview: 'Gaming emojis pattern',
    emojiPattern: '🎮🕹️👾🎯🏆🎲',
    emojiSize: 'medium',
    backgroundColor: '#1e1b4b',
    accent: '#6366f1',
    textColor: '#ffffff',
  },
  {
    id: 'food-emoji',
    name: 'Foodie Paradise',
    category: 'emoji',
    preview: 'Delicious food emojis',
    emojiPattern: '🍕🍔🍟🌮🍜🍰🍩🍎',
    emojiSize: 'medium',
    backgroundColor: '#fed7d7',
    accent: '#e53e3e',
    textColor: '#742a2a',
  },
  {
    id: 'music-emoji',
    name: 'Music Vibes',
    category: 'emoji',
    preview: 'Musical emoji pattern',
    emojiPattern: '🎵🎶🎤🎸🥁🎹🎺🎼',
    emojiSize: 'medium',
    backgroundColor: '#e6fffa',
    accent: '#319795',
    textColor: '#234e52',
  },
  {
    id: 'travel-emoji',
    name: 'Adventure Time',
    category: 'emoji',
    preview: 'Travel and adventure',
    emojiPattern: '✈️🌍🏔️🏖️🚗🏕️🗺️📍',
    emojiSize: 'medium',
    backgroundColor: '#ebf8ff',
    accent: '#3182ce',
    textColor: '#2a4365',
  },

  // === PATTERN THEMES ===
  {
    id: 'polkadot-classic',
    name: 'Polka Dots',
    category: 'pattern',
    preview: 'Classic polka dot pattern',
    patternType: 'polkadot',
    patternColor: '#ffffff',
    backgroundColor: '#dc2626',
    accent: '#dc2626',
    textColor: '#ffffff',
  },
  {
    id: 'waves-ocean',
    name: 'Ocean Waves',
    category: 'pattern',
    preview: 'Flowing wave pattern',
    patternType: 'waves',
    patternColor: '#0ea5e9',
    backgroundColor: '#f0f9ff',
    accent: '#0ea5e9',
    textColor: '#0c4a6e',
  },
  {
    id: 'zigzag-electric',
    name: 'Electric Zigzag',
    category: 'pattern',
    preview: 'Dynamic zigzag pattern',
    patternType: 'zigzag',
    patternColor: '#eab308',
    backgroundColor: '#1f2937',
    accent: '#eab308',
    textColor: '#ffffff',
  },
  {
    id: 'hexagon-tech',
    name: 'Tech Hexagon',
    category: 'pattern',
    preview: 'Futuristic hexagon grid',
    patternType: 'hexagon',
    patternColor: '#06b6d4',
    backgroundColor: '#0f172a',
    accent: '#06b6d4',
    textColor: '#ffffff',
  },

  // === SEASONAL THEMES ===
  {
    id: 'autumn-leaves',
    name: 'Autumn Leaves',
    category: 'seasonal',
    preview: 'Colorful fall foliage',
    seasonalImage: '/themes/autumn-bg.jpg',
    seasonalOverlay: 'from-orange-900/60 to-red-900/60',
    accent: '#ea580c',
    textColor: '#ffffff',
  },
  {
    id: 'winter-snow',
    name: 'Winter Snow',
    category: 'seasonal',
    preview: 'Snowy winter scene',
    seasonalImage: '/themes/snow-bg.jpg',
    seasonalOverlay: 'from-blue-900/50 to-slate-900/50',
    accent: '#0ea5e9',
    textColor: '#ffffff',
  },
  {
    id: 'spring-bloom',
    name: 'Spring Bloom',
    category: 'seasonal',
    preview: 'Fresh spring flowers',
    seasonalImage: '/themes/spring-bg.jpg',
    seasonalOverlay: 'from-green-800/40 to-pink-800/40',
    accent: '#16a34a',
    textColor: '#ffffff',
  },
  {
    id: 'summer-pool',
    name: 'Summer Pool',
    category: 'seasonal',
    preview: 'Cool summer vibes',
    seasonalImage: '/themes/pool-bg.jpg',
    seasonalOverlay: 'from-cyan-900/50 to-blue-900/50',
    accent: '#0891b2',
    textColor: '#ffffff',
  },

  // === HOLIDAY THEMES ===
  {
    id: 'christmas-joy',
    name: 'Christmas Joy',
    category: 'holiday',
    preview: 'Festive Christmas spirit',
    holidayImage: '/themes/christmas-bg.jpg',
    holidayOverlay: 'from-red-900/60 to-green-900/60',
    accent: '#dc2626',
    textColor: '#ffffff',
  },
  {
    id: 'diwali-lights',
    name: 'Diwali Lights',
    category: 'holiday',
    preview: 'Festival of lights',
    holidayImage: '/themes/diwali-bg.jpg',
    holidayOverlay: 'from-yellow-900/50 to-orange-900/50',
    accent: '#f59e0b',
    textColor: '#ffffff',
  },
  {
    id: 'halloween-spook',
    name: 'Halloween Spook',
    category: 'holiday',
    preview: 'Spooky Halloween vibes',
    holidayImage: '/themes/halloween-bg.jpg',
    holidayOverlay: 'from-orange-900/70 to-purple-900/70',
    accent: '#ea580c',
    textColor: '#ffffff',
  },
  {
    id: 'new-year-fireworks',
    name: 'New Year Fireworks',
    category: 'holiday',
    preview: 'Celebration fireworks',
    holidayImage: '/themes/fireworks-bg.jpg',
    holidayOverlay: 'from-purple-900/50 to-blue-900/50',
    accent: '#8b5cf6',
    textColor: '#ffffff',
  },

  // === SPECIAL EFFECTS ===
  {
    id: 'warp-speed',
    name: 'Warp Speed',
    category: 'special-effects',
    preview: 'Sci-fi warp effect',
    effectType: 'warp',
    effectIntensity: 'high',
    backgroundColor: '#000000',
    accent: '#06b6d4',
    textColor: '#ffffff',
  },
  {
    id: 'champagne-bubbles',
    name: 'Champagne Bubbles',
    category: 'special-effects',
    preview: 'Elegant champagne bubbles',
    effectType: 'champagne',
    effectIntensity: 'medium',
    backgroundColor: '#fef3c7',
    accent: '#d97706',
    textColor: '#92400e',
  },
  {
    id: 'bokeh-lights',
    name: 'Bokeh Lights',
    category: 'special-effects',
    preview: 'Dreamy bokeh effect',
    effectType: 'bokeh',
    effectIntensity: 'medium',
    backgroundColor: '#1e1b4b',
    accent: '#a855f7',
    textColor: '#ffffff',
  },
  {
    id: 'matrix-code',
    name: 'Matrix Code',
    category: 'special-effects',
    preview: 'Digital matrix rain',
    effectType: 'matrix',
    effectIntensity: 'high',
    backgroundColor: '#000000',
    accent: '#22c55e',
    textColor: '#16a34a',
  },
  {
    id: 'electric-storm',
    name: 'Electric Storm',
    category: 'special-effects',
    preview: 'Lightning strikes and rain',
    effectType: 'particles',
    effectIntensity: 'high',
    backgroundColor: '#0f172a',
    gradient: 'from-slate-950 via-blue-950 to-cyan-950',
    accent: '#3b82f6',
    textColor: '#ffffff',
  },
  {
    id: 'fire-storm',
    name: 'Fire Storm',
    category: 'special-effects',
    preview: 'Blazing flames and floating embers',
    effectType: 'particles',
    effectIntensity: 'high',
    backgroundColor: '#7c2d12',
    gradient: 'from-orange-900 via-red-800 to-yellow-600',
    accent: '#f97316',
    textColor: '#ffffff',
  },
];

export const getThemesByCategory = (category: ThemeCategory): EventTheme[] => {
  return eventThemes.filter(theme => theme.category === category);
};

export const getThemeById = (id: string): EventTheme => {
  return eventThemes.find(theme => theme.id === id) || eventThemes[0];
};

export const getRandomTheme = (category?: ThemeCategory): EventTheme => {
  const themes = category ? getThemesByCategory(category) : eventThemes;
  return themes[Math.floor(Math.random() * themes.length)];
};

export const themeCategories = [
  { id: 'minimal', name: 'Minimal', description: 'Clean gradients and solid colors' },
  { id: 'confetti', name: 'Confetti', description: 'Animated celebrations' },
  { id: 'emoji', name: 'Emoji', description: 'Fun emoji patterns' },
  { id: 'pattern', name: 'Pattern', description: 'Geometric designs' },
  { id: 'seasonal', name: 'Seasonal', description: 'Nature and seasons' },
  { id: 'holiday', name: 'Holiday', description: 'Festive celebrations' },
  { id: 'special-effects', name: 'Special Effects', description: 'Animated effects' },
] as const;
