import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserPlus, Calendar } from "lucide-react";

interface GuestListProps {
  eventId: number;
  rsvps: any[];
  rsvpCounts: {
    going: number;
    maybe: number;
    not_going: number;
  };
  guestListVisibility?: string;
  isHost: boolean;
  currentUserId?: string;
  rsvpMode?: 'rsvp' | 'register';
}

export default function GuestList({ eventId, rsvps, rsvpCounts, guestListVisibility = 'everyone', isHost, currentUserId, rsvpMode = 'rsvp' }: GuestListProps) {
  // Filter out pending access requests from the main guest list
  const actualGuests = rsvps.filter(rsvp => rsvp.status !== 'pending_access');
  
  // In register mode, only show guests who are "going" (registered)
  const displayedGuests = rsvpMode === 'register' 
    ? actualGuests.filter(rsvp => rsvp.status === 'going')
    : actualGuests;
  
  // Check if current user is attending this event
  const isAttending = actualGuests.some(rsvp => rsvp.userId === currentUserId && rsvp.status === 'going');
  
  // Determine if guest list should be visible based on visibility setting
  const shouldShowGuestList = 
    guestListVisibility === 'everyone' || 
    (guestListVisibility === 'host-only' && isHost) ||
    (guestListVisibility === 'attendees-only' && (isHost || isAttending));
  
  // If guest list is hidden, return null to hide the entire component
  if (!shouldShowGuestList) {
    return null;
  }
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case "going":
        return "text-green-400";
      case "maybe":
        return "text-yellow-400";
      case "not_going":
        return "text-red-400";
      default:
        return "text-gray-400";
    }
  };

  const totalCount = rsvpMode === 'register' ? rsvpCounts.going : actualGuests.length;

  return (
    <div className="space-y-4">
      {/* Minimalist Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">
          {rsvpMode === 'register' ? 'Registered' : 'Guests'}
        </h3>
        <span className="text-sm text-white/60">
          {totalCount} {rsvpMode === 'register' ? 'registered' : 'invited'}
        </span>
      </div>

      {/* Compact RSVP Summary - Only show in RSVP mode */}
      {rsvpMode !== 'register' && (
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <span className="text-green-400 font-semibold">{rsvpCounts.going}</span>
            <span className="text-white/60">going</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-yellow-400 font-semibold">{rsvpCounts.maybe}</span>
            <span className="text-white/60">maybe</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-red-400 font-semibold">{rsvpCounts.not_going}</span>
            <span className="text-white/60">can't go</span>
          </div>
        </div>
      )}

      {/* Minimalist Guest List */}
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {displayedGuests.map((rsvp) => (
          <div key={rsvp.id} className="flex items-center gap-3 py-2">
            <Avatar className="w-9 h-9 border border-white/10">
              <AvatarImage src={rsvp.user?.profileImageUrl} />
              <AvatarFallback className="bg-white/5 text-white/70 text-xs">
                {rsvp.user?.firstName?.[0]}{rsvp.user?.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">
                {rsvp.user?.firstName} {rsvp.user?.lastName}
                {rsvp.plusOneCount > 0 && <span className="text-white/50 ml-1">+{rsvp.plusOneCount}</span>}
              </p>
            </div>
            {/* Only show status indicator in RSVP mode */}
            {rsvpMode !== 'register' && (
              <div className={`text-xs ${getStatusColor(rsvp.status)}`}>●</div>
            )}
          </div>
        ))}

        {displayedGuests.length === 0 && (
          <div className="text-center py-8 text-white/40">
            <Calendar className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">
              {rsvpMode === 'register' ? 'No registrations yet' : 'No RSVPs yet'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
