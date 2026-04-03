import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Upload, Search, Image, Play, Trophy, Sparkles, PartyPopper, Heart, Mail, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface PosterSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (poster: any) => void;
  onUpload: (file: File) => void;
}

const CATEGORIES = [
  { id: 'all', name: 'All Postings', icon: Sparkles },
  { id: 'sports', name: 'Sports', icon: Trophy },
  { id: 'abstract', name: 'Abstract', icon: Palette },
  { id: 'festival', name: 'Festival', icon: PartyPopper },
  { id: 'fun', name: 'Fun', icon: Heart },
  { id: 'aesthetical', name: 'Aesthetical', icon: Sparkles },
  { id: 'invitation', name: 'Invitation', icon: Mail },
];

export function PosterSelector({ isOpen, onClose, onSelect, onUpload }: PosterSelectorProps) {
  const [activeTab, setActiveTab] = useState<'posters' | 'gifs'>('posters');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch poster catalog from DB
  const { data: catalogPosters = [] } = useQuery<any[]>({
    queryKey: ['/api/upload/catalog'],
  });

  // Combine DB posters and Studio catalog posters so we never have an empty state
  const samplePosters = useMemo(() => {
    const dbPosters = catalogPosters.map(p => ({
      id: p.id || String(Math.random()),
      title: p.name || 'Custom Poster',
      url: p.imageUrl,
      category: p.category?.toLowerCase() || 'aesthetical'
    }));

    const builtinPosters = [
      // SPORTS
      { id: 's1', title: 'Stadium Turf', url: 'https://pub-235cf704af824b4f862d187c67946951.r2.dev/catalog/sports_poster.png', category: 'sports' },
      { id: 's2', title: 'Badminton Court', url: 'https://pub-235cf704af824b4f862d187c67946951.r2.dev/catalog/badminton_poster.png', category: 'sports' },
      { id: 's3', title: 'Table Tennis', url: 'https://pub-235cf704af824b4f862d187c67946951.r2.dev/catalog/table_tennis_poster.png', category: 'sports' },
      { id: 's4', title: 'Pickleball', url: 'https://pub-235cf704af824b4f862d187c67946951.r2.dev/catalog/pickle_poster.png', category: 'sports' },
      { id: 's5', title: 'Cricket Ground', url: 'https://pub-235cf704af824b4f862d187c67946951.r2.dev/catalog/cricket_poster.png', category: 'sports' },

      // CATEGORY POSTERS
      { id: 'a1', title: 'Deep Flow', url: 'https://pub-235cf704af824b4f862d187c67946951.r2.dev/catalog/abstract_poster.png', category: 'abstract' },
      { id: 'f1', title: 'Stage Neon', url: 'https://pub-235cf704af824b4f862d187c67946951.r2.dev/catalog/festival_poster.png', category: 'festival' },
      { id: 'u1', title: 'Playful Glow', url: 'https://pub-235cf704af824b4f862d187c67946951.r2.dev/catalog/fun_poster.png', category: 'fun' },
      { id: 'e1', title: 'Marble Sun', url: 'https://pub-235cf704af824b4f862d187c67946951.r2.dev/catalog/aesthetical_poster.png', category: 'aesthetical' },
      { id: 'i1', title: 'Classic Card', url: 'https://pub-235cf704af824b4f862d187c67946951.r2.dev/catalog/invitation_poster.png', category: 'invitation' },
    ];
    
    // Filter out builtin posters that might have been uploaded to the DB already to prevent duplicates
    const dbUrls = dbPosters.map(p => p.url);
    const uniqueBuiltins = builtinPosters.filter(bp => !dbUrls.includes(bp.url));
    
    return [...dbPosters, ...uniqueBuiltins];
  }, [catalogPosters]);

  const sampleGifs = useMemo(() => [
    { id: 'g1', title: 'Vaporwave Grid', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOHU3ZzN4ZzN4ZzN4ZzN4ZzN4ZzN4ZzN4ZzN4ZzN4ZzN4ZzN4JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1n/vARoo7aLqK0vS64214/giphy.gif', category: 'abstract' },
    { id: 'g2', title: 'Confetti Party', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHU3ZzN4ZzN4ZzN4ZzN4ZzN4ZzN4ZzN4ZzN4ZzN4ZzN4ZzN4JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1n/l0ExncehJvSdU6VxC/giphy.gif', category: 'festival' },
    { id: 'g3', title: 'Digital Matrix', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHU3ZzN4ZzN4ZzN4ZzN4ZzN4ZzN4ZzN4ZzN4ZzN4ZzN4ZzN4JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1n/10vFE0p74h3i3S/giphy.gif', category: 'fun' },
    { id: 'g4', title: 'Starry Sky', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHU3ZzN4ZzN4ZzN4ZzN4ZzN4ZzN4ZzN4ZzN4ZzN4ZzN4ZzN4JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1n/tzv6lxSfSZIvS/giphy.gif', category: 'aesthetical' },
    { id: 'g5', title: 'Dancing Lights', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHU3ZzN4ZzN4ZzN4ZzN4ZzN4ZzN4ZzN4ZzN4ZzN4ZzN4ZzN4JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1n/X9b6vC82Q1pQuK3bFm/giphy.gif', category: 'festival' },
    { id: 'g6', title: 'Floating Heart', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHU3ZzN4ZzN4ZzN4ZzN4ZzN4ZzN4ZzN4ZzN4ZzN4ZzN4ZzN4JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1n/l41lTfORVpTLC46kM/giphy.gif', category: 'fun' },
    { id: 'g7', title: 'Goal Celebration', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHU3ZzN4ZzN4ZzN4ZzN4ZzN4ZzN4ZzN4ZzN4ZzN4ZzN4ZzN4JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1n/3CCXHZWV6F6O9VQ7zi/giphy.gif', category: 'sports' },
    { id: 'g8', title: 'Fireworks Night', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHU3ZzN4ZzN4ZzN4ZzN4ZzN4ZzN4ZzN4ZzN4ZzN4ZzN4ZzN4JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1n/26tPplGWjC0DrVopS/giphy.gif', category: 'festival' },
  ], []);

  const currentItems = activeTab === 'posters' ? samplePosters : sampleGifs;
  
  const filteredItems = useMemo(() => {
    return currentItems.filter(item => {
      const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || item.category.toLowerCase() === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [currentItems, searchQuery, selectedCategory]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onUpload(file);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative w-full max-w-5xl h-[85vh] bg-[#0c0d0e] border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden flex">
        
        {/* Left Sidebar - Categories */}
        <div className="w-64 border-r border-white/5 flex flex-col p-6 hidden md:flex">
          <div className="flex items-center gap-3 mb-8 px-2">
            <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
              <Palette className="w-4 h-4 text-indigo-400" />
            </div>
            <h3 className="font-bold text-white uppercase tracking-widest text-[10px]">Studio Collections</h3>
          </div>
          
          <div className="space-y-1">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  selectedCategory === cat.id 
                    ? 'bg-white/10 text-white' 
                    : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                }`}
              >
                <cat.icon className={`w-4 h-4 ${selectedCategory === cat.id ? 'text-indigo-400' : ''}`} />
                {cat.name}
              </button>
            ))}
          </div>

          <div className="mt-auto pt-6 border-t border-white/5">
             <label htmlFor="file-upload" className="w-full">
                <div className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  Upload Custom
                </div>
                <input id="file-upload" type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
             </label>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header Area */}
          <div className="p-6 border-b border-white/5 flex items-center justify-between gap-6">
            <div className="flex items-center gap-4 flex-1">
               <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <Input 
                    placeholder={`Search ${activeTab}...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white/5 border-white/10 text-white h-11 pl-10 rounded-full focus:ring-indigo-500/50"
                  />
               </div>
               
               <div className="flex p-1 bg-white/5 rounded-full border border-white/10">
                 <button 
                  onClick={() => setActiveTab('posters')}
                  className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'posters' ? 'bg-white text-black shadow-lg' : 'text-white/50 hover:text-white'}`}
                 >
                   Posters
                 </button>
                 <button 
                  onClick={() => setActiveTab('gifs')}
                  className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'gifs' ? 'bg-white text-black shadow-lg' : 'text-white/50 hover:text-white'}`}
                 >
                   GIFs
                 </button>
               </div>
            </div>

            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-white/10 text-white/50 hover:text-white">
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Grid Area */}
          <div className="flex-1 overflow-y-auto p-8">
            {filteredItems.length > 0 ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      onSelect(item);
                      onClose();
                    }}
                    className="group relative aspect-[3/4] rounded-2xl overflow-hidden border border-white/5 cursor-pointer bg-white/[0.02] transition-all hover:scale-[1.02] hover:border-indigo-500/50"
                  >
                    <img 
                      src={item.url} 
                      alt={item.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      loading="lazy"
                    />
                    
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                       <p className="text-white font-bold text-sm">{item.title}</p>
                       <p className="text-white/60 text-[10px] uppercase tracking-widest">{item.category}</p>
                    </div>

                    {activeTab === 'gifs' && (
                      <div className="absolute top-3 right-3 bg-indigo-600 rounded-lg px-2 py-1 text-[10px] font-black text-white shadow-lg">
                        GIF
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                <div className="w-20 h-20 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center mb-4">
                  <Search className="w-8 h-8" />
                </div>
                <h4 className="text-white font-bold">No {activeTab} found</h4>
                <p className="text-white/60 text-sm max-w-[200px]">Try changing the category or search query.</p>
              </div>
            )}
          </div>

          <div className="px-8 py-4 border-t border-white/5 flex items-center justify-between bg-black/20">
             <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Premium Catalog Active</span>
             </div>
             <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
               Design by Triibes
             </p>
          </div>
        </div>
      </div>
    </div>
  );
}