import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { 
  Share, 
  Download, 
  Eye, 
  Calendar, 
  MapPin, 
  Users,
  Gamepad2,
  PartyPopper,
  Image as ImageIcon
} from "lucide-react";

interface PosterGalleryProps {
  event: any;
  onCustomize?: () => void;
  isPreview?: boolean;
}

export default function PosterGallery({ event, onCustomize, isPreview = false }: PosterGalleryProps) {
  const [selectedPoster, setSelectedPoster] = useState<any>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  const formatEventDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getEventIcon = () => {
    if (event?.eventType === "online") {
      return <Gamepad2 className="w-16 h-16" />;
    }
    return <PartyPopper className="w-16 h-16" />;
  };

  const renderPoster = (posterData: any) => {
    const template = posterData?.template || {
      gradient: "from-blue-600 to-purple-600",
      textColor: "text-white",
      accentColor: "text-blue-200"
    };

    // Handle different posterData formats
    // Format 1: { selectedImage: "https://url.com/image.jpg" } - from R2 upload
    // Format 2: { selectedImage: { imageUrl: "...", name: "..." } } - from poster selector
    const imageUrl = typeof posterData?.selectedImage === 'string' 
      ? posterData.selectedImage 
      : posterData?.selectedImage?.imageUrl;

    const imageName = posterData?.customTitle || posterData?.selectedImage?.name || 'Event Poster';

    return (
      <div className="w-full h-full relative">
        {/* Background - Image or Gradient */}
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={imageName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${template.gradient}`}></div>
        )}
      </div>
    );
  };

  const viewPoster = (posterData: any) => {
    setSelectedPoster(posterData);
    setIsViewerOpen(true);
  };

  const downloadPoster = (posterData: any) => {
    // In a real app, this would generate and download the poster
    console.log("Downloading poster:", posterData);
  };

  const sharePoster = (posterData: any) => {
    // In a real app, this would share the poster
    console.log("Sharing poster:", posterData);
  };

  // Always show a poster - either custom or default
  const posterDataToUse = event?.posterData || null;

  return (
    <>
      <Card className="overflow-hidden w-full shadow-lg">
        <div className="aspect-square relative min-h-[300px]">
          {/* Use the renderPoster function to show uploaded images */}
          {renderPoster(posterDataToUse)}
          
          {/* Overlay Controls */}
          <div className="absolute inset-0 bg-black/0 hover:bg-black/40 transition-all duration-300 flex items-center justify-center opacity-0 hover:opacity-100">
            <div className="flex gap-3">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => viewPoster(posterDataToUse)}
              >
                <Eye className="w-4 h-4 mr-2" />
                  View
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => downloadPoster(posterDataToUse)}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => sharePoster(posterDataToUse)}
                >
                  <Share className="w-4 h-4 mr-2" />
                  Share
                </Button>
              </div>
            </div>
          </div>
        </Card>

      {/* Poster Viewer Dialog */}
      <Dialog open={isViewerOpen} onOpenChange={setIsViewerOpen}>
        <DialogContent className="glass-effect max-w-2xl">
          <DialogHeader>
            <DialogTitle>Event Poster</DialogTitle>
          </DialogHeader>
          
          <div className="aspect-square rounded-xl overflow-hidden">
            {renderPoster(selectedPoster)}
          </div>
          
          <div className="flex gap-3">
            <Button
              onClick={() => downloadPoster(selectedPoster)}
              className="flex-1"
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button
              variant="outline"
              onClick={() => sharePoster(selectedPoster)}
              className="flex-1"
            >
              <Share className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
