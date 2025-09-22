import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, MapPin, Clock, Settings, Plus, Rss, User, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import Header from "@/components/layout/header";
import MobileNav from "@/components/layout/mobile-nav";
import { ThemeBackground } from "@/components/theme-background";
import { getThemeById } from "@shared/themes";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export default function CommunityDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: community, isLoading } = useQuery({
    queryKey: [`/api/communities/${id}`],
    queryFn: async () => {
      const response = await fetch(`/api/communities/${id}`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch community");
      return response.json();
    },
    enabled: !!id,
  });

  const [currentDate, setCurrentDate] = useState(new Date());

  const { data: events } = useQuery({
    queryKey: [`/api/communities/${id}/events`],
    queryFn: async () => {
      const response = await fetch(`/api/communities/${id}/events`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch events");
      return response.json();
    },
    enabled: !!id,
  });

  const { data: members } = useQuery({
    queryKey: [`/api/communities/${id}/members`],
    queryFn: async () => {
      const response = await fetch(`/api/communities/${id}/members`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch members");
      return response.json();
    },
    enabled: !!id,
  });

  // All mutations must be defined before any conditional returns
  const joinMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/communities/${id}/join`, { method: 'POST', credentials: 'include' });
      if (!res.ok) throw new Error('Failed to subscribe');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Subscribed', description: 'You will now receive updates.' });
      queryClient.invalidateQueries({ queryKey: [`/api/communities/${id}/members`] });
      queryClient.invalidateQueries({ queryKey: ["/api/profile/communities"] });
      queryClient.invalidateQueries({ queryKey: [`/api/communities/${id}`] });
    },
    onError: () => {
      toast({ title: 'Subscription failed', description: 'Please try again.', variant: 'destructive' });
    },
  });

  const leaveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/communities/${id}/leave`, { method: 'POST', credentials: 'include' });
      if (!res.ok) throw new Error('Failed to unsubscribe');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Unsubscribed', description: 'You will stop receiving updates.' });
      queryClient.invalidateQueries({ queryKey: [`/api/communities/${id}/members`] });
      queryClient.invalidateQueries({ queryKey: ["/api/profile/communities"] });
      queryClient.invalidateQueries({ queryKey: [`/api/communities/${id}`] });
    },
    onError: () => {
      toast({ title: 'Unsubscribe failed', description: 'Please try again.', variant: 'destructive' });
    },
  });

  // Dynamic theme based on community settings
  const getTheme = () => {
    if (community?.settings?.color) {
      return {
        id: 'community-custom',
        name: 'Community Theme',
        category: 'minimal' as const,
        preview: 'Custom community theme',
        solidColor: community.settings.color,
        textColor: '#ffffff',
        darkMode: true,
      };
    }
    return getThemeById('quantum-dark');
  };
  const theme = getTheme();

  if (isLoading) {
    return (
      <ThemeBackground theme={theme} className="min-h-screen">
        <div className="absolute inset-0 bg-black/25" />
        <div className="relative z-10">
          <Header />
          <main className="flex-1 px-4 sm:px-6 lg:px-8 pt-28 pb-16">
            <div className="max-w-7xl mx-auto">
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent mx-auto"></div>
                <p className="text-white/60 text-sm mt-4">Loading community...</p>
              </div>
            </div>
          </main>
        </div>
      </ThemeBackground>
    );
  }

  if (!community) {
    return (
      <ThemeBackground theme={theme} className="min-h-screen">
        <div className="absolute inset-0 bg-black/25" />
        <div className="relative z-10">
          <Header />
          <main className="flex-1 px-4 sm:px-6 lg:px-8 pt-28 pb-16">
            <div className="max-w-7xl mx-auto text-center py-16">
              <h1 className="text-2xl font-bold text-white mb-4">Community not found</h1>
              <Button asChild variant="outline" className="border-white/30 text-white hover:bg-white/20">
                <Link href="/communities">Back to Communities</Link>
              </Button>
            </div>
          </main>
        </div>
      </ThemeBackground>
    );
  }

  // Check membership and admin (computed after mutations to satisfy hooks rule)
  const userMembership = members?.find((m: any) => m.userId === user?.id);
  const isAdmin = userMembership?.role === 'admin';
  const isMember = !!userMembership;

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
    <ThemeBackground theme={theme} className="min-h-screen bg-slate-900">
      <div className="absolute inset-0 bg-black/10" />
      <div className="relative z-10">
        <Header />
        <main className="flex-1 px-4 sm:px-6 lg:px-8 pt-28 pb-16">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Community Header */}
            <Card className="bg-slate-800/50 border-slate-700/50 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar className="w-16 h-16 border-2 border-slate-600">
                      <AvatarImage src={community.imageUrl} />
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
                      <Link href={`/communities/${id}/manage`}>
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
                                {(isAdmin || !user) && (
                                  <Button asChild size="sm" variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-600">
                                    <Link href={`/events/${event.id}/manage`}>
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
                          <Link href="/create-event">Create Event</Link>
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
                                        <img 
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
                                        <span>Hosted by {event.hostName || "Community Admin"}</span>
                                      </div>
                                      {event.location && (
                                        <div className="flex items-center gap-2 text-slate-400 text-sm mt-1">
                                          <MapPin className="h-4 w-4" />
                                          <span>{event.location}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  {(isAdmin || !user) && (
                                    <Button size="sm" variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-600 ml-4">
                                      Manage Event
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
                        <Link href="/create-event">
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

                {/* Community Stats */}
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
              </div>
            </div>
          </div>
        </main>
        <MobileNav />
      </div>
    </ThemeBackground>
  );
}