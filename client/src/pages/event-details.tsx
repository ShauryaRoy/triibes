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
  Shield
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
import { MinimalSpinner } from "@/components/page-skeleton";
import type { Event } from "@shared/schema";
import { SEO } from "@/components/SEO";
import { PaymentModal } from "@/components/PaymentModal";

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
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [hasPaid, setHasPaid] = useState(false);

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
      return response.json();
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

  // Check if user has already RSVP'd as going (which means they paid for paid events)
  useEffect(() => {
    if (user && event?.rsvps) {
      const userRsvp = event.rsvps.find((rsvp: any) => String(rsvp.userId) === String(user.id));
      if (userRsvp?.status === 'going') {
        setHasPaid(true);
      }
    }
  }, [user, event?.rsvps]);

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

  // Add debugging
  console.log('Event Details Debug:', {
    id,
    event,
    isLoading,
    error: error?.message,
    queryKey: `/api/events/${id}`
  });

  const rsvpMutation = useMutation({
    mutationFn: async ({ status }: { status: string }) => {
      try {
        const response = await apiRequest("POST", `/api/events/${id}/rsvp`, { status });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to update RSVP");
        }
        return response.json();
      } catch (error) {
        console.error("RSVP error:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${id}`] });
      toast({
        title: "RSVP updated!",
        description: "Your response has been recorded.",
      });
    },
    onError: (error: any) => {
      console.error("RSVP mutation error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update RSVP. Please try again.",
        variant: "destructive",
      });
    },
  });

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

  const handleRsvp = (status: string) => {
    if (!user) {
      toast({
        title: "Please log in",
        description: "You need to be logged in to RSVP.",
        variant: "destructive",
      });
      return;
    }

    // For paid events, show Razorpay payment modal before allowing "going" RSVP
    if (status === "going" && event?.ticketPrice && event.ticketPrice > 0 && !hasPaid) {
      // Show Razorpay payment modal
      setShowPaymentModal(true);
      return;
    }

    // For "maybe" and "not_going", or free events, or already paid, proceed directly
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
    console.log("💾 handleSavePoster called with:", posterData);
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
      console.error("💥 Error saving poster:", error);
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

  // Private event access control - show limited view instead of redirecting
  if (event && !hasAccess) {
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
                    Only invited guests can view the full event details. You need to be invited by the host to access this event.
                  </p>
                  
                  {user ? (
                    <div className="space-y-3">
                      <p className="text-white/60 text-sm">You don't have access to this private event.</p>
                    </div>
                  ) : (
                    <p className="text-white/60 text-sm">Sign in to see if you have access to this event</p>
                  )}
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
  
  return (
    <SimpleBackground 
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
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20 md:pb-12 space-y-10">
          {/* Hero Section */}
          <div className="relative rounded-2xl overflow-hidden border border-white/15 bg-white/5 backdrop-blur-md p-6 md:p-10">
            <div className="flex flex-col gap-10">
              {/* Poster - Always show, centered at top */}
              <div className="w-full max-w-md mx-auto">
                <PosterGallery event={event} isPreview={true} onCustomize={() => setIsPosterCustomizerOpen(true)} />
              </div>
              {/* Title & Meta - Now below poster */}
              <div className="flex flex-col space-y-6">
                <div className="space-y-5">
                  {/* Top Row: Back + Badges */}
                  <div className="flex flex-wrap items-center gap-3 justify-between">
                    <Link href="/">
                      <Button variant="outline" className="text-white border-white/30 bg-white/10 hover:bg-white/20 h-9 px-3 backdrop-blur-sm">
                        <ArrowLeft className="h-4 w-4 mr-2" /> Back
                      </Button>
                    </Link>
                    <div className="flex flex-wrap gap-3 ml-auto">
                      <Badge className="bg-white/15 border-white/30 text-white backdrop-blur-sm">
                        {event.eventType === 'online' ? '🎮 Gaming Event' : '🎉 Party'}
                      </Badge>
                      <Badge variant="outline" className="bg-white/10 border-white/30 text-white backdrop-blur-sm">
                        {event.isPublic ? (<><Globe className="h-3 w-3 mr-1" />Public</>) : (<><Lock className="h-3 w-3 mr-1" />Private</>)}
                      </Badge>
                    </div>
                  </div>
                  <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-white drop-shadow">{event.title}</h1>
                  <p className="text-white/80 text-lg">
                    Hosted by {event.host ? `${event.host.firstName || ''} ${event.host.lastName || ''}`.trim() || event.host.email : 'Event Host'}
                  </p>
                  <div className="grid sm:grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2 text-white/80">
                      <Calendar className="h-4 w-4" /> {dateInfo.full}{dateInfo.time && <span className="ml-1">• {dateInfo.time}</span>}
                    </div>
                    {event.location && (
                      <div className="flex items-center gap-2 text-white/80">
                        <MapPin className="h-4 w-4" />
                        {(event.mapLink || event.map_link) ? (
                          <a href={event.mapLink || event.map_link} target="_blank" rel="noopener noreferrer" className="text-blue-300 hover:text-blue-200 underline decoration-dotted">
                            {event.location}
                          </a>
                        ) : (
                          <span>{event.location}</span>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-white/80">
                      <Users className="h-4 w-4" /> {rsvpCounts.going} going
                    </div>
                  </div>
                </div>
                {/* RSVP Actions */}
                {user && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium uppercase tracking-wide text-white/60">Your RSVP</h3>
                    {event.ticketPrice > 0 && !hasPaid && (
                      <div className="bg-amber-500/20 border border-amber-400/50 rounded-lg p-3 mb-3">
                        <p className="text-sm text-amber-100 flex items-center gap-2">
                          <span className="text-lg">🎫</span>
                          <span>
                            Cost: <strong className="text-amber-50">₹{event.ticketPrice}</strong> per person
                          </span>
                        </p>
                      </div>
                    )}
                    {event.ticketPrice > 0 && hasPaid && (
                      <div className="bg-green-500/20 border border-green-400/50 rounded-lg p-3 mb-3">
                        <p className="text-sm text-green-100 flex items-center gap-2">
                          <span className="text-lg">✅</span>
                          <span>Payment Confirmed</span>
                        </p>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-3">
                      <Button
                        onClick={() => handleRsvp("going")}
                        disabled={rsvpMutation.isPending}
                        className={`${userRsvpStatus === "going" ? "bg-green-600 hover:bg-green-700" : "bg-white/10 hover:bg-green-600/20 border border-white/20 hover:border-green-400"} text-white transition-all duration-200`}
                      >
                        <Check className="mr-2 h-4 w-4" /> 
                        {event.ticketPrice > 0 && !hasPaid ? `Pay ₹${event.ticketPrice}` : 'Going'}
                      </Button>
                      <Button
                        onClick={() => handleRsvp("maybe")}
                        disabled={rsvpMutation.isPending}
                        className={`${userRsvpStatus === "maybe" ? "bg-yellow-600 hover:bg-yellow-700" : "bg-white/10 hover:bg-yellow-600/20 border border-white/20 hover:border-yellow-400"} text-white transition-all duration-200`}
                      >
                        <HelpCircle className="mr-2 h-4 w-4" /> Maybe
                      </Button>
                      <Button
                        onClick={() => handleRsvp("not_going")}
                        disabled={rsvpMutation.isPending}
                        className={`${userRsvpStatus === "not_going" ? "bg-red-600 hover:bg-red-700" : "bg-white/10 hover:bg-red-600/20 border border-white/20 hover:border-red-400"} text-white transition-all duration-200`}
                      >
                        <X className="mr-2 h-4 w-4" /> Can't Go
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Map Link Section */}
          {event.location && (
            <div className="relative rounded-2xl overflow-hidden border border-white/15 bg-white/5 backdrop-blur-md p-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Location & Navigation
                </h3>
                <div className="space-y-3">
                  <p className="text-white/80">
                    <span className="font-medium">{event.location}</span>
                  </p>
                  {(event.mapLink || event.map_link) ? (
                    <div className="flex items-center gap-3 p-3 bg-white/10 rounded-lg border border-white/20">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white/60 mb-1">Navigation Link</p>
                        <p className="text-sm text-white font-mono truncate">{event.mapLink || event.map_link}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={copyMapLink}
                          variant="outline"
                          size="sm"
                          className="border-white/30 text-white bg-white/10 hover:bg-white/20 backdrop-blur-sm"
                        >
                          {mapLinkCopied ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
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
                            className="border-blue-400/50 text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 backdrop-blur-sm"
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            Open
                          </Button>
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-white/5 rounded-lg border border-white/10 text-center">
                      <p className="text-white/60 text-sm">No navigation link available for this location</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Custom Fields Section */}
          {event.settings?.customFields && Object.keys(event.settings.customFields).length > 0 && (
            <div className="relative rounded-2xl overflow-hidden border border-white/15 bg-white/5 backdrop-blur-md p-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Extra Details</h3>
                <div className="grid gap-3">
                  {Object.entries(event.settings.customFields).map(([key, value]) => 
                    value ? (
                      <div key={key} className="flex items-start gap-3 p-3 bg-white/10 rounded-lg border border-white/20">
                        <span className="text-lg">
                          {key === 'cost' ? '💰' : 
                           key === 'link' ? '🔗' : 
                           key === 'playlist' ? '🎵' : 
                           key === 'dress-code' ? '👕' : 
                           key === 'parking' ? '🚗' : 
                           key === 'food' ? '🍕' : 
                           key === 'gifts' ? '🎁' : '📋'}
                        </span>
                        <div className="flex-1">
                          <p className="text-xs text-white/60 mb-1 capitalize">{key.replace('-', ' ')}</p>
                          <p className="text-sm text-white">{value as string}</p>
                        </div>
                      </div>
                    ) : null
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Event Tabs - Improved Styling */}
              <div className="bg-white/10 backdrop-blur-md rounded-lg border border-white/20 p-6">
                <Tabs value={activeTab} onValueChange={handleTabChange}>
                  <TabsList className="grid w-full grid-cols-3 bg-white/10 border border-white/20">
                    <TabsTrigger value="polls" className="text-white data-[state=active]:bg-white/20 data-[state=active]:text-white">Polls</TabsTrigger>
                    <TabsTrigger value="expenses" className="text-white data-[state=active]:bg-white/20 data-[state=active]:text-white">Expenses</TabsTrigger>
                    <TabsTrigger value="photos" className="text-white data-[state=active]:bg-white/20 data-[state=active]:text-white">Photos</TabsTrigger>
                  </TabsList>

                  <TabsContent value="polls" className="mt-6">
                    {event?.id ? (
                      <Polls eventId={event.id} />
                    ) : (
                      <div className="flex items-center justify-center py-8 text-white/60">
                        <p>Loading polls...</p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="expenses" className="mt-6">
                    {event?.id ? (
                      <Suspense fallback={<MinimalSpinner />}>
                        <ExpenseTracker eventId={event.id} />
                      </Suspense>
                    ) : (
                      <div className="flex items-center justify-center py-8 text-white/60">
                        <p>Loading expenses...</p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="photos" className="mt-6">
                    <div className="text-center py-8 text-white/60">
                      <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Photo collection feature coming soon!</p>
                      <p className="text-sm">Share memories from your event</p>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white/10 backdrop-blur-md rounded-lg border border-white/20 p-6">
                <GuestList 
                  eventId={event?.id || 0} 
                  rsvps={event.rsvps} 
                  rsvpCounts={rsvpCounts} 
                />
              </div>
              
              {/* Access Requests - Only visible to host */}
              <AccessRequests
                eventId={event?.id || 0}
                accessRequests={event.rsvps?.filter((rsvp: any) => rsvp.status === 'pending_access') || []}
                isHost={String(user?.id) === String(event.hostId)}
              />
            </div>
          </div>
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
          />
        )}
      </div>
    </SimpleBackground>
  );
}
