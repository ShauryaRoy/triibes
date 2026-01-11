import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar, CheckCircle, XCircle, Lock, MapPin, Clock, User } from "lucide-react";
import { LoginDialog } from "@/components/LoginDialog";
import { format } from "date-fns";

export default function EventInvitePage() {
  const { code } = useParams<{ code: string }>();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  const [status, setStatus] = useState<"loading" | "valid" | "invalid" | "success" | "error">("loading");
  const [eventInfo, setEventInfo] = useState<{
    title: string;
    description?: string;
    date: string;
    time: string;
    location?: string;
    hostName?: string;
    slug?: string;
    id?: number;
    isClosed?: boolean;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isJoining, setIsJoining] = useState(false);
  const [showLoginDialog, setShowLoginDialog] = useState(false);

  // Validate the invite code on mount
  useEffect(() => {
    const validateCode = async () => {
      if (!code) {
        setStatus("invalid");
        setErrorMessage("No invite code provided");
        return;
      }

      try {
        const response = await fetch(`/api/events/invite/${code}`, { credentials: "include" });
        if (!response.ok) {
          const error = await response.json();
          setStatus("invalid");
          setErrorMessage(error.message || "Invalid invite code");
          return;
        }

        const data = await response.json();
        // Parse datetime if provided instead of separate date/time
        let eventDate = data.event.date;
        let eventTime = data.event.time;
        if (data.event.datetime && !eventDate) {
          const dt = new Date(data.event.datetime);
          eventDate = dt.toISOString().split('T')[0];
          eventTime = dt.toTimeString().slice(0, 5);
        }
        
        setEventInfo({
          title: data.event.title,
          description: data.event.description,
          date: eventDate,
          time: eventTime,
          location: data.event.location,
          hostName: data.event.hostName,
          slug: data.event.slug,
          id: data.event.id,
          isClosed: data.event.isClosed,
        });
        setStatus("valid");
      } catch (error) {
        setStatus("invalid");
        setErrorMessage("Failed to validate invite code");
      }
    };

    if (!authLoading) {
      validateCode();
    }
  }, [code, authLoading]);

  const handleJoin = async () => {
    if (eventInfo?.isClosed) {
      toast({
        title: "Event closed",
        description: "Event is closed by the host",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      // Store the current URL for redirect after login
      sessionStorage.setItem('redirectAfterLogin', `/event-invite/${code}`);
      setShowLoginDialog(true);
      return;
    }

    setIsJoining(true);
    try {
      const response = await apiRequest("POST", "/api/events/join-by-code", { code });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to join event");
      }

      setStatus("success");
      toast({
        title: "RSVP Confirmed!",
        description: `You're now attending ${eventInfo?.title || "the event"}`,
      });

      // Redirect to the event page after a short delay
      setTimeout(() => {
        const eventIdentifier = eventInfo?.slug || eventInfo?.id || data.eventId;
        setLocation(`/events/${eventIdentifier}`);
      }, 1500);
    } catch (error: any) {
      setStatus("error");
      setErrorMessage(error.message || "Failed to join event");
      toast({
        title: "Failed to RSVP",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsJoining(false);
    }
  };

  const formatEventDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "EEEE, MMMM d, yyyy");
    } catch {
      return dateStr;
    }
  };

  const formatEventTime = (timeStr: string) => {
    try {
      const [hours, minutes] = timeStr.split(':');
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes));
      return format(date, "h:mm a");
    } catch {
      return timeStr;
    }
  };

  // Show loading while checking auth
  if (authLoading || status === "loading") {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto" />
          <p className="text-white/60">Validating invite code...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-gray-900 rounded-xl border border-white/10 p-8 text-center space-y-6">
          {/* Icon */}
          <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center ${
            status === "success" 
              ? "bg-green-500/20" 
              : status === "invalid" || status === "error"
              ? "bg-red-500/20"
              : "bg-primary/20"
          }`}>
            {status === "success" && <CheckCircle className="h-8 w-8 text-green-400" />}
            {(status === "invalid" || status === "error") && <XCircle className="h-8 w-8 text-red-400" />}
            {status === "valid" && <Calendar className="h-8 w-8 text-primary" />}
          </div>

          {/* Content based on status */}
          {status === "valid" && eventInfo && (
            <>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-white">You're Invited!</h1>
                <p className="text-xl font-semibold text-white mt-2">{eventInfo.title}</p>

                {eventInfo.isClosed && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 mt-4">
                    <p className="text-red-200 text-sm">Event is closed by the host</p>
                  </div>
                )}
                
                {/* Event Details */}
                <div className="text-left space-y-2 mt-4 p-4 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex items-center gap-2 text-white/70 text-sm">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span>{formatEventDate(eventInfo.date)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/70 text-sm">
                    <Clock className="h-4 w-4 text-primary" />
                    <span>{formatEventTime(eventInfo.time)}</span>
                  </div>
                  {eventInfo.location && (
                    <div className="flex items-center gap-2 text-white/70 text-sm">
                      <MapPin className="h-4 w-4 text-primary" />
                      <span>{eventInfo.location}</span>
                    </div>
                  )}
                  {eventInfo.hostName && (
                    <div className="flex items-center gap-2 text-white/70 text-sm">
                      <User className="h-4 w-4 text-primary" />
                      <span>Hosted by {eventInfo.hostName}</span>
                    </div>
                  )}
                </div>

                {eventInfo.description && (
                  <p className="text-white/50 text-sm mt-2 line-clamp-3">{eventInfo.description}</p>
                )}
              </div>

              {!user && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <div className="flex items-center gap-2 text-amber-400 text-sm">
                    <Lock className="h-4 w-4" />
                    <span>Sign in to RSVP for this event</span>
                  </div>
                </div>
              )}

              <Button
                onClick={handleJoin}
                disabled={isJoining}
                className="w-full brand-gradient text-lg py-6"
              >
                {isJoining ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    RSVPing...
                  </>
                ) : user ? (
                  "RSVP Now"
                ) : (
                  "Sign In to RSVP"
                )}
              </Button>
            </>
          )}

          {status === "success" && (
            <div className="space-y-4">
              <h1 className="text-2xl font-bold text-white">You're In!</h1>
              <p className="text-white/60">
                You've successfully RSVP'd to <span className="text-white font-medium">{eventInfo?.title}</span>
              </p>
              <p className="text-white/40 text-sm">Redirecting you to the event...</p>
            </div>
          )}

          {(status === "invalid" || status === "error") && (
            <div className="space-y-4">
              <h1 className="text-2xl font-bold text-white">
                {status === "invalid" ? "Invalid Invite" : "Error"}
              </h1>
              <p className="text-white/60">{errorMessage}</p>
              <Button
                variant="outline"
                onClick={() => setLocation("/discover")}
                className="border-white/20 text-white hover:bg-white/10"
              >
                Browse Events
              </Button>
            </div>
          )}
        </div>

        {/* Back link */}
        <div className="text-center mt-4">
          <button
            onClick={() => setLocation("/")}
            className="text-white/40 hover:text-white/60 text-sm transition-colors"
          >
            ← Back to Home
          </button>
        </div>
      </div>

      {/* Login Dialog */}
      <LoginDialog
        open={showLoginDialog}
        onOpenChange={setShowLoginDialog}
      />
    </div>
  );
}
