import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, MapPin, Clock, Settings, Plus, Rss, User, Users, ChevronLeft, ChevronRight, Shield, UserCog, Crown, Megaphone, Send, UserPlus, LayoutDashboard, Instagram, Youtube, Linkedin, Globe, ExternalLink, Twitter } from "lucide-react";
import { Link } from "wouter";
import Header from "@/components/layout/header";
import MobileNav from "@/components/layout/mobile-nav";
import { SimpleBackground } from "@/components/simple-background";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import LazyImage from "@/components/ui/lazy-image";
import { GroupInviteDialog } from "@/components/group-invite-dialog";
import { LoginDialog } from "@/components/LoginDialog";

export default function CommunityDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // UI state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    content: '',
    type: 'general' as 'general' | 'important' | 'event'
  });
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  
  const { data: community, isLoading, error } = useQuery({
    queryKey: [`/api/groups/${id}`],
    queryFn: async () => {
      const response = await fetch(`/api/groups/${id}`, { credentials: "include" });
      if (!response.ok) {
        if (response.status === 404) {
          return null; // Return null for 404 instead of throwing
        }
        throw new Error("Failed to fetch group");
      }
      return response.json();
    },
    enabled: !!id,
    retry: false, // Don't retry on 404
  });

  const { data: events } = useQuery({
    queryKey: [`/api/groups/${id}/events`],
    queryFn: async () => {
      const response = await fetch(`/api/groups/${id}/events`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch events");
      return response.json();
    },
    enabled: !!id,
  });

  const { data: members } = useQuery({
    queryKey: [`/api/groups/${id}/members`],
    queryFn: async () => {
      const response = await fetch(`/api/groups/${id}/members`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch members");
      const raw = await response.json();
      // Normalize member user fields so UI always has a name/picture to show
      return (raw || []).map((m: any) => {
        const u = m?.user || null;
        const displayName = u?.displayName
          || (u?.firstName && u?.lastName ? `${u.firstName} ${u.lastName}` : (u?.firstName || u?.lastName))
          || u?.email
          || 'Unknown User';
        const profilePicture = u?.profilePicture || u?.profileImageUrl || undefined;
        return {
          ...m,
          user: u ? { ...u, displayName, profilePicture } : null,
        };
      });
    },
    enabled: !!id,
  });

  const { data: announcements } = useQuery({
    queryKey: [`/api/groups/${id}/announcements`],
    queryFn: async () => {
      const response = await fetch(`/api/groups/${id}/announcements`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch announcements");
      return response.json();
    },
    enabled: !!id,
  });

  const { data: joinRequests } = useQuery({
    queryKey: [`/api/groups/${id}/join-requests`],
    queryFn: async () => {
      const response = await fetch(`/api/groups/${id}/join-requests`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch join requests");
      return response.json();
    },
    enabled: !!id && !!user, // Only fetch if user is logged in
  });

  // All mutations must be defined before any conditional returns
  const joinMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/groups/${id}/join`, { method: 'POST', credentials: 'include' });
      if (!res.ok) throw new Error('Failed to subscribe');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Subscribed', description: 'You will now receive updates.' });
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${id}/members`] });
      queryClient.invalidateQueries({ queryKey: ["/api/profile/groups"] });
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${id}`] });
    },
    onError: () => {
      toast({ title: 'Subscription failed', description: 'Please try again.', variant: 'destructive' });
    },
  });

  const leaveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/groups/${id}/leave`, { method: 'POST', credentials: 'include' });
      if (!res.ok) throw new Error('Failed to unsubscribe');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Unsubscribed', description: 'You will stop receiving updates.' });
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${id}/members`] });
      queryClient.invalidateQueries({ queryKey: ["/api/profile/groups"] });
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${id}`] });
    },
    onError: () => {
      toast({ title: 'Unsubscribe failed', description: 'Please try again.', variant: 'destructive' });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: number; role: string }) => {
      const res = await fetch(`/api/groups/${id}/members/${userId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ role }),
      });
      if (!res.ok) throw new Error('Failed to update role');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Role updated', description: 'Member role has been updated successfully.' });
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${id}/members`] });
    },
    onError: () => {
      toast({ title: 'Role update failed', description: 'Please try again.', variant: 'destructive' });
    },
  });

  const createAnnouncementMutation = useMutation({
    mutationFn: async (announcement: { title: string; content: string; type: string }) => {
      const res = await fetch(`/api/groups/${id}/announcements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(announcement),
      });
      if (!res.ok) throw new Error('Failed to create announcement');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Announcement created', description: 'Your announcement has been posted successfully.' });
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${id}/announcements`] });
      setAnnouncementForm({ title: '', content: '', type: 'general' });
      setShowAnnouncementForm(false);
    },
    onError: () => {
      toast({ title: 'Failed to create announcement', description: 'Please try again.', variant: 'destructive' });
    },
  });

  const approveJoinRequestMutation = useMutation({
    mutationFn: async (requestId: number) => {
      const res = await fetch(`/api/groups/${id}/join-requests/${requestId}/approve`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to approve join request');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Join request approved', description: 'User has been added to the group.' });
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${id}/join-requests`] });
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${id}/members`] });
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${id}`] });
    },
    onError: () => {
      toast({ title: 'Failed to approve request', description: 'Please try again.', variant: 'destructive' });
    },
  });

  const rejectJoinRequestMutation = useMutation({
    mutationFn: async (requestId: number) => {
      const res = await fetch(`/api/groups/${id}/join-requests/${requestId}/reject`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to reject join request');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Join request rejected', description: 'The join request has been declined.' });
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${id}/join-requests`] });
    },
    onError: () => {
      toast({ title: 'Failed to reject request', description: 'Please try again.', variant: 'destructive' });
    },
  });

  // Dynamic theme based on community settings
  const getTheme = () => {
    if (community?.settings?.color) {
      return {
        id: 'community-custom',
        name: 'Group Theme',
        category: 'minimal' as const,
        preview: 'Custom group theme',
        solidColor: community.settings.color,
        textColor: '#ffffff',
        darkMode: true,
      };
    }
    return null;
  };

  if (isLoading) {
    return (
      <SimpleBackground className="min-h-screen">
        <div className="absolute inset-0 bg-black/25" />
        <div className="relative z-10">
          <Header />
          <main className="flex-1 px-4 sm:px-6 lg:px-8 pt-28 pb-16">
            <div className="max-w-5xl mx-auto">
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent mx-auto"></div>
                <p className="text-white/60 text-sm mt-4">Loading group...</p>
              </div>
            </div>
          </main>
        </div>
      </SimpleBackground>
    );
  }

  if (!community) {
    return (
      <SimpleBackground className="min-h-screen">
        <div className="absolute inset-0 bg-black/25" />
        <div className="relative z-10">
          <Header />
          <main className="flex-1 px-4 sm:px-6 lg:px-8 pt-28 pb-16">
            <div className="max-w-5xl mx-auto text-center py-16">
              <h1 className="text-2xl font-bold text-white mb-4">Group not found</h1>
              <Button asChild variant="outline" className="border-white/30 text-white hover:bg-white/20">
                <Link href="/groups">Back to Communities</Link>
              </Button>
            </div>
          </main>
        </div>
      </SimpleBackground>
    );
  }

  // Check membership and role (computed after mutations to satisfy hooks rule)
  const userMembership = members?.find((m: any) => m.userId === user?.id);
  const isOwner = userMembership?.role === 'owner';
  const isHost = userMembership?.role === 'host';
  const hasEventAccess = isOwner || isHost; // Can create events and access dashboard
  const isMember = !!userMembership;

  // Role helpers
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return <Crown className="h-4 w-4 text-yellow-500" />;
      case 'host': return <Shield className="h-4 w-4 text-blue-500" />;
      default: return <User className="h-4 w-4 text-slate-400" />;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-yellow-600 text-yellow-100';
      case 'host': return 'bg-blue-600 text-blue-100';
      default: return 'bg-slate-600 text-slate-200';
    }
  };

  const canManageRole = (targetRole: string, currentUserRole: string) => {
    if (currentUserRole !== 'owner') return false;
    if (targetRole === 'owner') return false; // Can't change owner roles
    return true;
  };

  // Announcement helpers
  const getAnnouncementTypeColor = (type: string) => {
    switch (type) {
      case 'important': return 'bg-red-600 text-red-100';
      case 'event': return 'bg-blue-600 text-blue-100';
      default: return 'bg-slate-600 text-slate-200';
    }
  };

  const formatAnnouncementDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else if (diffInHours < 168) { // 7 days
      const days = Math.floor(diffInHours / 24);
      return `${days}d ago`;
    } else {
      return date.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Kolkata' });
    }
  };

  // Helper functions for date/time formatting
  const formatEventDate = (datetime: string) => {
    return new Date(datetime).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Kolkata' });
  };

  const formatEventTime = (datetime: string) => {
    return new Date(datetime).toLocaleTimeString('en-IN', { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true,
      timeZone: 'Asia/Kolkata'
    });
  };

  // Separate events into upcoming and past
  const now = new Date();
  const upcomingEvents = events?.filter((event: any) => new Date(event.datetime) >= now) || [];
  const pastEvents = events?.filter((event: any) => new Date(event.datetime) < now)
    .sort((a: any, b: any) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime()) || [];

  // Calendar helpers
  const getCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const formatRelativeDate = (datetime: string) => {
    const date = new Date(datetime);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <SimpleBackground className="min-h-screen bg-slate-900">
      <div className="absolute inset-0 bg-black/10" />
      <div className="relative z-10">
        <Header />
        <main className="flex-1 px-3 sm:px-4 lg:px-8 pt-20 pb-24 md:pb-16">
          <div className="max-w-5xl mx-auto space-y-3">
            {/* Group Header */}
            <Card className="bg-slate-800/50 border-slate-700/50 overflow-hidden">
              {community.coverImageUrl && (
                <div 
                  className="h-24 sm:h-36 bg-cover bg-center bg-slate-700"
                  style={{ backgroundImage: `url(${community.coverImageUrl})` }}
                />
              )}
              <CardContent className="p-3 sm:p-5">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-11 h-11 sm:w-14 sm:h-14 border-2 border-slate-700 shrink-0">
                      <AvatarImage src={community.imageUrl || "/static/frog butcher.png"} />
                      <AvatarFallback className="bg-gradient-to-r from-primary to-cyan-400 text-white font-semibold">
                        {community.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <h1 className="text-base sm:text-xl font-bold text-white truncate">{community.name}</h1>
                      <p className="text-slate-500 text-xs mt-0.5">
                        {community.isPublic ? 'Public group' : 'Private group'} · {community.memberCount} members
                      </p>
                    </div>
                  </div>
                  {community.description && (
                    <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">{community.description}</p>
                  )}
                  {/* Action buttons */}
                  {hasEventAccess ? (
                    <div className="flex flex-wrap gap-2">
                      <Button asChild className="bg-primary/90 hover:bg-primary text-white rounded-lg text-xs h-8 px-3" size="sm">
                        <Link href={`/groups/${id}/dashboard`}>
                          <LayoutDashboard className="h-3.5 w-3.5 sm:mr-1.5" />
                          <span className="hidden sm:inline">Dashboard</span>
                        </Link>
                      </Button>
                      {isOwner && (
                        <>
                          <Button 
                            onClick={() => setShowInviteDialog(true)}
                            className="bg-primary/90 hover:bg-primary text-white rounded-lg text-xs h-8 px-3"
                            size="sm"
                          >
                            <UserPlus className="h-3.5 w-3.5 sm:mr-1.5" />
                            <span className="hidden sm:inline">Invite</span>
                          </Button>
                          <Button asChild className="bg-primary/90 hover:bg-primary text-white rounded-lg text-xs h-8 px-3">
                            <Link href={`/groups/${id}/manage`}>
                              <Settings className="h-3.5 w-3.5 sm:mr-1.5" />
                              <span className="hidden sm:inline">Manage</span>
                            </Link>
                          </Button>
                        </>
                      )}
                    </div>
                  ) : (
                    user ? (
                      isMember ? (
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            className="border-slate-700 text-slate-300 hover:bg-slate-700 rounded-lg text-xs h-8 px-4"
                            size="sm"
                            disabled={leaveMutation.isPending}
                            onClick={() => leaveMutation.mutate()}
                          >
                            {leaveMutation.isPending ? 'Unsubscribing...' : 'Unsubscribe'}
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Button 
                            className="bg-primary hover:brightness-110 text-white rounded-lg text-xs h-8 px-4"
                            size="sm"
                            disabled={joinMutation.isPending}
                            onClick={() => joinMutation.mutate()}
                          >
                            {joinMutation.isPending ? 'Subscribing...' : 'Subscribe'}
                          </Button>
                        </div>
                      )
                    ) : (
                      <div className="flex gap-2">
                        <Button 
                          className="bg-primary hover:brightness-110 text-white rounded-lg text-xs h-8 px-4"
                          size="sm"
                          onClick={() => setShowLoginDialog(true)}
                        >
                          Subscribe
                        </Button>
                      </div>
                    )
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              {/* Left Column */}
              <div className="lg:col-span-2 space-y-3">
                <Tabs defaultValue="events" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 bg-slate-800/50 border border-slate-700/50 p-1 h-9">
                    <TabsTrigger 
                      value="events" 
                      className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-400 text-xs"
                    >
                      <Calendar className="h-3.5 w-3.5 mr-1.5" />
                      Events
                    </TabsTrigger>
                    <TabsTrigger 
                      value="announcements" 
                      className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-400 text-xs"
                    >
                      <Megaphone className="h-4 w-4 mr-2" />
                      Announcements
                    </TabsTrigger>
                  </TabsList>

                  {/* Events Tab */}
                  <TabsContent value="events" className="space-y-3 mt-3">
                {/* Upcoming Events */}
                <Card className="bg-slate-800/50 border-slate-700/50">
                  <CardHeader className="p-3 sm:p-5 pb-2">
                    <CardTitle className="text-white flex items-center gap-2 text-sm">
                      <Calendar className="h-3.5 w-3.5" />
                      Upcoming Events
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-5 pt-0">
                    {upcomingEvents.length > 0 ? (
                      <div className="relative">
                        {/* Vertical timeline line */}
                        <div className="absolute left-[10px] top-3 bottom-3 w-0.5 bg-gradient-to-b from-blue-500/60 via-blue-500/30 to-transparent" />
                        <div className="space-y-3">
                          {upcomingEvents.map((event: any, index: number) => (
                            <Link key={event.id} href={`/events/${event.slug || event.id}`}>
                              <div className="flex items-start gap-3">
                                {/* Timeline dot */}
                                <div className="relative z-10 flex-shrink-0 mt-2.5">
                                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${index === 0 ? 'bg-blue-500/30 border-blue-400' : 'bg-slate-700 border-slate-500'}`}>
                                    <div className={`w-1.5 h-1.5 rounded-full ${index === 0 ? 'bg-blue-400' : 'bg-slate-400'}`} />
                                  </div>
                                </div>
                                {/* Event card */}
                                <div className="flex-1 flex items-start gap-3 p-3 rounded-xl bg-slate-700/30 hover:bg-slate-700/50 transition-colors cursor-pointer border border-slate-700/30">
                                  <div className="flex-1 min-w-0">
                                    <h4 className="text-white font-medium text-sm truncate">{event.title}</h4>
                                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-slate-400 text-xs mt-1.5">
                                      <span className="flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />{formatEventDate(event.datetime)}
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />{formatEventTime(event.datetime)}
                                      </span>
                                      {event.location && (
                                        <span className="flex items-center gap-1 max-w-[140px]">
                                          <MapPin className="h-3 w-3 shrink-0" />
                                          <span className="truncate">{event.location}</span>
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  {(hasEventAccess || user?.id === event.hostId) && (
                                    <Button asChild size="sm" variant="outline" className="border-slate-700 text-slate-400 hover:bg-slate-600 text-xs h-7 px-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                                      <Link href={`/edit-event/${event.slug || event.id}`}>Edit</Link>
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Calendar className="h-10 w-10 text-slate-600 mx-auto mb-3" />
                        <p className="text-slate-400 text-sm">No upcoming events</p>
                        {hasEventAccess && (
                          <Button asChild className="bg-slate-700 hover:bg-slate-600 text-white text-xs h-8 px-4 mt-3" size="sm">
                            <Link href={`/create-event?groupId=${community?.id}`}>Create Event</Link>
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Past Events */}
                <Card className="bg-slate-800/50 border-slate-700/50">
                  <CardHeader className="p-3 sm:p-5 pb-2">
                    <CardTitle className="text-white text-sm">Past Events</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-5 pt-0">
                    {pastEvents.length > 0 ? (
                      <div className="space-y-2">
                        {pastEvents.map((event: any, index: number) => (
                          <Link key={event.id} href={`/events/${event.slug || event.id}`}>
                            <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-700/20 hover:bg-slate-700/40 transition-colors cursor-pointer border border-slate-700/20">
                              {event.thumbnail && (
                                <div className="hidden sm:block w-12 h-12 bg-slate-700 rounded-lg overflow-hidden shrink-0">
                                  <LazyImage src={event.thumbnail} alt={event.title} className="w-full h-full object-cover" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 text-slate-500 text-xs mb-0.5">
                                  <span>{formatRelativeDate(event.datetime)}</span>
                                  <span>·</span>
                                  <span>{formatEventTime(event.datetime)}</span>
                                </div>
                                <h4 className="text-slate-200 font-medium text-sm truncate">{event.title}</h4>
                                {event.location && (
                                  <div className="flex items-center gap-1 text-slate-500 text-xs mt-0.5">
                                    <MapPin className="h-3 w-3 shrink-0" />
                                    <span className="truncate">{event.location}</span>
                                  </div>
                                )}
                              </div>
                              {(hasEventAccess || user?.id === event.hostId) && (
                                <Button asChild size="sm" variant="outline" className="border-slate-700 text-slate-500 hover:bg-slate-700 text-xs h-7 px-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                                  <Link href={`/edit-event/${event.slug || event.id}`}>Manage</Link>
                                </Button>
                              )}
                            </div>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <p className="text-slate-500 text-sm">No past events</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
                  </TabsContent>

                  {/* Announcements Tab */}
                  <TabsContent value="announcements" className="space-y-3 mt-3">
                    <Card className="bg-slate-800/50 border-slate-700/50">
                      <CardHeader className="p-3 sm:p-5 pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-white text-sm flex items-center gap-2">
                            <Megaphone className="h-3.5 w-3.5" />
                            Announcements
                          </CardTitle>
                          {(isOwner || isHost) && (
                            <Button
                              size="sm"
                              onClick={() => setShowAnnouncementForm(!showAnnouncementForm)}
                              className="bg-primary/90 hover:bg-primary text-white h-7 text-xs px-2.5"
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              New
                            </Button>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="p-3 sm:p-5 pt-2 space-y-3">
                        {/* Create Announcement Form */}
                        {(isOwner || isHost) && showAnnouncementForm && (
                          <div className="p-3 rounded-xl bg-slate-700/40 border border-slate-700/40 space-y-2">
                            <Input
                              placeholder="Title..."
                              value={announcementForm.title}
                              onChange={(e) => setAnnouncementForm(prev => ({ ...prev, title: e.target.value }))}
                              className="bg-slate-700/70 border-slate-600/50 text-white placeholder:text-slate-500 h-8 text-xs"
                            />
                            <Textarea
                              placeholder="Write your announcement..."
                              value={announcementForm.content}
                              onChange={(e) => setAnnouncementForm(prev => ({ ...prev, content: e.target.value }))}
                              className="bg-slate-700/70 border-slate-600/50 text-white placeholder:text-slate-500 min-h-[70px] text-xs resize-none"
                            />
                            <div className="flex items-center gap-2">
                              <Select
                                value={announcementForm.type}
                                onValueChange={(value) => setAnnouncementForm(prev => ({ ...prev, type: value as any }))}
                              >
                                <SelectTrigger className="w-28 bg-slate-700/70 border-slate-600/50 text-white text-xs h-7">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="general">General</SelectItem>
                                  <SelectItem value="important">Important</SelectItem>
                                  <SelectItem value="event">Event</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button
                                size="sm"
                                onClick={() => {
                                  if (announcementForm.title.trim() && announcementForm.content.trim()) {
                                    createAnnouncementMutation.mutate(announcementForm);
                                  }
                                }}
                                disabled={!announcementForm.title.trim() || !announcementForm.content.trim() || createAnnouncementMutation.isPending}
                                className="bg-cyan-600 hover:bg-cyan-700 text-white text-xs h-7 px-3 ml-auto"
                              >
                                <Send className="h-3 w-3 mr-1" />
                                {createAnnouncementMutation.isPending ? 'Posting...' : 'Post'}
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Announcements List */}
                        <div className="space-y-2">
                          {announcements && announcements.length > 0 ? (
                            announcements.map((announcement: any) => (
                              <div key={announcement.id} className="p-3 rounded-xl bg-slate-700/25 border border-slate-700/30">
                                <div className="flex items-start justify-between gap-2 mb-1">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <h4 className="text-white font-medium text-sm">{announcement.title}</h4>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${getAnnouncementTypeColor(announcement.type)}`}>
                                      {announcement.type}
                                    </span>
                                  </div>
                                  <span className="text-slate-500 text-xs shrink-0">{formatAnnouncementDate(announcement.createdAt)}</span>
                                </div>
                                <p className="text-slate-400 text-xs leading-relaxed break-words">{announcement.content}</p>
                                <p className="text-slate-600 text-[10px] mt-1.5">— {announcement.author?.displayName || announcement.author?.firstName || 'Admin'}</p>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-10">
                              <Megaphone className="h-10 w-10 text-slate-600 mx-auto mb-3" />
                              <p className="text-slate-400 text-sm">No announcements yet</p>
                              <p className="text-slate-600 text-xs mt-1">
                                {(isOwner || isHost) ? 'Post updates for your members.' : 'Check back for updates.'}
                              </p>
                              {(isOwner || isHost) && !showAnnouncementForm && (
                                <Button
                                  size="sm"
                                  onClick={() => setShowAnnouncementForm(true)}
                                  className="bg-primary/90 hover:bg-primary text-white text-xs h-8 px-3 mt-3"
                                >
                                  <Plus className="h-3 w-3 mr-1.5" />
                                  Post first announcement
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>

              {/* Right Column */}
              <div className="space-y-3">
                {/* Add Event button for hosts */}
                {hasEventAccess && (
                  <Card className="bg-slate-800/50 border-slate-700/50">
                    <CardContent className="p-3">
                      <Button asChild className="bg-slate-700/80 hover:bg-slate-700 text-white text-xs h-8 px-3 w-full" size="sm">
                        <Link href={`/create-event?groupId=${community?.id}`}>
                          <Plus className="h-3.5 w-3.5 mr-1.5" />
                          Add Event
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* Mini Calendar */}
                <Card className="bg-slate-800/50 border-slate-700/50">
                  <CardHeader className="p-3 pb-1">
                    <div className="flex items-center justify-between">
                      <p className="text-white text-xs font-medium">
                        {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </p>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-slate-300 hover:text-white hover:bg-slate-700 p-1"
                          onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
                        >
                          <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-slate-300 hover:text-white hover:bg-slate-700 p-1"
                          onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
                        >
                          <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-2 pt-0">
                    <div className="grid grid-cols-7 gap-0.5 text-center text-[9px] mb-1">
                      {['S','M','T','W','T','F','S'].map((day, i) => (
                        <div key={i} className="text-slate-500 font-medium py-1">{day}</div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-0.5">
                      {getCalendarDays().map((date, index) => {
                        const isCurrentMonth = date.getMonth() === currentDate.getMonth();
                        const isToday = date.toDateString() === new Date().toDateString();
                        const hasEvent = events?.some((event: any) => 
                          new Date(event.datetime).toDateString() === date.toDateString()
                        );
                        return (
                          <div
                            key={index}
                            className={`
                              p-1 text-center text-[10px] rounded cursor-pointer transition-colors
                              ${isCurrentMonth ? 'text-slate-300' : 'text-slate-700'}
                              ${isToday ? 'bg-slate-700 text-white font-semibold' : 'hover:bg-slate-700/40'}
                              ${hasEvent ? 'ring-1 ring-cyan-500/50 bg-slate-700/40 text-cyan-400' : ''}
                            `}
                          >
                            {date.getDate()}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Stats */}
                <Card className="bg-slate-800/50 border-slate-700/50">
                  <CardContent className="p-3 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 text-xs">Members</span>
                      <span className="text-white text-xs font-medium">{community.memberCount}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 text-xs">Total Events</span>
                      <span className="text-white text-xs font-medium">{events?.length || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 text-xs">Upcoming</span>
                      <span className="text-white text-xs font-medium">{upcomingEvents.length}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Social Links */}
                {community.settings?.socialLinks && Object.values(community.settings.socialLinks).some(Boolean) && (
                  <Card className="bg-slate-800/50 border-slate-700/50">
                    <CardContent className="p-3 space-y-1.5">
                      <p className="text-slate-500 text-[10px] uppercase tracking-wide mb-2">Links</p>
                      {community.settings.socialLinks.instagram && (
                        <a href={community.settings.socialLinks.instagram} target="_blank" rel="noopener noreferrer"
                           className="flex items-center gap-2 text-slate-400 hover:text-white text-xs transition-colors py-0.5">
                          <Instagram className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">Instagram</span>
                          <ExternalLink className="h-3 w-3 ml-auto shrink-0 opacity-40" />
                        </a>
                      )}
                      {community.settings.socialLinks.youtube && (
                        <a href={community.settings.socialLinks.youtube} target="_blank" rel="noopener noreferrer"
                           className="flex items-center gap-2 text-slate-400 hover:text-white text-xs transition-colors py-0.5">
                          <Youtube className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">YouTube</span>
                          <ExternalLink className="h-3 w-3 ml-auto shrink-0 opacity-40" />
                        </a>
                      )}
                      {community.settings.socialLinks.linkedin && (
                        <a href={community.settings.socialLinks.linkedin} target="_blank" rel="noopener noreferrer"
                           className="flex items-center gap-2 text-slate-400 hover:text-white text-xs transition-colors py-0.5">
                          <Linkedin className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">LinkedIn</span>
                          <ExternalLink className="h-3 w-3 ml-auto shrink-0 opacity-40" />
                        </a>
                      )}
                      {community.settings.socialLinks.twitter && (
                        <a href={community.settings.socialLinks.twitter} target="_blank" rel="noopener noreferrer"
                           className="flex items-center gap-2 text-slate-400 hover:text-white text-xs transition-colors py-0.5">
                          <Twitter className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">Twitter / X</span>
                          <ExternalLink className="h-3 w-3 ml-auto shrink-0 opacity-40" />
                        </a>
                      )}
                      {community.settings.socialLinks.website && (
                        <a href={community.settings.socialLinks.website} target="_blank" rel="noopener noreferrer"
                           className="flex items-center gap-2 text-slate-400 hover:text-white text-xs transition-colors py-0.5">
                          <Globe className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">Website</span>
                          <ExternalLink className="h-3 w-3 ml-auto shrink-0 opacity-40" />
                        </a>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Member Management - Admin Only */}
                {/* {isOwner && members && (
                  <Card className="bg-slate-800/50 border-slate-700/50 shadow-sm">
                    <CardHeader className="p-4 sm:p-6">
                      <CardTitle className="text-white text-base sm:text-lg flex items-center gap-2">
                        <UserCog className="h-4 w-4 sm:h-5 sm:w-5" />
                        <span className="text-sm sm:text-lg">Member Management</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6 pt-0">
                      {members.map((member: any) => (
                        <div key={member.userId} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-slate-700/30 rounded-lg">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <Avatar className="h-9 w-9 sm:h-8 sm:w-8 shrink-0">
                              <AvatarImage src={member.user?.profilePicture} />
                              <AvatarFallback className="bg-slate-600 text-white text-xs sm:text-sm">
                                {member.user?.displayName?.slice(0, 2).toUpperCase() || 'UN'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-white text-sm font-medium truncate">
                                  {member.user?.displayName || 'Unknown User'}
                                </span>
                                {getRoleIcon(member.role)}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge 
                                  variant="secondary" 
                                  className={`text-xs ${getRoleBadgeVariant(member.role)}`}
                                >
                                  {member.role}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          
                          {canManageRole(member.role, userMembership?.role) && member.userId !== user?.id && (
                            <Select
                              value={member.role}
                              onValueChange={(newRole) => {
                                updateRoleMutation.mutate({ userId: member.userId, role: newRole });
                              }}
                            >
                              <SelectTrigger className="w-full sm:w-32 bg-slate-600 border-slate-500 text-white text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="member">Member</SelectItem>
                                <SelectItem value="moderator">Moderator</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      ))}
                      
                      {members.length === 0 && (
                        <div className="text-center py-4">
                          <Users className="h-8 w-8 text-slate-500 mx-auto mb-2" />
                          <p className="text-slate-400 text-sm">No members found</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )} */}

                {/* Join Requests - Admin Only & Private */}
                {isOwner && !community.isPublic && (
                  <Card className="bg-slate-800/50 border-slate-700/50">
                    <CardHeader className="p-3 pb-2">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-white text-sm">Join Requests</CardTitle>
                        {joinRequests && joinRequests.filter((req: any) => req.status === 'pending').length > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-600/30 text-orange-300">
                            {joinRequests.filter((req: any) => req.status === 'pending').length}
                          </span>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 space-y-2">
                      {joinRequests && joinRequests.length > 0 ? (
                        <div className="space-y-2">
                          {joinRequests.filter((request: any) => request.status === 'pending').map((request: any) => (
                            <div key={request.id} className="p-2.5 rounded-xl bg-slate-700/30 border border-slate-700/30 space-y-2">
                              <div className="flex items-start gap-2">
                                <Avatar className="h-8 w-8 shrink-0">
                                  <AvatarImage src={request.user?.profileImageUrl} />
                                  <AvatarFallback className="bg-slate-700 text-white text-xs">
                                    {`${request.user?.firstName?.[0] || ''}${request.user?.lastName?.[0] || ''}`.toUpperCase() || 'UN'}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <p className="text-white text-xs font-medium truncate">
                                    {`${request.user?.firstName || ''} ${request.user?.lastName || ''}`.trim() || 'Unknown'}
                                  </p>
                                  <p className="text-slate-500 text-[10px]">{formatAnnouncementDate(request.createdAt)}</p>
                                  {request.message && (
                                    <p className="text-slate-400 text-xs italic mt-1 line-clamp-2">"{request.message}"</p>
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-1.5">
                                <Button
                                  size="sm"
                                  onClick={() => rejectJoinRequestMutation.mutate(request.id)}
                                  disabled={rejectJoinRequestMutation.isPending || approveJoinRequestMutation.isPending}
                                  variant="outline"
                                  className="border-red-700/40 text-red-400 hover:bg-red-700/20 flex-1 text-xs h-7"
                                >
                                  Reject
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => approveJoinRequestMutation.mutate(request.id)}
                                  disabled={approveJoinRequestMutation.isPending || rejectJoinRequestMutation.isPending}
                                  className="bg-green-700/20 hover:bg-green-700/30 border border-green-700/30 text-green-300 flex-1 text-xs h-7"
                                >
                                  Approve
                                </Button>
                              </div>
                            </div>
                          ))}
                          
                          {joinRequests.filter((req: any) => req.status !== 'pending').length > 0 && (
                            <details className="mt-2">
                              <summary className="text-slate-500 text-xs cursor-pointer hover:text-slate-300">
                                {joinRequests.filter((req: any) => req.status !== 'pending').length} processed
                              </summary>
                              <div className="mt-2 space-y-1.5">
                                {joinRequests.filter((request: any) => request.status !== 'pending').map((request: any) => (
                                  <div key={request.id} className="flex items-center justify-between p-2 bg-slate-700/20 rounded-lg">
                                    <span className="text-slate-400 text-xs truncate">
                                      {`${request.user?.firstName || ''} ${request.user?.lastName || ''}`.trim() || 'Unknown'}
                                    </span>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                                      request.status === 'approved' ? 'bg-green-700/30 text-green-400' : 'bg-red-700/30 text-red-400'
                                    }`}>{request.status}</span>
                                  </div>
                                ))}
                              </div>
                            </details>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <p className="text-slate-500 text-xs">No pending requests</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </main>
        <MobileNav />
      </div>
      
      {/* Invite Dialog */}
      {community && (
        <GroupInviteDialog
          open={showInviteDialog}
          onOpenChange={setShowInviteDialog}
          groupId={community.id}
          groupName={community.name}
        />
      )}
      <LoginDialog
        open={showLoginDialog}
        onOpenChange={setShowLoginDialog}
        redirectPath={typeof window !== 'undefined' ? window.location.pathname : undefined}
      />
    </SimpleBackground>
  );
}



