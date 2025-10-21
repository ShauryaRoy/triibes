import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Calendar,
  Users,
  MapPin,
  Share2,
  Globe,
  Lock,
  Copy,
  Check,
  Sparkles,
  ArrowLeft,
  UserPlus,
  Shield
} from "lucide-react";
import PosterGallery from "@/components/poster-gallery";
import { useState, useMemo, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { type Event } from "@shared/schema";
import { SimpleBackground } from "@/components/simple-background";

type EventWithDetails = Event & {
  rsvpCount?: number;
  goingCount?: number;
  maybeCount?: number;
  notGoingCount?: number;
  userRsvpStatus?: string;
  hostName?: string;
  themeId?: string;
  rsvps?: Array<{ userId: number; status: string }>;
  isUserInvited?: boolean;
  hasRequestedAccess?: boolean;
};

export default function EventShare() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);

  const { data: event, isLoading, error } = useQuery<EventWithDetails | any>({
    queryKey: ["/api/events", id, "share"],
    queryFn: async () => {
      const res = await fetch(`/api/events/${id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load event");
      return res.json();
    },
    enabled: !!id,
  });

  const rsvpMutation = useMutation({
    mutationFn: async (status: string) => {
      const res = await apiRequest("POST", `/api/events/${id}/rsvp`, { status });
      if (!res.ok) throw new Error("Failed to update RSVP");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", id, "share"] });
      queryClient.invalidateQueries({ queryKey: [`/api/events/${id}`] });
      toast({ title: "RSVP updated", description: "Thanks for responding!" });
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message || "Could not RSVP", variant: "destructive" });
    }
  });

  const requestAccessMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/events/${id}/request-access`, {});
      if (!res.ok) throw new Error("Failed to request access");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", id, "share"] });
      toast({ title: "Request sent!", description: "The host will be notified of your request." });
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message || "Could not send request", variant: "destructive" });
    }
  });

  const currentUserRsvp = useMemo(() => {
    if (!user || !event?.rsvps) return null;
    const userIdNum = typeof user.id === 'string' ? parseInt(user.id, 10) : user.id;
    return event.rsvps.find((r: { userId: number; status: string }) => r.userId === userIdNum)?.status || null;
  }, [user, event]);

  // Check if user has access to view private event details
  const hasAccess = useMemo(() => {
    if (!event) return false;
    
    // Default to public if isPublic is not explicitly set to false
    // This handles cases where isPublic might be undefined/null
    const isPublicEvent = event.isPublic !== false;
    
    if (isPublicEvent) return true;
    
    // For private events, require authentication
    if (!user) return false;
    
    // Host always has access to their own events
    const userIdStr = String(user.id);
    const hostIdStr = String(event.hostId);
    if (userIdStr === hostIdStr) return true;
    
    // Check if user has RSVP'd (which means they were invited)
    if (currentUserRsvp) return true;
    
    // Check if user is explicitly invited or granted access
    if (event.isUserInvited) return true;
    
    // For private events, default to no access
    return false;
  }, [user, event, currentUserRsvp]);

  const dateInfo = useMemo(() => {
    if (!event?.datetime) return { full: "", dayMonth: "", time: "" };
    const d = new Date(event.datetime);
    return {
      full: d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }),
      dayMonth: d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }),
      time: d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    };
  }, [event?.datetime]);

  const copyShareLink = () => {
    try {
      const link = `${window.location.origin}/events/${id}/share`;
      navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Link copied" });
    } catch {
      toast({ title: "Copy failed", description: "Please copy manually", variant: "destructive" });
    }
  };

  const handleRSVP = (status: string) => {
    if (!user) {
      toast({ title: "Sign in required", description: "Log in to RSVP", variant: "destructive" });
      return;
    }
    if (!hasAccess) {
      toast({ title: "Access required", description: "You need access to RSVP to this private event", variant: "destructive" });
      return;
    }
    rsvpMutation.mutate(status);
  };

  const handleRequestAccess = () => {
    if (!user) {
      toast({ title: "Sign in required", description: "Log in to request access", variant: "destructive" });
      return;
    }
    requestAccessMutation.mutate();
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-white">Loading...</div>;
  }
  if (error || !event) {
    return <div className="min-h-screen flex items-center justify-center text-white">Event not found.</div>;
  }

  // Private event with no access - show limited view
  if (!event.isPublic && !hasAccess) {
    return (
      <SimpleBackground className="min-h-screen">
        <div className="relative z-10">
          <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
            {/* Back */}
            <div>
              <Button variant="ghost" onClick={() => setLocation("/")} className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20">
                <ArrowLeft className="h-4 w-4 mr-2" /> Back to Home
              </Button>
            </div>

            {/* Private Event Limited View */}
            <div className="relative rounded-2xl overflow-hidden border border-white/15 bg-white/5 backdrop-blur-md p-8 md:p-12 text-center">
              <div className="space-y-6">
                <div className="flex justify-center">
                  <div className="p-4 rounded-full bg-purple-500/20 border border-purple-500/30">
                    <Lock className="h-12 w-12 text-purple-300" />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <Badge variant="outline" className="bg-purple-500/20 border-purple-500/40 text-purple-200">
                    <Lock className="h-3 w-3 mr-1" />Private Event
                  </Badge>
                  <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white drop-shadow">
                    {event.title}
                  </h1>
                  <p className="text-white/70 text-lg">Hosted by {event.hostName || 'Event Host'}</p>
                  
                  {/* Basic event info */}
                  <div className="flex flex-col sm:flex-row gap-4 justify-center items-center text-sm text-white/80">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" /> 
                      {dateInfo.dayMonth}
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Private Event
                    </div>
                  </div>
                </div>

                <div className="bg-white/10 border border-white/20 rounded-xl p-6 space-y-4">
                  <div className="flex items-center justify-center gap-2 text-white">
                    <Shield className="h-5 w-5" />
                    <span className="font-medium">This is a private event</span>
                  </div>
                  <p className="text-white/70 text-sm max-w-md mx-auto">
                    Only invited guests can view the full event details. Request access from the host to see more information and RSVP.
                  </p>
                  
                  {user ? (
                    <div className="space-y-3">
                      {event.hasRequestedAccess ? (
                        <div className="text-center">
                          <Badge className="bg-yellow-500/20 border-yellow-500/40 text-yellow-200">
                            Request Pending
                          </Badge>
                          <p className="text-white/60 text-sm mt-2">Your access request is pending approval</p>
                        </div>
                      ) : (
                        <Button 
                          onClick={handleRequestAccess}
                          disabled={requestAccessMutation.isPending}
                          className="bg-purple-600 hover:bg-purple-700 text-white w-full sm:w-auto"
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
                          {requestAccessMutation.isPending ? "Requesting..." : "Request Access"}
                        </Button>
                      )}
                    </div>
                  ) : (
                    <p className="text-white/60 text-sm">Sign in to request access to this event</p>
                  )}
                </div>

                {/* Share functionality for private events */}
                <div className="bg-white/5 border border-white/15 rounded-xl p-4">
                  <div className="flex flex-col gap-3">
                    <span className="text-white/80 font-medium flex items-center justify-center gap-2">
                      <Share2 className="h-4 w-4" /> Share event link
                    </span>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Input
                        readOnly
                        value={typeof window !== 'undefined' ? `${window.location.origin}/events/${id}/share` : ''}
                        className="bg-white/5 border-white/20 text-white placeholder:text-white/40"
                      />
                      <Button onClick={copyShareLink} variant="outline" className="border-white/30 text-white hover:bg-white/20">
                        {copied ? (<><Check className="h-4 w-4 mr-2" />Copied</>) : (<><Copy className="h-4 w-4 mr-2" />Copy</>)}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </SimpleBackground>
    );
  }

  // Full access view (public events or private events with access)
  return (
    <SimpleBackground className="min-h-screen">
      <div className="relative z-10">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
          {/* Back */}
          <div>
            <Button variant="ghost" onClick={() => setLocation(`/events/${id}`)} className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Event
            </Button>
          </div>

          {/* Hero */}
          <div className="relative rounded-2xl overflow-hidden border border-white/15 bg-white/5 backdrop-blur-md p-6 md:p-10">
            <div className="flex flex-col lg:flex-row gap-10">
              {/* Poster */}
              {event.posterData && (
                <div className="w-full max-w-sm mx-auto lg:mx-0">
                  <PosterGallery event={event} isPreview={true} />
                </div>
              )}
              {/* Title & Meta */}
              <div className="flex-1 flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-3">
                    <Badge className="bg-white/15 border-white/30 text-white backdrop-blur-sm">
                      {event.eventType === 'online' ? '🎮 Gaming Event' : '🎉 Party'}
                    </Badge>
                    <Badge variant="outline" className="bg-white/10 border-white/30 text-white backdrop-blur-sm">
                      {event.isPublic ? (<><Globe className="h-3 w-3 mr-1" />Public</>) : (<><Lock className="h-3 w-3 mr-1" />Private</>)}
                    </Badge>
                  </div>
                  <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-white drop-shadow">
                    {event.title}
                  </h1>
                  <p className="text-white/80 text-lg">Hosted by {event.hostName || 'Event Host'}</p>
                  <div className="grid sm:grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2 text-white/80">
                      <Calendar className="h-4 w-4" /> {dateInfo.full}
                    </div>
                    {event.location && (
                      <div className="flex items-center gap-2 text-white/80">
                        <MapPin className="h-4 w-4" />
                        { (event as any).mapLink ? (
                          <a href={(event as any).mapLink} target="_blank" rel="noopener noreferrer" className="text-blue-300 hover:text-blue-200 underline decoration-dotted">
                            {event.location}
                          </a>
                        ) : event.location }
                      </div>
                    )}
                  </div>
                </div>
                {/* Share Box */}
                <div className="bg-white/10 border border-white/20 rounded-xl p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-white font-medium flex items-center gap-2"><Share2 className="h-4 w-4" /> Share this event</span>
                    <Badge className="bg-white/15 text-white">Live</Badge>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Input
                      readOnly
                      value={typeof window !== 'undefined' ? `${window.location.origin}/events/${id}/share` : ''}
                      className="bg-white/5 border-white/20 text-white placeholder:text-white/40"
                    />
                    <Button onClick={copyShareLink} variant="outline" className="border-white/30 text-white hover:bg-white/20">
                      {copied ? (<><Check className="h-4 w-4 mr-2" />Copied</>) : (<><Copy className="h-4 w-4 mr-2" />Copy</>)}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-10">
            {/* Left / Main Column */}
            <div className="lg:col-span-2 space-y-8">
              {/* RSVP Section */}
              <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><Sparkles className="h-5 w-5" /> Are you going?</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <Button
                    onClick={() => handleRSVP('going')}
                    disabled={rsvpMutation.isPending}
                    className={`w-full ${currentUserRsvp === 'going' ? 'bg-green-600 hover:bg-green-700' : 'bg-white/10 border border-white/20 text-white hover:bg-green-600/20 hover:border-green-500'}`}
                  >✅ Going</Button>
                  <Button
                    onClick={() => handleRSVP('maybe')}
                    disabled={rsvpMutation.isPending}
                    className={`w-full ${currentUserRsvp === 'maybe' ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-white/10 border border-white/20 text-white hover:bg-yellow-600/20 hover:border-yellow-500'}`}
                  >🤔 Maybe</Button>
                  <Button
                    onClick={() => handleRSVP('not_going')}
                    disabled={rsvpMutation.isPending}
                    className={`w-full ${currentUserRsvp === 'not_going' ? 'bg-red-600 hover:bg-red-700' : 'bg-white/10 border border-white/20 text-white hover:bg-red-600/20 hover:border-red-500'}`}
                  >❌ Can't go</Button>
                </div>
                {!user && <p className="text-sm text-white/60 mt-3">Sign in to RSVP and get updates.</p>}
              </div>

              {/* About */}
              <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
                <h3 className="text-lg font-semibold text-white mb-3">About this event</h3>
                <p className="text-white/70 leading-relaxed">{event.description || 'No description provided for this event.'}</p>
              </div>

              {/* Attendee Stats */}
              <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
                <h3 className="text-lg font-semibold text-white mb-5">Responses</h3>
                <div className="grid grid-cols-3 gap-6 text-center">
                  <div>
                    <div className="text-3xl font-bold text-green-400">{event.goingCount || 0}</div>
                    <div className="text-xs uppercase tracking-wide text-white/60 mt-1">Going</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-yellow-400">{event.maybeCount || 0}</div>
                    <div className="text-xs uppercase tracking-wide text-white/60 mt-1">Maybe</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-red-400">{event.notGoingCount || 0}</div>
                    <div className="text-xs uppercase tracking-wide text-white/60 mt-1">Can't Go</div>
                  </div>
                </div>
                {event.maxGuests && <div className="mt-6 text-center text-sm text-white/60">Capacity: {event.maxGuests} max</div>}
              </div>
            </div>

            {/* Right / Sidebar */}
            <div className="space-y-8">
              <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 space-y-6 sticky top-6">
                <h3 className="text-lg font-semibold text-white">Event Details</h3>
                <div className="space-y-5">
                  <div className="flex items-start gap-3 text-white/80">
                    <Calendar className="h-5 w-5 mt-0.5" />
                    <div>
                      <div className="font-medium">{dateInfo.dayMonth}</div>
                      <div className="text-sm text-white/60">{dateInfo.time}</div>
                    </div>
                  </div>
                  {event.location && (
                    <div className="flex items-start gap-3 text-white/80">
                      <MapPin className="h-5 w-5 mt-0.5" />
                      <div>
                        <div className="font-medium">Location</div>
                        <div className="text-sm text-white/60">
                          {(event as any).mapLink ? (
                            <a href={(event as any).mapLink} target="_blank" rel="noopener noreferrer" className="text-blue-300 hover:text-blue-200 underline decoration-dotted">{event.location}</a>
                          ) : event.location}
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-3 text-white/80">
                    <Users className="h-5 w-5 mt-0.5" />
                    <div>
                      <div className="font-medium">Capacity</div>
                      <div className="text-sm text-white/60">{event.maxGuests ? `Up to ${event.maxGuests} people` : 'Unlimited'}</div>
                    </div>
                  </div>
                </div>
                <div className="pt-2 space-y-3">
                  <Button variant="outline" className="w-full border-white/30 text-white hover:bg-white/15" onClick={() => setLocation(`/events/${id}`)}>View Full Event Page</Button>
                  <Button variant="outline" className="w-full border-white/30 text-white hover:bg-white/15" onClick={copyShareLink}>{copied ? (<><Check className='h-4 w-4 mr-2'/>Copied</>) : (<><Copy className='h-4 w-4 mr-2'/>Copy Share Link</>)}</Button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </SimpleBackground>
  );
}