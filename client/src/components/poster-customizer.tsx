import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Palette, 
  Type, 
  Image as ImageIcon, 
  Download, 
  Share, 
  Sparkles,
  Gamepad2,
  PartyPopper,
  Calendar,
  MapPin,
  Users
} from "lucide-react";

interface PosterCustomizerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventData: any;
  onSave: (posterData: any) => void;
}

interface PosterTemplate {
  id: string;
  name: string;
  theme: string;
  gradient: string;
  textColor: string;
  accentColor: string;
  pattern?: string;
}

interface PosterImage {
  id: string;
  name: string;
  category: string;
  imageUrl: string;
  description: string;
}

const posterImages: PosterImage[] = [
  {
    id: "gaming-night-1",
    name: "Gaming Night",
    category: "Gaming",
    imageUrl: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&h=600&fit=crop&crop=center",
    description: "Perfect for gaming events and LAN parties"
  },
  {
    id: "party-vibes-1", 
    name: "Neon Party",
    category: "Party",
    imageUrl: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=600&fit=crop&crop=center",
    description: "Vibrant neon lights for party atmosphere"
  },
  {
    id: "birthday-1",
    name: "Birthday Celebration", 
    category: "Birthday",
    imageUrl: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=400&h=600&fit=crop&crop=center",
    description: "Colorful birthday party setup"
  },
  {
    id: "music-1",
    name: "Music Festival",
    category: "Music", 
    imageUrl: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=400&h=600&fit=crop&crop=center",
    description: "Live music and concert vibes"
  },
  {
    id: "casual-1",
    name: "Casual Hangout",
    category: "Casual",
    imageUrl: "https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=400&h=600&fit=crop&crop=center", 
    description: "Relaxed social gathering"
  },
  {
    id: "outdoor-1",
    name: "Outdoor Adventure",
    category: "Outdoor",
    imageUrl: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=600&fit=crop&crop=center",
    description: "Perfect for outdoor events"
  },
  {
    id: "food-1", 
    name: "Food & Dining",
    category: "Food",
    imageUrl: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=600&fit=crop&crop=center",
    description: "Great for dinner parties and food events"
  },
  {
    id: "tech-1",
    name: "Tech Meetup", 
    category: "Tech",
    imageUrl: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&h=600&fit=crop&crop=center",
    description: "Modern tech and networking events"
  }
];

const posterTemplates: PosterTemplate[] = [
  {
    id: "neon-gaming",
    name: "Neon Gaming",
    theme: "gaming",
    gradient: "from-purple-600 via-blue-600 to-cyan-400",
    textColor: "text-white",
    accentColor: "text-cyan-300",
    pattern: "gaming"
  },
  {
    id: "party-vibes",
    name: "Party Vibes",
    theme: "party",
    gradient: "from-pink-500 via-purple-500 to-orange-400",
    textColor: "text-white",
    accentColor: "text-pink-200",
    pattern: "confetti"
  },
  {
    id: "minimal-dark",
    name: "Minimal Dark",
    theme: "minimal",
    gradient: "from-gray-900 to-gray-800",
    textColor: "text-white",
    accentColor: "text-blue-400"
  },
  {
    id: "retro-wave",
    name: "Retro Wave",
    theme: "retro",
    gradient: "from-purple-800 via-pink-600 to-orange-500",
    textColor: "text-white",
    accentColor: "text-yellow-300",
    pattern: "wave"
  },
  {
    id: "nature-green",
    name: "Nature Green",
    theme: "nature",
    gradient: "from-green-600 via-emerald-500 to-teal-400",
    textColor: "text-white",
    accentColor: "text-green-200"
  },
  {
    id: "sunset-vibes",
    name: "Sunset Vibes",
    theme: "sunset",
    gradient: "from-orange-600 via-red-500 to-pink-500",
    textColor: "text-white",
    accentColor: "text-orange-200"
  }
];

export default function PosterCustomizer({ open, onOpenChange, eventData, onSave }: PosterCustomizerProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<PosterTemplate>(posterTemplates[0]);
  const [selectedImage, setSelectedImage] = useState<PosterImage | null>(null);
  const [customTitle, setCustomTitle] = useState(eventData?.title || "");
  const [customSubtitle, setCustomSubtitle] = useState("");
  const [showDetails, setShowDetails] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const posterRef = useRef<HTMLDivElement>(null);

  const formatEventDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const formatEventTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getEventIcon = () => {
    if (eventData?.eventType === "online") {
      return <Gamepad2 className="w-16 h-16" />;
    }
    return <PartyPopper className="w-16 h-16" />;
  };

  const getCategories = () => {
    const categories = ["All", ...Array.from(new Set(posterImages.map(img => img.category)))];
    return categories;
  };

  const getFilteredImages = () => {
    if (selectedCategory === "All") {
      return posterImages;
    }
    return posterImages.filter(img => img.category === selectedCategory);
  };

  const getPatternBackground = (pattern?: string) => {
    switch (pattern) {
      case "gaming":
        return "before:content-['🎮'] before:absolute before:top-4 before:right-4 before:text-4xl before:opacity-20";
      case "confetti":
        return "before:content-['🎉'] before:absolute before:top-4 before:right-4 before:text-4xl before:opacity-20";
      case "wave":
        return "before:content-['〰️'] before:absolute before:top-4 before:right-4 before:text-4xl before:opacity-20";
      default:
        return "";
    }
  };

  const handleSave = () => {
    const posterData = {
      templateId: selectedTemplate.id,
      selectedImage: selectedImage,
      customTitle,
      customSubtitle,
      showDetails,
      template: selectedTemplate
    };
    console.log("🎨 PosterCustomizer handleSave called with:", posterData);
    onSave(posterData);
    onOpenChange(false);
  };

  const downloadPoster = () => {
    // In a real app, this would generate and download the poster image
    console.log("Downloading poster...");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-effect max-w-7xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Customize Your Event Poster
          </DialogTitle>
        </DialogHeader>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Customization Panel */}
          <div className="space-y-6">
            <Tabs defaultValue="images" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="images">Images</TabsTrigger>
                <TabsTrigger value="templates">Templates</TabsTrigger>
                <TabsTrigger value="text">Text</TabsTrigger>
                <TabsTrigger value="style">Style</TabsTrigger>
              </TabsList>

              <TabsContent value="images" className="space-y-4">
                {/* Category Filter */}
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {getCategories().map((category) => (
                    <Button
                      key={category}
                      variant={selectedCategory === category ? "default" : "outline"}
                      size="sm"
                      className="text-xs px-2 py-1 h-8 truncate"
                      onClick={() => setSelectedCategory(category)}
                    >
                      {category}
                    </Button>
                  ))}
                </div>

                {/* Image Gallery */}
                <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                  {getFilteredImages().map((image) => (
                    <Card
                      key={image.id}
                      className={`cursor-pointer transition-all ${
                        selectedImage?.id === image.id 
                          ? "ring-2 ring-primary" 
                          : "hover:ring-1 ring-primary/50"
                      }`}
                      onClick={() => setSelectedImage(image)}
                    >
                      <CardContent className="p-2">
                        <div className="w-full h-24 rounded-lg overflow-hidden">
                          <img 
                            src={image.imageUrl} 
                            alt={image.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // Fallback to a gradient if image fails to load
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              target.parentElement!.classList.add('bg-gradient-to-br', 'from-blue-500', 'to-purple-600');
                            }}
                          />
                        </div>
                        <p className="text-xs font-medium mt-2 text-center">
                          {image.name}
                        </p>
                        <p className="text-xs text-muted-foreground text-center">
                          {image.category}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="templates" className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {posterTemplates.map((template) => (
                    <Card
                      key={template.id}
                      className={`cursor-pointer transition-all overflow-hidden ${
                        selectedTemplate.id === template.id 
                          ? "ring-2 ring-primary" 
                          : "hover:ring-1 ring-primary/50"
                      }`}
                      onClick={() => setSelectedTemplate(template)}
                    >
                      <CardContent className="p-4">
                        <div className={`w-full h-24 rounded-lg bg-gradient-to-br ${template.gradient} flex items-center justify-center relative overflow-hidden mb-3`}>
                          <span className="text-sm font-bold text-white drop-shadow-lg text-center px-2">
                            {template.name}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground text-center font-medium">
                          {template.name}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="text" className="space-y-4">
                <div>
                  <Label htmlFor="custom-title">Event Title</Label>
                  <Input
                    id="custom-title"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="Enter custom title"
                    className="bg-dark-card border-dark-border"
                  />
                </div>
                <div>
                  <Label htmlFor="custom-subtitle">Subtitle (Optional)</Label>
                  <Input
                    id="custom-subtitle"
                    value={customSubtitle}
                    onChange={(e) => setCustomSubtitle(e.target.value)}
                    placeholder="Add a catchy subtitle"
                    className="bg-dark-card border-dark-border"
                  />
                </div>
              </TabsContent>

              <TabsContent value="style" className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Show Event Details</Label>
                  <Button
                    variant={showDetails ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowDetails(!showDetails)}
                  >
                    {showDetails ? "Shown" : "Hidden"}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex gap-3">
              <Button onClick={handleSave} className="flex-1">
                Save Poster
              </Button>
              <Button variant="outline" onClick={downloadPoster}>
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
          </div>

          {/* Poster Preview */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Preview</h3>
              <Badge variant="secondary">Live Preview</Badge>
            </div>
            
            <div ref={posterRef} className="w-full aspect-[4/5] rounded-xl overflow-hidden relative">
              {/* Background Image or Gradient */}
              {selectedImage ? (
                <div className="w-full h-full relative">
                  <img 
                    src={selectedImage.imageUrl} 
                    alt={selectedImage.name}
                    className="w-full h-full object-cover"
                  />
                  {/* Dark overlay for text readability */}
                  <div className="absolute inset-0 bg-black/40"></div>
                </div>
              ) : (
                <div className={`w-full h-full bg-gradient-to-br ${selectedTemplate.gradient} relative ${getPatternBackground(selectedTemplate.pattern)}`}>
                </div>
              )}
              
              {/* Content Overlay */}
              <div className="absolute inset-0 p-8 flex flex-col justify-between">
                {/* Top Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge 
                      className="text-white bg-white/20 backdrop-blur-sm border-0"
                    >
                      {eventData?.eventType === "online" ? "Gaming Session" : "Party Event"}
                    </Badge>
                    <div className="text-white">
                      {getEventIcon()}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h1 className="text-3xl font-bold text-white leading-tight drop-shadow-lg">
                      {customTitle || eventData?.title}
                    </h1>
                    {customSubtitle && (
                      <p className="text-lg text-white/90 drop-shadow-md">
                        {customSubtitle}
                      </p>
                    )}
                  </div>
                </div>

                {/* Bottom Section - Event Details */}
                {showDetails && (
                  <div className="space-y-3 bg-black/50 backdrop-blur-sm rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-white/80" />
                      <div>
                        <p className="text-sm text-white font-medium">
                          {eventData?.datetime ? formatEventDate(eventData.datetime) : "Date & Time"}
                        </p>
                      </div>
                    </div>
                    
                    {eventData?.location && (
                      <div className="flex items-center gap-3">
                        <MapPin className="w-5 h-5 text-white/80" />
                        <p className="text-sm text-white">
                          {eventData.location}
                        </p>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-3">
                      <Users className="w-5 h-5 text-white/80" />
                      <p className="text-sm text-white">
                        {eventData?.maxGuests ? `Up to ${eventData.maxGuests} guests` : "Open to all"}
                      </p>
                    </div>
                  </div>
                )}

                {/* Decorative Elements */}
                {!selectedImage && (
                  <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-10">
                    <div className="absolute top-8 right-8 w-32 h-32 rounded-full bg-white/10"></div>
                    <div className="absolute bottom-16 left-8 w-20 h-20 rounded-full bg-white/5"></div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
