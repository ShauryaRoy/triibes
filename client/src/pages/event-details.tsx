import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Calendar, 
  MapPin, 
  Users, 
  Eye, 
  Camera, 
  Cloud, 
  Check, 
  X, 
  HelpCircle, 
  UserPlus,
  Heart,
  Send,
  Plus,
  ArrowLeft,
  Globe,
  Lock,
  Copy,
  ExternalLink,
  Shield,
  Settings,
  Share2,
  Ticket,
  Loader2
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import { lazy, Suspense } from "react";
import Header from "@/components/layout/header";
import MobileNav from "@/components/layout/mobile-nav";
import GuestList from "@/components/guest-list";
import AccessRequests from "@/components/access-requests";
import Polls from "@/components/polls";
import PosterGallery from "@/components/poster-gallery";
import { SimpleBackground } from "@/components/simple-background";
import { ThemeBackground } from "@/components/ThemeBackground";
import { MinimalSpinner } from "@/components/page-skeleton";
import type { Event } from "@shared/schema";
import { SEO } from "@/components/SEO";
import { PaymentModal } from "@/components/PaymentModal";
import { LoginDialog } from "@/components/LoginDialog";
import { EventInviteDialog } from "@/components/event-invite-dialog";

// Lazy-load heavy components to reduce main-thread work
const ExpenseTracker = lazy(() => import("@/components/expense-tracker"));
const PosterCustomizer = lazy(() => import("@/components/poster-customizer"));

export default function EventDetails() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("polls");
  const [newComment, setNewComment] = useState("");
  const [isPosterCustomizerOpen, setIsPosterCustomizerOpen] = useState(false);
  const [mapLinkCopied, setMapLinkCopied] = useState(false);
  const [eventLinkCopied, setEventLinkCopied] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [hasPaid, setHasPaid] = useState(false);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteCodeInput, setInviteCodeInput] = useState("");
  const [isJoiningWithCode, setIsJoiningWithCode] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showFullCapacityDialog, setShowFullCapacityDialog] = useState(false);
  const [fullCapacityMessage, setFullCapacityMessage] = useState("");

  // Debug tab switching
  const handleTabChange = (value: string) => {
    console.log('[EventDetails] Switching tab to:', value);
    setActiveTab(value);
  };

  const { data: event, isLoading, error } = useQuery<any>({
    queryKey: [`/api/events/${id}`],
    queryFn: async () => {
      const response = await fetch(`/api/events/${id}`, { credentials: "include" });
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Event not found");
        }
        if (response.status >= 500) {
          throw new Error("Database connection error - please try again later");
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      // console.log('🎯 Event data received, rsvpMode:', data.rsvpMode); // Debug log
      return data;
    },
    enabled: !!id,
    retry: (failureCount, error) => {
      // Don't retry on 404s
      if (error?.message === "Event not found") return false;
      // Retry database errors up to 3 times
      return failureCount < 3;
    },
    retryDelay: 1000,
  });

  // Define rsvpMutation before any useEffects that reference it
  const rsvpMutation = useMutation({
    mutationFn: async ({ status }: { status: string }) => {
      try {
        const response = await apiRequest("POST", `/api/events/${id}/rsvp`, { status });
        return response.json();
      } catch (err: any) {
        // apiRequest throws errors in format "403: {...json...}"
        const errorMessage = err.message || "";
        console.log("Raw error message:", errorMessage);
        
        // Extract status code and JSON from error message
        const match = errorMessage.match(/^(\d+):\s*(.+)$/s);
        if (match) {
          const jsonStr = match[2];
          
          try {
            const errorData = JSON.parse(jsonStr);
            console.log("Parsed error data:", errorData);
            
            // Attach parsed data to the error object
            err.data = errorData;
            console.log("Error data attached:", err.data);
          } catch (parseErr) {
            console.log("Failed to parse error JSON:", parseErr);
          }
        }
        
        // Always throw the error (with data attached if parsing succeeded)
        throw err;
      }
    },
    // Retry on 5xx errors (server errors) up to 2 times
    retry: (failureCount, error: any) => {
      // Only retry on 500 errors, not on 4xx client errors
      if (error?.message?.includes('500') && failureCount < 2) {
        console.log(`RSVP retry attempt ${failureCount + 1}`);
        return true;
      }
      return false;
    },
    retryDelay: 1000,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${id}`] });
      toast({
        title: "RSVP updated!",
        description: "Your response has been recorded.",
      });
    },
    onError: (error: any) => {
      console.error("RSVP mutation error:", error);
      console.error("Error object keys:", Object.keys(error || {}));
      
      // Get error data from the error object
      const errorData = error?.data || {};
      console.log("RSVP error data:", errorData);
      console.log("Is eventFull true?:", errorData?.eventFull);
      
      // Check if this is a capacity reached error
      if (errorData?.eventFull === true) {
        console.log("✅ Capacity error detected, showing dialog");
        const capacityMsg = (errorData.message || `Event capacity has been reached`).replace(/\.$/, '');
        setFullCapacityMessage(capacityMsg);
        setShowFullCapacityDialog(true);
        return; // Return early to prevent red error toast from showing
      }
      
      console.log("❌ Not a capacity error, showing generic toast");
      // Otherwise show generic error
      toast({
        title: "Error",
        description: errorData.message || error.message || "Failed to update RSVP. Please refresh the page and try again.",
        variant: "destructive",
      });
    },
  });

  // Check if user has already RSVP'd as going (which means they paid for paid events)
  useEffect(() => {
    if (user && event?.rsvps) {
      const userRsvp = event.rsvps.find((rsvp: any) => String(rsvp.userId) === String(user.id));
      if (userRsvp?.status === 'going') {
        setHasPaid(true);
      }
    }
  }, [user, event?.rsvps]);

  // Handle redirect back after login - DO NOT auto-register or show payment modal
  useEffect(() => {
    if (user && event && !isLoading) {
      const pendingRsvpStatus = sessionStorage.getItem('pendingRsvpStatus');
      const redirectPath = sessionStorage.getItem('redirectAfterLogin');
      
      // Check if we're on the same event page we redirected from
      if (pendingRsvpStatus && redirectPath === window.location.pathname) {
        // Clear the stored values to prevent loops
        sessionStorage.removeItem('pendingRsvpStatus');
        sessionStorage.removeItem('redirectAfterLogin');
        
        // DO NOT auto-register or show payment modal after login
        // User must explicitly click the Register/RSVP button again after logging in
        // This prevents accidental registration
        
        // Optional: Show a toast to remind the user to click the button again
        toast({
          title: "Login Successful",
          description: "Please click the Register button to complete your registration.",
          duration: 4000,
        });
      }
    }
  }, [user, event, isLoading]);

  // Handle pending invite code after login
  useEffect(() => {
    if (user && !isLoading) {
      const pendingInviteCode = sessionStorage.getItem('pendingEventInviteCode');
      const redirectPath = sessionStorage.getItem('redirectAfterLogin');
      
      if (pendingInviteCode && redirectPath === window.location.pathname) {
        // Clear the stored values first to prevent loops
        sessionStorage.removeItem('pendingEventInviteCode');
        sessionStorage.removeItem('redirectAfterLogin');
        
        // Auto-submit the invite code
        const joinWithCode = async () => {
          setIsJoiningWithCode(true);
          try {
            const response = await apiRequest("POST", "/api/events/join-by-code", { code: pendingInviteCode });
            const data = await response.json();
            if (!response.ok) {
              throw new Error(data.message || "Failed to join event");
            }
            toast({ title: "Success!", description: "You've joined the event" });
            // Refresh the page to show full event
            window.location.reload();
          } catch (error: any) {
            toast({ title: "Failed to join", description: error.message, variant: "destructive" });
            setInviteCodeInput(pendingInviteCode); // Preserve the code for retry
          } finally {
            setIsJoiningWithCode(false);
          }
        };
        
        setTimeout(joinWithCode, 500);
      }
    }
  }, [user, isLoading, toast]);

  // Moved before early returns to keep hook order stable across renders
  const dateInfo = useMemo(() => {
    if (!event?.datetime) return { full: "", dayMonth: "", time: "" };
    const d = new Date(event.datetime);
    return {
      full: d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }),
      dayMonth: d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }),
      time: d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    };
  }, [event?.datetime]);

  // Check if user has access to view private event details
  const hasAccess = useMemo(() => {
    if (!event) return false;
    
    // Default to public if isPublic is not explicitly set to false
    // This handles cases where isPublic might be undefined/null
    const isPublicEvent = event.isPublic !== false;
    
    // Public events are always accessible
    if (isPublicEvent) return true;
    
    // For private events, require authentication
    if (!user) return false;
    
    // Host always has access to their own events
    const userIdStr = String(user.id);
    const hostIdStr = String(event.hostId);
    if (userIdStr === hostIdStr) return true;
    
    // Check if user has RSVP'd (which means they were invited)
    const currentUserRsvp = event?.rsvps?.find((rsvp: any) => {
      const rsvpUserIdStr = String(rsvp.userId);
      return rsvpUserIdStr === userIdStr;
    });
    
    if (currentUserRsvp) return true;
    
    // Check if user is explicitly invited or granted access
    if (event.isUserInvited) return true;
    
    // For private events, default to no access
    return false;
  }, [user, event]);

  // Handle access control with useEffect - always call this hook
  // REMOVED AUTOMATIC REDIRECT - this was causing infinite loops
  // useEffect(() => {
  //   console.log('🔄 useEffect access control check:', { event: !!event, hasAccess, loading: isLoading });
  //   if (event && !isLoading && !hasAccess) {
  //     console.log('🚨 Redirecting to share page');
  //     setLocation(`/events/${id}/share`);
  //   }
  // }, [event, hasAccess, id, setLocation, isLoading]);

  const postMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest("POST", `/api/events/${id}/posts`, { content });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${id}`] });
      setNewComment("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to post comment.",
        variant: "destructive",
      });
    },
  });

  const handleRsvp = async (status: string) => {
    if (!user) {
      // Store the current event URL and intended RSVP status in sessionStorage
      sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
      sessionStorage.setItem('pendingRsvpStatus', status);
      
      // Show login dialog instead of redirecting
      setShowLoginDialog(true);
      return;
    }

    // For paid events with status "going", check capacity on server BEFORE showing payment modal
    if (status === "going" && event?.ticketPrice && event.ticketPrice > 0 && !hasPaid) {
      try {
        const capacityResponse = await fetch(`/api/events/${id}/check-capacity`, {
          credentials: 'include',
        });
        
        if (capacityResponse.ok) {
          const capacityData = await capacityResponse.json();
          
          if (!capacityData.available) {
            // Event is full, show capacity dialog immediately
            setFullCapacityMessage(capacityData.message.replace(/\.$/, ''));
            setShowFullCapacityDialog(true);
            return;
          }
        }
      } catch (error) {
        console.error('Error checking capacity:', error);
        // If check fails, proceed anyway (backend will check again)
      }
      
      // Capacity available or check failed, show payment modal
      setShowPaymentModal(true);
      return;
    }

    // For free events with status "going", check capacity before proceeding
    if (status === "going" && event?.maxGuests && event.maxGuests > 0 && (!event.ticketPrice || event.ticketPrice === 0)) {
      try {
        const capacityResponse = await fetch(`/api/events/${id}/check-capacity`, {
          credentials: 'include',
        });
        
        if (capacityResponse.ok) {
          const capacityData = await capacityResponse.json();
          
          if (!capacityData.available) {
            // Event is full, show capacity dialog
            setFullCapacityMessage(capacityData.message.replace(/\.$/, ''));
            setShowFullCapacityDialog(true);
            return;
          }
        }
      } catch (error) {
        console.error('Error checking capacity:', error);
        // If check fails, proceed anyway (backend will check again)
      }
    }

    // For "maybe" and "not_going", or already paid, proceed directly
    rsvpMutation.mutate({ status });
  };

  const handlePostComment = () => {
    if (!newComment.trim()) return;
    if (!user) {
      toast({
        title: "Please log in",
        description: "You need to be logged in to post comments.",
        variant: "destructive",
      });
      return;
    }
    postMutation.mutate(newComment);
  };

  const handleSavePoster = async (posterData: any) => {
    // console.log("💾 handleSavePoster called with:", posterData);
    try {
      console.log("📡 Making API request to save poster...");
      await apiRequest("PUT", `/api/events/${id}`, {
        posterData
      });
      
      console.log("✅ Poster API request successful, invalidating queries...");
      queryClient.invalidateQueries({ queryKey: [`/api/events/${id}`] });
      toast({
        title: "Poster saved!",
        description: "Your custom poster has been saved.",
      });
    } catch (error) {
      // console.error("💥 Error saving poster:", error);
      toast({
        title: "Error",
        description: "Failed to save poster.",
        variant: "destructive",
      });
    }
  };

  const copyMapLink = async () => {
    const mapLinkUrl = event.mapLink || event.map_link;
    if (!mapLinkUrl) return;
    
    try {
      await navigator.clipboard.writeText(mapLinkUrl);
      setMapLinkCopied(true);
      toast({
        title: "Map link copied!",
        description: "The navigation link has been copied to your clipboard.",
      });
      setTimeout(() => setMapLinkCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Please copy the link manually.",
        variant: "destructive",
      });
    }
  };

  const copyEventLink = async () => {
    const eventUrl = `${window.location.origin}/events/${event.slug || event.id}`;
    
    try {
      // Try native share API first (works on mobile)
      if (navigator.share) {
        await navigator.share({
          title: event.title,
          text: `Check out this event: ${event.title}`,
          url: eventUrl,
        });
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(eventUrl);
        setEventLinkCopied(true);
        toast({
          title: "Event link copied!",
          description: "Share this link to invite others to the event.",
        });
        setTimeout(() => setEventLinkCopied(false), 2000);
      }
    } catch (error: any) {
      // User cancelled share or clipboard failed
      if (error.name !== 'AbortError') {
        try {
          await navigator.clipboard.writeText(eventUrl);
          setEventLinkCopied(true);
          toast({
            title: "Event link copied!",
            description: "Share this link to invite others to the event.",
          });
          setTimeout(() => setEventLinkCopied(false), 2000);
        } catch {
          toast({
            title: "Copy failed",
            description: "Please copy the link manually.",
            variant: "destructive",
          });
        }
      }
    }
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

  const getUserRsvpStatus = () => {
    if (!user || !event?.rsvps) return null;
    return event.rsvps.find((rsvp: any) => rsvp.userId === user.id)?.status;
  };

  const getRsvpCounts = () => {
    if (!event?.rsvps) return { going: 0, maybe: 0, not_going: 0 };
    return event.rsvps.reduce((acc: any, rsvp: any) => {
      acc[rsvp.status] = (acc[rsvp.status] || 0) + 1;
      return acc;
    }, { going: 0, maybe: 0, not_going: 0 });
  };

  // Moved before early returns to keep hook order stable across renders
  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen ">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">
            {error.message === "Event not found" ? "Event not found" : "Unable to load event"}
          </h1>
          <p className="text-muted-foreground mb-8">
            {error.message === "Event not found" 
              ? "The event you're looking for doesn't exist or has been deleted."
              : error.message.includes("Database connection") 
                ? "We're having trouble connecting to our database. Please try again in a few moments."
                : "Something went wrong while loading the event. Please try again."
            }
          </p>
          <div className="space-x-4">
            <Button onClick={() => window.location.reload()} variant="outline">
              Try Again
            </Button>
            <Link to="/events">
              <Button>Back to Home</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen ">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Event not found</h1>
          <p className="text-muted-foreground mb-8">
            The event you're looking for doesn't exist or has been deleted.
          </p>
          <Link href="/">
            <Button className="gaming-button">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Private event access control - show login for non-authenticated, limited view for unauthorized
  if (event && !hasAccess) {
    // If user is not logged in and this is a private event, show login dialog
    if (!user && event.isPublic === false) {
      return (
        <SimpleBackground className="min-h-screen">
          <div className="relative z-10">
            <Header />
            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
              {/* Back */}
              <div>
                <Button variant="ghost" onClick={() => setLocation("/")} className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20">
                  <ArrowLeft className="h-4 w-4 mr-2" /> Back to Home
                </Button>
              </div>

              {/* Private Event - Sign In Required */}
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
                    <p className="text-white/70 text-lg">Hosted by {event.hostName || event.host?.firstName || 'Event Host'}</p>
                    
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
                      <span className="font-medium">Sign in to view this event</span>
                    </div>
                    <p className="text-white/70 text-sm max-w-md mx-auto">
                      This is a private event. Sign in and enter an invite code if you have one.
                    </p>
                    
                    {/* Invite Code Entry - show hint */}
                    <div className="space-y-3 max-w-sm mx-auto">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Have an invite code?"
                          value={inviteCodeInput}
                          onChange={(e) => setInviteCodeInput(e.target.value.toUpperCase())}
                          className="bg-white/10 border-white/20 text-white placeholder:text-white/50 font-mono tracking-wider text-center"
                          maxLength={8}
                        />
                        <Button
                          onClick={() => {
                            if (inviteCodeInput.length >= 8) {
                              // Store the code and redirect to login
                              sessionStorage.setItem('pendingEventInviteCode', inviteCodeInput);
                              sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
                              setShowLoginDialog(true);
                            } else {
                              toast({ title: "Enter your invite code", description: "You'll need to sign in to use it", variant: "default" });
                              setShowLoginDialog(true);
                            }
                          }}
                          className="bg-primary hover:bg-primary/90"
                        >
                          <Ticket className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <Button 
                      onClick={() => setShowLoginDialog(true)}
                      className="brand-gradient text-white px-8 py-2"
                    >
                      Sign In to Continue
                    </Button>
                  </div>
                </div>
              </div>
            </main>
            <MobileNav />
            
            {/* Login Dialog */}
            <LoginDialog 
              open={showLoginDialog}
              onOpenChange={setShowLoginDialog}
              redirectPath={window.location.pathname}
            />
          </div>
        </SimpleBackground>
      );
    }
    
    // User is logged in but doesn't have access
    return (
      <SimpleBackground className="min-h-screen">
        <div className="relative z-10">
          <Header />
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
                  <div className="p-4 rounded-full bg-red-500/20 border border-red-500/30">
                    <Shield className="h-12 w-12 text-red-300" />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <Badge variant="outline" className="bg-red-500/20 border-red-500/40 text-red-200">
                    <Lock className="h-3 w-3 mr-1" />Access Denied
                  </Badge>
                  <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white drop-shadow">
                    {event.title}
                  </h1>
                  <p className="text-white/70 text-lg">Hosted by {event.hostName || event.host?.firstName || 'Event Host'}</p>
                  
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
                    <span className="font-medium">You don't have access to this event</span>
                  </div>
                  <p className="text-white/70 text-sm max-w-md mx-auto">
                    This is a private event. Enter an invite code if you have one, or contact the host for access.
                  </p>
                  
                  {/* Invite Code Entry */}
                  <div className="space-y-3 max-w-sm mx-auto">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter invite code..."
                        value={inviteCodeInput}
                        onChange={(e) => setInviteCodeInput(e.target.value.toUpperCase())}
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50 font-mono tracking-wider text-center"
                        maxLength={8}
                      />
                      <Button
                        onClick={async () => {
                          if (inviteCodeInput.length < 8) {
                            toast({ title: "Invalid code", description: "Please enter an 8-character invite code", variant: "destructive" });
                            return;
                          }
                          setIsJoiningWithCode(true);
                          try {
                            const response = await apiRequest("POST", "/api/events/join-by-code", { code: inviteCodeInput });
                            const data = await response.json();
                            if (!response.ok) {
                              throw new Error(data.message || "Failed to join event");
                            }
                            toast({ title: "Success!", description: "You've joined the event" });
                            // Refresh the page to show full event
                            queryClient.invalidateQueries({ queryKey: [`/api/events/${id}`] });
                            window.location.reload();
                          } catch (error: any) {
                            toast({ title: "Failed to join", description: error.message, variant: "destructive" });
                          } finally {
                            setIsJoiningWithCode(false);
                          }
                        }}
                        disabled={isJoiningWithCode || inviteCodeInput.length < 8}
                        className="bg-primary hover:bg-primary/90"
                      >
                        {isJoiningWithCode ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Ticket className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-white/50 text-xs text-center">
                      Have an invite code? Enter it above to join this event.
                    </p>
                  </div>
                  
                  <div className="pt-2">
                    <Button 
                      onClick={() => setLocation("/")}
                      variant="outline"
                      className="border-white/30 text-white hover:bg-white/10"
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Go Back Home
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </main>
          <MobileNav />
        </div>
      </SimpleBackground>
    );
  }

  const userRsvpStatus = getUserRsvpStatus();
  const rsvpCounts = getRsvpCounts();
  
  // Use ThemeBackground if event has a theme, otherwise SimpleBackground
  const BackgroundComponent = event?.themeId ? ThemeBackground : SimpleBackground;
  
  return (
    <BackgroundComponent 
      themeId={event?.themeId}
      className="min-h-screen"
    >
      {/* SEO Meta Tags */}
      <SEO 
        title={event.title}
        description={event.description || `Join us for ${event.title}. Discover amazing events and connect with your community on Tribbe.`}
        image={event.imageUrl || undefined}
        url={`https://tribbe.in/events/${event.slug || event.id}`}
        type="event"
      />
      
      {/* Full page overlay for content readability */}
      <div className="absolute inset-0 bg-black/20" />
      {/* Page content */}
      <div className="relative z-10">
        <Header />
        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20 pb-16 md:pb-10 space-y-4 sm:space-y-6">
          {/* Back Button - At the top */}
          <div>
            <Link href="/">
              <Button variant="outline" className="text-white border-white/30 bg-white/10 hover:bg-white/20 h-8 px-2.5 text-sm backdrop-blur-sm">
                <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Back
              </Button>
            </Link>
          </div>

          {/* Hero Section */}
          <div className="relative rounded-xl overflow-hidden border border-white/15 bg-white/5 backdrop-blur-md p-4 md:p-6">
            <div className="flex flex-col gap-6">
              {/* Poster - Always show, centered at top */}
              <div className="w-full max-w-xs sm:max-w-sm lg:max-w-md mx-auto">
                <PosterGallery event={event} isPreview={true} onCustomize={() => setIsPosterCustomizerOpen(true)} />
              </div>
              {/* Title & Meta - Now below poster */}
              <div className="flex flex-col space-y-4">
                <div className="space-y-3">
                  {/* Top Row: Badges + Manage + Invite */}
                  <div className="flex flex-wrap items-center gap-2 justify-end">
                    <Badge variant="outline" className="bg-white/10 border-white/30 text-white backdrop-blur-sm text-xs h-7 px-2">
                      {event.isPublic ? (<><Globe className="h-3 w-3 mr-1" />Public</>) : (<><Lock className="h-3 w-3 mr-1" />Private</>)}
                    </Badge>
                    {/* Manage Event button - only visible to hosts */}
                    {user && String(user.id) === String(event.hostId) && (
                      <Link href={`/edit-event/${event.slug || event.id}`}>
                        <Button variant="outline" size="sm" className="text-white border-white/30 bg-white/10 hover:bg-white/20 h-7 px-2 text-xs backdrop-blur-sm">
                          <Settings className="h-3 w-3 mr-1" /> Manage
                        </Button>
                      </Link>
                    )}
                    {/* Invite Button */}
                    <Button
                      onClick={() => {
                        // For private events and host, show invite code dialog
                        if (!event.isPublic && user?.id === event.hostId) {
                          setShowInviteDialog(true);
                        } else {
                          copyEventLink();
                        }
                      }}
                      size="sm"
                      className="bg-white/10 hover:bg-blue-600/20 border border-white/20 hover:border-blue-400 text-white font-semibold transition-all duration-300 h-7 px-2 text-xs backdrop-blur-sm"
                    >
                      {eventLinkCopied ? (
                        <><Check className="mr-1 h-3 w-3" /> Copied!</>
                      ) : (
                        <><Share2 className="mr-1 h-3 w-3" /> Invite</>
                      )}
                    </Button>
                  </div>
                  <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white drop-shadow">{event.title}</h1>
                  <p className="text-white/80 text-base">
                    Hosted by {event.host ? `${event.host.firstName || ''} ${event.host.lastName || ''}`.trim() || event.host.email : 'Event Host'}
                  </p>
                  <div className="grid sm:grid-cols-2 gap-2 text-xs">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-white/80">
                        <Calendar className="h-3.5 w-3.5" /> {dateInfo.full}{dateInfo.time && <span className="ml-1">• {dateInfo.time}</span>}
                      </div>
                      {event.ticketPrice > 0 && !hasPaid && (
                        <div className="flex items-center gap-1.5">
                          <Ticket className="h-3.5 w-3.5" /> ₹{event.ticketPrice} per person
                        </div>
                      )}
                    </div>
                    {event.location && (
                      <div className="flex items-center gap-1.5 text-white/80">
                        <MapPin className="h-3.5 w-3.5" />
                        {(event.mapLink || event.map_link) ? (
                          <a href={event.mapLink || event.map_link} target="_blank" rel="noopener noreferrer" className="text-blue-300 hover:text-blue-200 underline decoration-dotted">
                            {event.location}
                          </a>
                        ) : (
                          <span>{event.location}</span>
                        )}
                      </div>
                    )}
                    {/* Only show registered/going count based on guest list visibility settings */}
                    {(() => {
                      const guestListVisibility = event.guestListVisibility || 'everyone';
                      const isHost = String(user?.id) === String(event.hostId);
                      const isAttending = event.rsvps?.some((rsvp: any) => rsvp.userId === user?.id && rsvp.status === 'going');
                      const shouldShowCount = 
                        guestListVisibility === 'everyone' || 
                        (guestListVisibility === 'host-only' && isHost) ||
                        (guestListVisibility === 'attendees-only' && (isHost || isAttending));
                      
                      return shouldShowCount ? (
                        <div className="flex items-center gap-1.5 text-white/80">
                          <Users className="h-3.5 w-3.5" /> {rsvpCounts.going} {event.rsvpMode === 'register' ? 'registered' : 'going'}
                        </div>
                      ) : null;
                    })()}
                  </div>
                </div>
                {/* RSVP Actions */}
                <div className="space-y-2">
                  <h3 className="text-xs font-medium uppercase tracking-wide text-white/60">
                    {event.rsvpMode === 'register' ? ' ' : 'Your RSVP'}
                  </h3>
                  {/* {event.ticketPrice > 0 && !hasPaid && (
                    <div className="bg-amber-500/20 border border-amber-400/50 rounded-md p-2 mb-2">
                      <p className="text-xs text-amber-100 flex items-center gap-1.5">
                        <span className="text-sm">🎫</span>
                        <span>
                          Cost: <strong className="text-amber-50">₹{event.ticketPrice}</strong> per person
                        </span>
                      </p>
                    </div>
                  )} */}
                  {event.ticketPrice > 0 && hasPaid && (
                    <div className="bg-green-500/20 border border-green-400/50 rounded-md p-2 mb-2">
                      <p className="text-xs text-green-100 flex items-center gap-1.5">
                        <span className="text-sm">✅</span>
                        <span>Payment Confirmed</span>
                      </p>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 w-full">
                    {/* Register Mode - Single button */}
                    {event.rsvpMode === 'register' ? (
                      <div className="flex gap-2 w-full sm:w-auto min-w-0">
                        <Button
                          onClick={() => handleRsvp("going")}
                          disabled={rsvpMutation.isPending}
                          size="sm"
                          className={`${userRsvpStatus === "going" 
                            ? "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg shadow-green-500/40 hover:shadow-green-500/60" 
                            : "bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-lg shadow-blue-500/40 hover:shadow-blue-500/60 hover:scale-105"
                          } text-white font-semibold transition-all duration-300 h-9 px-3 sm:px-5 text-xs sm:text-sm rounded-lg border-0 ${userRsvpStatus === "going" ? "flex-1 sm:flex-initial" : "w-full sm:w-auto"}`}
                        >
                          <Check className="mr-1 sm:mr-1.5 h-3 w-3 sm:h-4 sm:w-4" /> 
                          {userRsvpStatus === "going" ? "Registered" : 'Register Now'}
                        </Button>
                        {userRsvpStatus === "going" && (
                          <Button
                            onClick={() => setShowCancelDialog(true)}
                            disabled={rsvpMutation.isPending}
                            size="sm"
                            className="bg-white/10 hover:bg-red-600/20 border border-white/20 hover:border-red-400 text-white font-semibold transition-all duration-300 h-9 px-3 sm:px-5 text-xs sm:text-sm rounded-lg flex-1 sm:flex-initial whitespace-nowrap"
                          >
                            <X className="mr-1 sm:mr-1.5 h-3 w-3 sm:h-4 sm:w-4" /> Cancel
                          </Button>
                        )}
                      </div>
                    ) : (
                      /* RSVP Mode - Three buttons */
                      <div className="flex gap-2 w-full sm:w-auto">
                        <Button
                          onClick={() => handleRsvp("going")}
                          disabled={rsvpMutation.isPending}
                          size="sm"
                          className={`${userRsvpStatus === "going" 
                            ? "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg shadow-green-500/40 hover:shadow-green-500/60" 
                            : userRsvpStatus === "maybe" || userRsvpStatus === "not_going"
                              ? "bg-white/10 hover:bg-blue-600/20 border border-white/20 hover:border-blue-400"
                              : "bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-lg shadow-blue-500/40 hover:shadow-blue-500/60 hover:scale-105"
                          } text-white font-semibold transition-all duration-300 h-9 px-3 text-xs sm:text-sm rounded-lg border-0 flex-1 sm:flex-initial`}
                        >
                          <Check className="mr-1 sm:mr-1.5 h-3 w-3 sm:h-4 sm:w-4" /> 
                          {userRsvpStatus === "going" ? 'Going' : 'Going'}
                        </Button>
                        <Button
                          onClick={() => handleRsvp("maybe")}
                          disabled={rsvpMutation.isPending}
                          size="sm"
                          className={`${userRsvpStatus === "maybe" 
                            ? "bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 shadow-lg shadow-yellow-500/40 hover:shadow-yellow-500/60" 
                            : "bg-white/10 hover:bg-yellow-600/20 border border-white/20 hover:border-yellow-400"
                          } text-white font-semibold transition-all duration-300 h-9 px-3 text-xs sm:text-sm rounded-lg flex-1 sm:flex-initial`}
                        >
                          <HelpCircle className="mr-1 sm:mr-1.5 h-3 w-3 sm:h-4 sm:w-4" /> Maybe
                        </Button>
                        <Button
                          onClick={() => handleRsvp("not_going")}
                          disabled={rsvpMutation.isPending}
                          size="sm"
                          className={`${userRsvpStatus === "not_going" 
                            ? "bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 shadow-lg shadow-red-500/40 hover:shadow-red-500/60" 
                            : "bg-white/10 hover:bg-red-600/20 border border-white/20 hover:border-red-400"
                          } text-white font-semibold transition-all duration-300 h-9 px-3 text-xs sm:text-sm rounded-lg flex-1 sm:flex-initial`}
                        >
                          <X className="mr-1 sm:mr-1.5 h-3 w-3 sm:h-4 sm:w-4" /> Can't Go
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Map Link Section */}
          {event.location && (
            <div className="relative rounded-xl overflow-hidden border border-white/15 bg-white/5 backdrop-blur-md p-4">
              <div className="space-y-3">
                <h3 className="text-base font-semibold text-white flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  On Maps
                </h3>
                <div className="space-y-2">
                  {/* <p className="text-white/80 text-sm">
                    <span className="font-medium">{event.location}</span>
                  </p> */}
                  {(event.mapLink || event.map_link) ? (
                    <div className="flex items-center gap-2 p-2 bg-white/10 rounded-md border border-white/20">
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-white/60 mb-0.5">Navigation Link</p>
                        <p className="text-xs text-white font-mono truncate">{event.mapLink || event.map_link}</p>
                      </div>
                      <div className="flex gap-1.5">
                        <Button
                          onClick={copyMapLink}
                          variant="outline"
                          size="sm"
                          className="border-white/30 text-white bg-white/10 hover:bg-white/20 backdrop-blur-sm h-7 w-7 p-0"
                        >
                          {mapLinkCopied ? (
                            <Check className="h-3.5 w-3.5" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        <a
                          href={event.mapLink || event.map_link}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-blue-400/50 text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 backdrop-blur-sm h-7 px-2 text-xs"
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Open
                          </Button>
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2 bg-white/5 rounded-md border border-white/10 text-center">
                      <p className="text-white/60 text-xs">No navigation link available for this location</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Custom Fields Section */}
          {event.settings?.customFields && Object.keys(event.settings.customFields).length > 0 && (
            <div className="relative rounded-xl overflow-hidden border border-white/15 bg-white/5 backdrop-blur-md p-4">
              <div className="space-y-3">
                <h3 className="text-base font-semibold text-white">Extra Details</h3>
                <div className="grid gap-2">
                  {Object.entries(event.settings.customFields).map(([key, value]) => 
                    value ? (
                      <div key={key} className="flex items-start gap-2 p-2 bg-white/10 rounded-md border border-white/20 overflow-hidden">
                        <span className="text-sm shrink-0">
                          {key === 'cost' ? '💰' : 
                           key === 'link' ? '🔗' : 
                           key === 'playlist' ? '🎵' : 
                           key === 'dress-code' ? '👕' : 
                           key === 'parking' ? '🚗' : 
                           key === 'food' ? '🍕' : 
                           key === 'gifts' ? '🎁' : '📋'}
                        </span>
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <p className="text-[10px] text-white/60 mb-0.5 capitalize">{key.replace('-', ' ')}</p>
                          <p className="text-xs text-white break-words overflow-wrap-anywhere whitespace-pre-wrap">{value as string}</p>
                        </div>
                      </div>
                    ) : null
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Event Description Section */}
          {event.description && (
            <div className="relative rounded-xl overflow-hidden border border-white/15 bg-white/5 backdrop-blur-md p-4">
              <div className="space-y-2">
                <h3 className="text-base font-semibold text-white">About This Event</h3>
                <p className="text-white/80 leading-relaxed whitespace-pre-wrap text-sm">{event.description}</p>
              </div>
            </div>
          )}

          {/* Main Content Grid */}
          {(() => {
            const guestListVisibility = event.guestListVisibility || 'everyone';
            const isHost = String(user?.id) === String(event.hostId);
            const isAttending = event.rsvps?.some((rsvp: any) => rsvp.userId === user?.id && rsvp.status === 'going');
            const shouldShowGuestList = 
              guestListVisibility === 'everyone' || 
              (guestListVisibility === 'host-only' && isHost) ||
              (guestListVisibility === 'attendees-only' && (isHost || isAttending));

            return (
              <div className={`grid gap-6 ${shouldShowGuestList ? 'lg:grid-cols-3' : 'lg:grid-cols-1'}`}>
                {/* Left Column */}
                <div className={shouldShowGuestList ? 'lg:col-span-2 space-y-4' : 'space-y-4'}>
              {/* Event Tabs - Improved Styling */}
              <div className="bg-white/10 backdrop-blur-md rounded-lg border border-white/20 p-4">
                <Tabs value={activeTab} onValueChange={handleTabChange}>
                  <TabsList className="grid w-full grid-cols-3 bg-white/10 border border-white/20 h-9">
                    <TabsTrigger value="polls" className="text-white data-[state=active]:bg-white/20 data-[state=active]:text-white text-xs">Polls</TabsTrigger>
                    <TabsTrigger value="expenses" className="text-white data-[state=active]:bg-white/20 data-[state=active]:text-white text-xs">Expenses</TabsTrigger>
                    <TabsTrigger value="photos" className="text-white data-[state=active]:bg-white/20 data-[state=active]:text-white text-xs">Photos</TabsTrigger>
                  </TabsList>

                  <TabsContent value="polls" className="mt-4">
                    {event?.id ? (
                      <Polls eventId={event.id} />
                    ) : (
                      <div className="flex items-center justify-center py-6 text-white/60">
                        <p className="text-sm">Loading polls...</p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="expenses" className="mt-4">
                    {event?.id ? (
                      <Suspense fallback={<MinimalSpinner />}>
                        <ExpenseTracker eventId={event.id} />
                      </Suspense>
                    ) : (
                      <div className="flex items-center justify-center py-6 text-white/60">
                        <p className="text-sm">Loading expenses...</p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="photos" className="mt-4">
                    <div className="text-center py-6 text-white/60">
                      <Camera className="h-10 w-10 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">Photo collection feature coming soon!</p>
                      <p className="text-xs">Share memories from your event</p>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
                {/* Sidebar */}
                {shouldShowGuestList && (
                  <div className="lg:col-span-1 space-y-4">
                    <div className="bg-white/10 backdrop-blur-md rounded-lg border border-white/20 p-4">
                      <GuestList 
                        eventId={event?.id || 0} 
                        rsvps={event.rsvps} 
                        rsvpCounts={rsvpCounts}
                        guestListVisibility={guestListVisibility}
                        isHost={isHost}
                        currentUserId={user?.id}
                        rsvpMode={event.rsvpMode || 'rsvp'}
                      />
                    </div>
                    
                    {/* Access Requests - Only visible to host */}
                    <AccessRequests
                      eventId={event?.id || 0}
                      accessRequests={event.rsvps?.filter((rsvp: any) => rsvp.status === 'pending_access') || []}
                      isHost={String(user?.id) === String(event.hostId)}
                    />
                  </div>
                )}
              </div>
            );
          })()}
        </main>
        <MobileNav />
        {/* Poster Customizer - Lazy loaded */}
        {isPosterCustomizerOpen && (
          <Suspense fallback={<MinimalSpinner />}>
            <PosterCustomizer 
              open={isPosterCustomizerOpen}
              onOpenChange={setIsPosterCustomizerOpen}
              eventData={event}
              onSave={handleSavePoster}
            />
          </Suspense>
        )}
        
        {/* Razorpay Payment Modal for Paid Events */}
        {event?.ticketPrice > 0 && (
          <PaymentModal
            isOpen={showPaymentModal}
            onClose={() => setShowPaymentModal(false)}
            eventId={event.id}
            eventTitle={event?.title || ''}
            amount={event?.ticketPrice || 0}
            onPaymentSuccess={() => {
              // Mark user as having paid and RSVP as going
              setHasPaid(true);
              setShowPaymentModal(false);
              rsvpMutation.mutate({ status: 'going' });
              toast({
                title: "Payment Successful!",
                description: "You're now registered for this event.",
              });
            }}
            onCapacityError={(message) => {
              // Show capacity dialog when payment order creation fails due to capacity
              setFullCapacityMessage(message);
              setShowFullCapacityDialog(true);
            }}
          />
        )}
        
        {/* Login Dialog for Non-Authenticated Users */}
        <LoginDialog 
          open={showLoginDialog}
          onOpenChange={setShowLoginDialog}
          redirectPath={window.location.pathname}
        />
        
        {/* Event Invite Dialog for Private Events */}
        {event && (
          <EventInviteDialog
            open={showInviteDialog}
            onOpenChange={setShowInviteDialog}
            eventId={event.id}
            eventSlug={event.slug}
            eventTitle={event.title}
          />
        )}
        
        {/* Cancel Registration Confirmation Dialog */}
        <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
          <AlertDialogContent className="bg-gray-900 border border-white/20 text-white">
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel Registration?</AlertDialogTitle>
              <AlertDialogDescription className="text-white/70">
                {hasPaid ? (
                  <>
                    You have already paid for this event. If you cancel now, you can re-register later without paying again.
                  </>
                ) : (
                  <>
                    Are you sure you want to cancel your registration for this event?
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                Keep Registration
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  rsvpMutation.mutate({ status: 'not_going' });
                  setShowCancelDialog(false);
                }}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Yes, Cancel Registration
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Full Capacity Dialog - Explicit Message */}
        <AlertDialog open={showFullCapacityDialog} onOpenChange={setShowFullCapacityDialog}>
          <AlertDialogContent className="bg-gradient-to-br from-slate-900/95 to-slate-800/95 text-white max-w-[90vw] sm:max-w-md mx-4 rounded-2xl border border-blue-500/30">
            <AlertDialogHeader className="space-y-3 sm:space-y-4">
              <AlertDialogTitle className="text-2xl sm:text-3xl font-bold text-center  leading-tight">
                Event Capacity Reached
              </AlertDialogTitle>
              <AlertDialogDescription className="text-white/90 text-center text-base sm:text-lg px-2 leading-relaxed">
                {fullCapacityMessage}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-6 sm:mt-8">
              <AlertDialogAction 
                onClick={() => setShowFullCapacityDialog(false)}
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold py-3 sm:py-4 text-base sm:text-lg rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Understood
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </BackgroundComponent>
  );
}
