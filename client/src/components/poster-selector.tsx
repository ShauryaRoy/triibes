import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Upload, Search, Image, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface PosterSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (poster: any) => void;
  onUpload: (file: File) => void;
}

export function PosterSelector({ isOpen, onClose, onSelect, onUpload }: PosterSelectorProps) {
  const [activeTab, setActiveTab] = useState<'posters' | 'gifs'>('posters');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch poster catalog from DB
  const { data: catalogPosters = [] } = useQuery<any[]>({
    queryKey: ['/api/upload/catalog'],
  });

  // Use DB posters if available, otherwise fallback to hardcoded list
  const samplePosters = catalogPosters.length > 0 
    ? catalogPosters.map(p => ({
        id: p.id,
        title: p.name,
        url: p.imageUrl,
        category: p.category
      }))
    : [
        { id: '1', title: 'Neon Night', url: '/posters/neon_night.png', category: 'party' },
        { id: '2', title: 'Summer Pool', url: '/posters/summer_pool.png', category: 'party' },
        { id: '3', title: 'Jazz Evening', url: '/posters/jazz_night.png', category: 'chill' },
        { id: '4', title: 'Tech Mixer', url: '/posters/tech_mixer.png', category: 'networking' },
        { id: '5', title: 'Art & Wine', url: '/posters/art_wine.png', category: 'social' },
        { id: '6', title: 'Outdoor Movie', url: '/posters/outdoors_movie.png', category: 'entertainment' },
        { id: '7', title: 'Yoga Morning', url: '/posters/yoga_morning.png', category: 'wellness' },
        { id: '8', title: 'Game Night', url: '/posters/game_night.png', category: 'fun' },
      ];

  const sampleGifs = [
    { id: 1, title: 'Animated Sparkles', url: '/api/placeholder/300/400', category: 'celebration' },
    { id: 2, title: 'Moving Gradient', url: '/api/placeholder/300/400', category: 'abstract' },
    { id: 3, title: 'Neon Pulse', url: '/api/placeholder/300/400', category: 'neon' },
    { id: 4, title: 'Particle Flow', url: '/api/placeholder/300/400', category: 'tech' },
  ];

  const currentItems = activeTab === 'posters' ? samplePosters : sampleGifs;
  const filteredItems = currentItems.filter(item => 
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
            <h2 className="text-lg sm:text-xl font-semibold text-white truncate">Select Poster</h2>
            
            {/* Tab Switcher */}
            <div className="flex rounded-lg bg-white/10 p-1">
              <button
                onClick={() => setActiveTab('posters')}
                className={`flex items-center gap-1 px-2 sm:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition ${
                  activeTab === 'posters'
                    ? 'bg-white/20 text-white shadow-sm'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <Image className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Posters</span>
              </button>
              <button
                onClick={() => setActiveTab('gifs')}
                className={`flex items-center gap-1 px-2 sm:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition ${
                  activeTab === 'gifs'
                    ? 'bg-white/20 text-white shadow-sm'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <Play className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">GIFs</span>
              </button>
            </div>
          </div>

          {/* Upload Button & Close */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <label htmlFor="file-upload">
              <Button 
                size="sm" 
                className="bg-blue-600 hover:bg-blue-700 text-white border-0 text-xs sm:text-sm h-8 sm:h-9"
                asChild
              >
                <span className="cursor-pointer flex items-center">
                  <Upload className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Upload</span>
                </span>
              </Button>
              <input
                id="file-upload"
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white/70 hover:text-white hover:bg-white/10 h-8 w-8 sm:h-9 sm:w-9 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-3 sm:p-6 border-b border-white/10 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
            <Input
              placeholder={`Search ${activeTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:bg-white/15 h-9 sm:h-10 text-sm"
            />
          </div>
        </div>

        {/* Content Grid */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 min-h-0">
          {filteredItems.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    onSelect(item);
                    onClose();
                  }}
                  className="group relative aspect-square rounded-xl overflow-hidden border border-white/20 cursor-pointer transition-all hover:scale-[1.02] hover:border-white/40 hover:shadow-2xl"
                >
                  {/* Image/Poster */}
                  <div className="absolute inset-0 bg-white/5">
                    {item.url.startsWith('/posters/') || !item.url.includes('placeholder') ? (
                      <img 
                        src={item.url} 
                        alt={item.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-cyan-600 flex items-center justify-center">
                        {activeTab === 'gifs' ? (
                          <Play className="h-8 w-8 text-white/80" />
                        ) : (
                          <Image className="h-8 w-8 text-white/80" />
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="text-white text-center">
                      <p className="font-medium">{item.title}</p>
                      <p className="text-xs text-white/80 capitalize">{item.category}</p>
                    </div>
                  </div>
                  
                  {/* GIF Indicator */}
                  {activeTab === 'gifs' && (
                    <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm rounded-full p-1">
                      <Play className="h-3 w-3 text-white" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-white/60">
              <Search className="h-12 w-12 mb-4" />
              <p className="text-lg font-medium">No {activeTab} found</p>
              <p className="text-sm">Try adjusting your search terms</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-white/10 bg-white/5 flex-shrink-0">
          <p className="text-xs text-white/60 text-center">
            Choose a {activeTab.slice(0, -1)} or upload your own custom design
          </p>
        </div>
      </div>
    </div>
  );
}