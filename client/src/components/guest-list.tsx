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
}

export default function GuestList({ eventId, rsvps, rsvpCounts }: GuestListProps) {
  // Filter out pending access requests from the main guest list
  const actualGuests = rsvps.filter(rsvp => rsvp.status !== 'pending_access');
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case "going":
        return "bg-green-400";
      case "maybe":
        return "bg-yellow-400";
      case "not_going":
        return "bg-red-400";
      default:
        return "bg-gray-400";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "going":
        return "Going";
      case "maybe":
        return "Maybe";
      case "not_going":
        return "Can't Go";
      default:
        return "Unknown";
    }
  };

  const totalInvited = actualGuests.length;

  return (
    <Card className="glass-effect">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Guest List</CardTitle>
          <span className="text-sm text-muted-foreground">{totalInvited} invited</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* RSVP Summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 bg-green-500/20 rounded-lg border border-green-500/30">
            <div className="text-2xl font-bold text-green-400">{rsvpCounts.going}</div>
            <div className="text-xs text-green-300">Going</div>
          </div>
          <div className="text-center p-3 bg-yellow-500/20 rounded-lg border border-yellow-500/30">
            <div className="text-2xl font-bold text-yellow-400">{rsvpCounts.maybe}</div>
            <div className="text-xs text-yellow-300">Maybe</div>
          </div>
          <div className="text-center p-3 bg-red-500/20 rounded-lg border border-red-500/30">
            <div className="text-2xl font-bold text-red-400">{rsvpCounts.not_going}</div>
            <div className="text-xs text-red-300">Can't Go</div>
          </div>
        </div>

        {/* Guest List */}
        <div className="space-y-3">
          {actualGuests.map((rsvp) => (
            <div key={rsvp.id} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={rsvp.user?.profileImageUrl} />
                  <AvatarFallback>
                    {rsvp.user?.firstName?.[0]}{rsvp.user?.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">
                    {rsvp.user?.firstName} {rsvp.user?.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {getStatusLabel(rsvp.status)}
                    {rsvp.plusOneCount > 0 && ` +${rsvp.plusOneCount}`}
                  </p>
                </div>
              </div>
              <span className={`w-2 h-2 rounded-full ${getStatusColor(rsvp.status)}`} />
            </div>
          ))}

          {actualGuests.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No RSVPs yet</p>
              <p className="text-sm">Be the first to respond!</p>
            </div>
          )}
        </div>

        <Button 
          variant="outline" 
          className="w-full border-primary/30 hover:border-primary hover:bg-primary/10"
        >
          <UserPlus className="mr-2 h-4 w-4" />
          Invite More Friends
        </Button>
      </CardContent>
    </Card>
  );
}
