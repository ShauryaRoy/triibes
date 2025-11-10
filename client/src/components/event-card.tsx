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

  // Mock weather data - in a real app, this would come from a weather API
  const weatherInfo = "🌤️ 72°F • Clear skies";

  return (
    <Card className="glass-effect">
      <CardContent className="p-6 space-y-6">
        {/* Event Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <Badge
                variant={event.eventType === "online" ? "default" : "secondary"}
                className={`${
                  event.eventType === "online"
                    ? "bg-gradient-to-r from-primary to-blue-600"
                    : "bg-gradient-to-r from-pink-500 to-purple-600"
                }`}
              >
                {event.eventType === "online" ? "GAMING SESSION" : "PARTY"}
              </Badge>
              <span className="text-primary text-sm flex items-center">
                <Eye className="h-4 w-4 mr-1" />
                42 views
              </span>
            </div>
            <h2 className="text-3xl font-bold mb-2">{event.title}</h2>
            <p className="text-muted-foreground mb-2">{event.description}</p>
            {event.host && (
              <p className="text-sm text-muted-foreground">
                Hosted by {event.host.firstName || event.host.lastName 
                  ? `${event.host.firstName || ''} ${event.host.lastName || ''}`.trim()
                  : event.host.email}
              </p>
            )}
          </div>
          {shouldShowManageOptions ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                  <MoreVertical className="h-5 w-5" />
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
          ) : (
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
              <Share className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* Event Image Placeholder */}
        <div className="relative rounded-xl overflow-hidden bg-gradient-to-br from-primary/20 to-blue-600/20 h-64 flex items-center justify-center">
          <div className="text-6xl">
            {event.eventType === "online" ? "🎮" : "🎉"}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 bg-black/50 hover:bg-black/70"
          >
            <Camera className="h-5 w-5 text-white" />
          </Button>
        </div>

        {/* Event Details Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Calendar className="text-primary w-5 h-5 flex-shrink-0" />
              <div>
                <p className="text-sm text-muted-foreground">Date & Time</p>
                <p className="font-semibold">{formatEventDate(event.datetime)}</p>
              </div>
            </div>
            
            {event.location && (
              <div className="flex items-center space-x-3">
                <MapPin className="text-pink-400 w-5 h-5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="font-semibold">{event.location}</p>
                </div>
              </div>
            )}
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Users className="text-purple-400 w-5 h-5 flex-shrink-0" />
              <div>
                <p className="text-sm text-muted-foreground">Guests</p>
                <p className="font-semibold">
                  {event.maxGuests ? `Max ${event.maxGuests}` : "No limit"}
                </p>
              </div>
            </div>
            
            {event.eventType === "offline" && (
              <div className="flex items-center space-x-3">
                <Cloud className="text-cyan-400 w-5 h-5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">Weather</p>
                  <p className="font-semibold">{weatherInfo}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Memoize component to prevent unnecessary re-renders
export default memo(EventCard);
