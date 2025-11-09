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
import { Calendar, MapPin, Clock, Settings, Plus, Rss, User, Users, ChevronLeft, ChevronRight, Shield, UserCog, Crown, Megaphone, Send } from "lucide-react";
import { Link } from "wouter";
import Header from "@/components/layout/header";
import MobileNav from "@/components/layout/mobile-nav";
import { SimpleBackground } from "@/components/simple-background";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import LazyImage from "@/components/ui/lazy-image";

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
  
  const { data: community, isLoading } = useQuery({
    queryKey: [`/api/groups/${id}`],
    queryFn: async () => {
      const response = await fetch(`/api/groups/${id}`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch group");
      return response.json();
    },
    enabled: !!id,
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
            <div className="max-w-7xl mx-auto">
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
            <div className="max-w-7xl mx-auto text-center py-16">
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

  // Check membership and admin (computed after mutations to satisfy hooks rule)
  const userMembership = members?.find((m: any) => m.userId === user?.id);
  const isAdmin = userMembership?.role === 'admin';
  const isMember = !!userMembership;

  // Role helpers
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Crown className="h-4 w-4 text-yellow-500" />;
      case 'moderator': return <Shield className="h-4 w-4 text-blue-500" />;
      default: return <User className="h-4 w-4 text-slate-400" />;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-yellow-600 text-yellow-100';
      case 'moderator': return 'bg-blue-600 text-blue-100';
      default: return 'bg-slate-600 text-slate-200';
    }
  };

  const canManageRole = (targetRole: string, currentUserRole: string) => {
    if (currentUserRole !== 'admin') return false;
    if (targetRole === 'admin') return false; // Can't change admin roles
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
      return date.toLocaleDateString();
    }
  };

  // Helper functions for date/time formatting
  const formatEventDate = (datetime: string) => {
    return new Date(datetime).toLocaleDateString();
  };

  const formatEventTime = (datetime: string) => {
    return new Date(datetime).toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
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
        <main className="flex-1 px-4 sm:px-6 lg:px-8 pt-28 pb-16">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Group Header */}
            <Card className="bg-slate-800/50 border-slate-700/50 shadow-sm overflow-hidden">
              {/* Cover Image */}
              {community.coverImageUrl && (
                <div 
                  className="h-48 bg-cover bg-center bg-slate-700"
                  style={{ backgroundImage: `url(${community.coverImageUrl})` }}
                />
              )}
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar className="w-16 h-16 border-2 border-slate-600">
                      <AvatarImage src={community.imageUrl || "/static/frog butcher.png"} />
                      <AvatarFallback className="bg-gradient-to-r from-primary to-cyan-400 text-white text-lg font-semibold">
                        {community.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h1 className="text-2xl font-bold text-white">{community.name}</h1>
                      <p className="text-slate-300 text-sm">
                        {new Date().toLocaleString('en-US', { 
                          timeZone: 'America/New_York', 
                          timeZoneName: 'short' 
                        })}
                      </p>
                    </div>
                  </div>
                  {isAdmin && (
                    <Button asChild className="bg-slate-700 hover:bg-slate-600 text-white rounded-full px-6">
                      <Link href={`/groups/${id}/manage`}>
                        <Settings className="h-4 w-4 mr-2" />
                        Manage
                      </Link>
                    </Button>
                  )}
                  {!isAdmin && user && (
                    isMember ? (
                      <Button 
                        variant="outline" 
                        className="border-slate-600 text-slate-200 hover:bg-slate-700 rounded-full px-6"
                        disabled={leaveMutation.isPending}
                        onClick={() => leaveMutation.mutate()}
                      >
                        {leaveMutation.isPending ? 'Unsubscribing...' : 'Unsubscribe'}
                      </Button>
                    ) : (
                      <Button 
                        className="bg-primary hover:brightness-110 text-white rounded-full px-6"
                        disabled={joinMutation.isPending}
                        onClick={() => joinMutation.mutate()}
                      >
                        {joinMutation.isPending ? 'Subscribing...' : 'Subscribe'}
                      </Button>
                    )
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Events */}
              <div className="lg:col-span-2 space-y-6">
                {/* Upcoming Events */}
                <Card className="bg-slate-800/50 border-slate-700/50 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Upcoming Events
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {upcomingEvents.length > 0 ? (
                      <div className="space-y-4">
                        {upcomingEvents.map((event: any) => (
                          <Card key={event.id} className="bg-slate-700/30 border-slate-600/30 shadow-none">
                            <CardContent className="p-4">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <h4 className="text-white font-medium">{event.title}</h4>
                                  <div className="flex items-center gap-4 text-slate-300 text-sm mt-2">
                                    <span className="flex items-center gap-1">
                                      <Calendar className="h-4 w-4" />
                                      {formatEventDate(event.datetime)}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-4 w-4" />
                                      {formatEventTime(event.datetime)}
                                    </span>
                                    {event.location && (
                                      <span className="flex items-center gap-1">
                                        <MapPin className="h-4 w-4" />
                                        {event.location}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {(isAdmin || user?.id === event.hostId) && (
                                  <Button asChild size="sm" variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-600">
                                    <Link href={`/edit-event/${event.slug || event.id}`}>
                                      Manage Event
                                    </Link>
                                  </Button>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Calendar className="h-12 w-12 text-slate-500 mx-auto mb-4" />
                        <h3 className="text-white font-medium mb-2">No upcoming events</h3>
                        <p className="text-slate-400 text-sm mb-4">Create your first event to get started</p>
                        <Button asChild className="bg-slate-700 hover:bg-slate-600 text-white">
                          <Link href={`/create-event?groupId=${community?.id}`}>Create Event</Link>
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Past Events Timeline */}
                <Card className="bg-slate-800/50 border-slate-700/50 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-white">Past Events</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {pastEvents.length > 0 ? (
                      <div className="space-y-4">
                        {pastEvents.map((event: any, index: number) => (
                          <div key={event.id} className="flex gap-4">
                            {/* Timeline */}
                            <div className="flex flex-col items-center">
                              <div className="w-3 h-3 bg-primary rounded-full"></div>
                              {index < pastEvents.length - 1 && (
                                <div className="w-px h-16 bg-slate-600 mt-2"></div>
                              )}
                            </div>
                            {/* Event Card */}
                            <Card className="flex-1 bg-slate-700/30 border-slate-600/30 shadow-none">
                              <CardContent className="p-4">
                                <div className="flex justify-between items-start">
                                  <div className="flex gap-4">
                                    {event.thumbnail && (
                                      <div className="w-16 h-16 bg-slate-600 rounded-lg overflow-hidden flex-shrink-0">
                                        <LazyImage
                                          src={event.thumbnail}
                                          alt={event.title}
                                          className="w-full h-full object-cover"
                                        />
                                      </div>
                                    )}
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 text-slate-300 text-sm mb-1">
                                        <span>{formatRelativeDate(event.datetime)}</span>
                                        <span>•</span>
                                        <span>{formatEventTime(event.datetime)}</span>
                                      </div>
                                      <h4 className="text-white font-medium mb-1">{event.title}</h4>
                                      <div className="flex items-center gap-2 text-slate-400 text-sm">
                                        <User className="h-4 w-4" />
                                        <span>Hosted by {event.hostName || "Group Admin"}</span>
                                      </div>
                                      {event.location && (
                                        <div className="flex items-center gap-2 text-slate-400 text-sm mt-1">
                                          <MapPin className="h-4 w-4" />
                                          <span>{event.location}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  {(isAdmin || user?.id === event.hostId) && (
                                    <Button asChild size="sm" variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-600 ml-4">
                                      <Link href={`/edit-event/${event.slug || event.id}`}>
                                        Manage Event
                                      </Link>
                                    </Button>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Calendar className="h-12 w-12 text-slate-500 mx-auto mb-4" />
                        <p className="text-slate-400">No past events</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Right Column - Calendar & Actions */}
              <div className="space-y-6">
                {/* Action Bar */}
                <Card className="bg-slate-800/50 border-slate-700/50 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <Button asChild className="bg-slate-700 hover:bg-slate-600 text-white flex items-center gap-2">
                        <Link href={`/create-event?groupId=${community?.id}`}>
                          <Plus className="h-4 w-4" />
                          Add Event
                        </Link>
                      </Button>
                      <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white hover:bg-slate-700">
                        <Rss className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Mini Calendar */}
                <Card className="bg-slate-800/50 border-slate-700/50 shadow-sm">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-white text-lg">
                        {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </CardTitle>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-slate-300 hover:text-white hover:bg-slate-700 p-1"
                          onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-slate-300 hover:text-white hover:bg-slate-700 p-1"
                          onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="text-slate-400 font-medium p-2">
                          {day}
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
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
                              p-2 text-center text-sm rounded-md cursor-pointer transition-colors
                              ${isCurrentMonth ? 'text-white' : 'text-slate-500'}
                              ${isToday ? 'bg-slate-700 text-white font-semibold' : 'hover:bg-slate-700'}
                              ${hasEvent ? 'ring-1 ring-cyan-500/40 bg-slate-700/50 text-cyan-300' : ''}
                            `}
                          >
                            {date.getDate()}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Group Stats */}
                <Card className="bg-slate-800/50 border-slate-700/50 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-white text-lg">Community Stats</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300">Members</span>
                      <span className="text-white font-medium">{community.memberCount}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300">Total Events</span>
                      <span className="text-white font-medium">{events?.length || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300">Upcoming</span>
                      <span className="text-white font-medium">{upcomingEvents.length}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Member Management - Admin Only */}
                {isAdmin && members && (
                  <Card className="bg-slate-800/50 border-slate-700/50 shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-white text-lg flex items-center gap-2">
                        <UserCog className="h-5 w-5" />
                        Member Management
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {members.map((member: any) => (
                        <div key={member.userId} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={member.user?.profilePicture} />
                              <AvatarFallback className="bg-slate-600 text-white text-sm">
                                {member.user?.displayName?.slice(0, 2).toUpperCase() || 'UN'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-white text-sm font-medium">
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
                              <SelectTrigger className="w-32 bg-slate-600 border-slate-500 text-white">
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
                )}

                {/* Join Requests Management - Admin Only & Private Communities */}
                {isAdmin && !community.isPublic && (
                  <Card className="bg-slate-800/50 border-slate-700/50 shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-white text-lg flex items-center gap-2">
                        <UserCog className="h-5 w-5" />
                        Join Requests
                        {joinRequests && joinRequests.length > 0 && (
                          <Badge variant="secondary" className="bg-orange-600 text-orange-100 ml-2">
                            {joinRequests.filter((req: any) => req.status === 'pending').length} Pending
                          </Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {joinRequests && joinRequests.length > 0 ? (
                        <div className="space-y-3">
                          {joinRequests.filter((request: any) => request.status === 'pending').map((request: any) => (
                            <Card key={request.id} className="bg-slate-700/30 border-slate-600/30">
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                  <div className="flex items-start gap-3 flex-1">
                                    <Avatar className="h-10 w-10">
                                      <AvatarImage src={request.user?.profileImageUrl} />
                                      <AvatarFallback className="bg-slate-600 text-white">
                                        {`${request.user?.firstName?.[0] || ''}${request.user?.lastName?.[0] || ''}`.toUpperCase() || 'UN'}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="text-white font-medium">
                                          {`${request.user?.firstName || ''} ${request.user?.lastName || ''}`.trim() || 'Unknown User'}
                                        </span>
                                        <span className="text-slate-400 text-sm">
                                          {formatAnnouncementDate(request.createdAt)}
                                        </span>
                                      </div>
                                      {request.message && (
                                        <div className="bg-slate-600/30 rounded-lg p-3 mb-3">
                                          <p className="text-slate-300 text-sm italic">"{request.message}"</p>
                                        </div>
                                      )}
                                      <p className="text-slate-400 text-sm">{request.user?.email}</p>
                                    </div>
                                  </div>
                                  
                                  <div className="flex gap-2 ml-4">
                                    <Button
                                      size="sm"
                                      onClick={() => rejectJoinRequestMutation.mutate(request.id)}
                                      disabled={rejectJoinRequestMutation.isPending || approveJoinRequestMutation.isPending}
                                      variant="outline"
                                      className="border-red-600/50 text-red-300 hover:bg-red-600/20"
                                    >
                                      {rejectJoinRequestMutation.isPending ? 'Rejecting...' : 'Reject'}
                                    </Button>
                                    <Button
                                      size="sm"
                                      onClick={() => approveJoinRequestMutation.mutate(request.id)}
                                      disabled={approveJoinRequestMutation.isPending || rejectJoinRequestMutation.isPending}
                                      className="bg-green-600/20 hover:bg-green-600/30 border border-green-600/30 text-green-100"
                                    >
                                      {approveJoinRequestMutation.isPending ? 'Approving...' : 'Approve'}
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                          
                          {/* Show processed requests if any */}
                          {joinRequests.filter((req: any) => req.status !== 'pending').length > 0 && (
                            <details className="mt-4">
                              <summary className="text-slate-400 text-sm cursor-pointer hover:text-white">
                                View processed requests ({joinRequests.filter((req: any) => req.status !== 'pending').length})
                              </summary>
                              <div className="mt-3 space-y-2">
                                {joinRequests.filter((request: any) => request.status !== 'pending').map((request: any) => (
                                  <div key={request.id} className="flex items-center justify-between p-3 bg-slate-700/20 rounded-lg">
                                    <div className="flex items-center gap-3">
                                      <Avatar className="h-8 w-8">
                                        <AvatarImage src={request.user?.profileImageUrl} />
                                        <AvatarFallback className="bg-slate-600 text-white text-xs">
                                          {`${request.user?.firstName?.[0] || ''}${request.user?.lastName?.[0] || ''}`.toUpperCase() || 'UN'}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span className="text-white text-sm">
                                        {`${request.user?.firstName || ''} ${request.user?.lastName || ''}`.trim() || 'Unknown User'}
                                      </span>
                                    </div>
                                    <Badge 
                                      variant="secondary"
                                      className={request.status === 'approved' 
                                        ? 'bg-green-600 text-green-100' 
                                        : 'bg-red-600 text-red-100'
                                      }
                                    >
                                      {request.status}
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            </details>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-6">
                          <UserCog className="h-8 w-8 text-slate-500 mx-auto mb-2" />
                          <p className="text-slate-400 text-sm">No pending join requests</p>
                          <p className="text-slate-500 text-xs mt-1">
                            Users can request to join this private community from the discovery page
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Announcement System - Admin Only */}
                {isAdmin && (
                  <Card className="bg-slate-800/50 border-slate-700/50 shadow-sm">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-white text-lg flex items-center gap-2">
                          <Megaphone className="h-5 w-5" />
                          Announcements
                        </CardTitle>
                        <Button
                          size="sm"
                          onClick={() => setShowAnnouncementForm(!showAnnouncementForm)}
                          className="bg-slate-700 hover:bg-slate-600 text-white"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          New
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Create Announcement Form */}
                      {showAnnouncementForm && (
                        <Card className="bg-slate-700/50 border-slate-600/50">
                          <CardContent className="p-4 space-y-3">
                            <div className="space-y-2">
                              <Input
                                placeholder="Announcement title..."
                                value={announcementForm.title}
                                onChange={(e) => setAnnouncementForm(prev => ({ ...prev, title: e.target.value }))}
                                className="bg-slate-600 border-slate-500 text-white placeholder:text-slate-400"
                              />
                              <Textarea
                                placeholder="Write your announcement..."
                                value={announcementForm.content}
                                onChange={(e) => setAnnouncementForm(prev => ({ ...prev, content: e.target.value }))}
                                className="bg-slate-600 border-slate-500 text-white placeholder:text-slate-400 min-h-[80px]"
                              />
                              <div className="flex items-center gap-2">
                                <Select
                                  value={announcementForm.type}
                                  onValueChange={(value) => setAnnouncementForm(prev => ({ ...prev, type: value as any }))}
                                >
                                  <SelectTrigger className="w-32 bg-slate-600 border-slate-500 text-white">
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
                                  className="bg-cyan-600 hover:bg-cyan-700 text-white"
                                >
                                  <Send className="h-4 w-4 mr-1" />
                                  {createAnnouncementMutation.isPending ? 'Posting...' : 'Post'}
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Announcements List */}
                      <div className="space-y-3">
                        {announcements && announcements.length > 0 ? (
                          announcements.map((announcement: any) => (
                            <Card key={announcement.id} className="bg-slate-700/30 border-slate-600/30">
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <h4 className="text-white font-medium">{announcement.title}</h4>
                                    <Badge 
                                      variant="secondary"
                                      className={`text-xs ${getAnnouncementTypeColor(announcement.type)}`}
                                    >
                                      {announcement.type}
                                    </Badge>
                                  </div>
                                  <span className="text-slate-400 text-xs">
                                    {formatAnnouncementDate(announcement.createdAt)}
                                  </span>
                                </div>
                                <p className="text-slate-300 text-sm mb-2">{announcement.content}</p>
                                <div className="flex items-center gap-2 text-slate-400 text-xs">
                                  <span>By {announcement.author?.displayName || 'Admin'}</span>
                                </div>
                              </CardContent>
                            </Card>
                          ))
                        ) : (
                          <div className="text-center py-6">
                            <Megaphone className="h-8 w-8 text-slate-500 mx-auto mb-2" />
                            <p className="text-slate-400 text-sm">No announcements yet</p>
                            {!showAnnouncementForm && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setShowAnnouncementForm(true)}
                                className="mt-2 border-slate-600 text-slate-300 hover:bg-slate-700"
                              >
                                Create first announcement
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
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

