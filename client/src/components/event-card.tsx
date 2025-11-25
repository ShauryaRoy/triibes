import { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Calendar, MapPin, Users, Eye, Share, Camera, Cloud, MoreVertical, Edit, Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import { useState } from "react";

interface EventCardProps {
  event: any;
  showManageOptions?: boolean;
}

function EventCard({ event, showManageOptions = false }: EventCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDeleting, setIsDeleting] = useState(false);

  const isEventHost = user?.id === event.hostId;
  const shouldShowManageOptions = showManageOptions && isEventHost;

  // Delete event mutation
  const deleteEventMutation = useMutation({
    mutationFn: async (eventId: number) => {
      const response = await fetch(`/api/events/${eventId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete event');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/profile/events'] });
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      toast({
        title: "Event deleted",
        description: "Your event has been successfully deleted.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete event",
        variant: "destructive",
      });
    },
  });

  const handleDeleteEvent = () => {
    setIsDeleting(true);
    deleteEventMutation.mutate(event.id);
  };

  const formatEventDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  // Get the image URL from event data
  const getEventImageUrl = () => {
    // First check imageUrl
    if (event.imageUrl) {
      return event.imageUrl;
    }
    
    // Then check posterData
    if (event.posterData) {
      try {
        // posterData might be a string (JSON) or already an object
        const posterDataObj = typeof event.posterData === 'string' 
          ? JSON.parse(event.posterData) 
          : event.posterData;
        
        // Check for different posterData structures
        if (posterDataObj?.selectedImage) {
          return posterDataObj.selectedImage;
        }
        if (posterDataObj?.url) {
          return posterDataObj.url;
        }
      } catch (error) {
        console.error('Error parsing posterData:', error);
      }
    }
    
    return null;
  };

  const eventImageUrl = getEventImageUrl();

  return (
    <div className="relative group">
      <Link href={`/events/${event.slug || event.id}`}>
        {/* 1:1 Square Poster */}
        <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-gradient-to-br from-primary/40 to-blue-600/40 mb-2">
          {eventImageUrl ? (
            <img 
              src={eventImageUrl} 
              alt={event.title} 
              className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/30 to-blue-600/30" />
          )}

          {/* Manage options overlay */}
          {shouldShowManageOptions && (
            <div className="absolute top-2 right-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 bg-black/50 text-white hover:bg-black/70 backdrop-blur-sm"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-gray-900/95 border-white/20 text-white">
                  <DropdownMenuItem asChild className="hover:bg-white/10 cursor-pointer">
                    <Link href={`/edit-event/${event.slug || event.id}`} className="flex items-center w-full">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Event
                    </Link>
                  </DropdownMenuItem>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem 
                        className="hover:bg-red-500/10 cursor-pointer text-red-400"
                        onSelect={(e) => e.preventDefault()}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Event
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-gray-900/95 border-white/20 text-white">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription className="text-white/70">
                          This action cannot be undone. This will permanently delete your event
                          and remove all associated data including RSVPs.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeleteEvent}
                          disabled={deleteEventMutation.isPending}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          {deleteEventMutation.isPending ? "Deleting..." : "Delete Event"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </Link>

      {/* Event Title */}
      <Link href={`/events/${event.slug || event.id}`}>
        <h3 className="font-semibold text-sm sm:text-base text-white line-clamp-2 group-hover:text-primary transition-colors">
          {event.title}
        </h3>
      </Link>
    </div>
  );
}

// Memoize component to prevent unnecessary re-renders
export default memo(EventCard);
