import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  ArrowLeft, 
  TrendingUp, 
  TrendingDown,
  Users, 
  Calendar, 
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Zap,
  Target,
  BarChart3,
  ArrowRight,
  Eye,
  UserCheck,
  Ticket,
  ChevronRight,
  Bell,
  Settings,
  Sparkles,
  DollarSign,
  CreditCard,
  RefreshCcw,
  PieChart,
  Award,
  TrendingDown as TrendDown,
  AlertCircle,
  Gauge,
  CalendarClock,
  Percent,
  Ban,
  Receipt,
  Wallet,
  Timer,
  Heart,
  HeartPulse,
  UserMinus,
  UserPlus,
  Crown,
  Star,
  Flame,
  Snowflake,
  Sun,
  Moon,
  CloudRain,
  Leaf,
  Info,
  ShieldAlert,
  UsersRound,
  Footprints,
  CircleDot,
  CalendarDays,
  Globe,
  Share2,
  Link2,
  CheckCircle,
  Plus
} from "lucide-react";
import { Link } from "wouter";
import Header from "@/components/layout/header";
import MobileNav from "@/components/layout/mobile-nav";
import { SimpleBackground } from "@/components/simple-background";
import { useAuth } from "@/hooks/useAuth";
import { useState, useMemo } from "react";

// Helper to calculate time ago
function timeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

// Helper to format date nicely
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  if (date.toDateString() === now.toDateString()) {
    return `Today at ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  }
  if (date.toDateString() === tomorrow.toDateString()) {
    return `Tomorrow at ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  }
  return date.toLocaleDateString(undefined, { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

export default function GroupDashboard() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("command-center");

  // Fetch group data
  const { data: group, isLoading: groupLoading } = useQuery({
    queryKey: [`/api/groups/${id}`],
    queryFn: async () => {
      const response = await fetch(`/api/groups/${id}`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch group");
      return response.json();
    },
    enabled: !!id,
  });

  // Fetch members
  const { data: members } = useQuery({
    queryKey: [`/api/groups/${id}/members`],
    queryFn: async () => {
      const response = await fetch(`/api/groups/${id}/members`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch members");
      return response.json();
    },
    enabled: !!id,
  });

  // Fetch group events
  const { data: events } = useQuery({
    queryKey: [`/api/groups/${id}/events`],
    queryFn: async () => {
      const response = await fetch(`/api/groups/${id}/events`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch events");
      return response.json();
    },
    enabled: !!id,
  });

  // Fetch dashboard analytics
  const { data: analytics } = useQuery({
    queryKey: [`/api/groups/${id}/dashboard-analytics`],
    queryFn: async () => {
      const response = await fetch(`/api/groups/${id}/dashboard-analytics`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch analytics");
      return response.json();
    },
    enabled: !!id,
  });

  // Fetch join requests for alerts
  const { data: joinRequests } = useQuery({
    queryKey: [`/api/groups/${id}/join-requests`],
    queryFn: async () => {
      const response = await fetch(`/api/groups/${id}/join-requests`, { credentials: "include" });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!id,
  });

  // Fetch financial analytics
  const { data: financialData } = useQuery({
    queryKey: [`/api/groups/${id}/financial-analytics`],
    queryFn: async () => {
      const response = await fetch(`/api/groups/${id}/financial-analytics`, { credentials: "include" });
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!id,
  });

  // Fetch community insights (event patterns, member joins)
  const { data: communityHealthData } = useQuery({
    queryKey: [`/api/groups/${id}/community-health`],
    queryFn: async () => {
      const response = await fetch(`/api/groups/${id}/community-health`, { credentials: "include" });
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!id,
  });

  // Fetch member intelligence
  const { data: memberIntelligenceData } = useQuery({
    queryKey: [`/api/groups/${id}/member-intelligence`],
    queryFn: async () => {
      const response = await fetch(`/api/groups/${id}/member-intelligence`, { credentials: "include" });
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!id,
  });

  // Check if user is owner or host
  const userMembership = members?.find((m: any) => m.userId === user?.id);
  const isOwner = userMembership?.role === 'owner';
  const isHost = userMembership?.role === 'host';
  const hasEventHostAccess = isOwner || isHost; // Can create events and see event-level metrics

  // Computed metrics from data
  const metrics = useMemo(() => {
    if (!events || !members) return null;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    // Upcoming events
    const upcomingEvents = events.filter((e: any) => new Date(e.datetime) > now)
      .sort((a: any, b: any) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());
    
    // Past events
    const pastEvents = events.filter((e: any) => new Date(e.datetime) <= now)
      .sort((a: any, b: any) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime());

    // Events in last 30 days
    const recentEvents = events.filter((e: any) => {
      const eventDate = new Date(e.datetime);
      return eventDate >= thirtyDaysAgo && eventDate <= now;
    });

    // Events in previous 30 days (30-60 days ago)
    const previousPeriodEvents = events.filter((e: any) => {
      const eventDate = new Date(e.datetime);
      return eventDate >= sixtyDaysAgo && eventDate < thirtyDaysAgo;
    });

    // Calculate engagement trend
    const recentEngagement = recentEvents.reduce((acc: number, e: any) => acc + (e.goingCount || 0), 0);
    const previousEngagement = previousPeriodEvents.reduce((acc: number, e: any) => acc + (e.goingCount || 0), 0);
    const engagementTrend = previousEngagement > 0 
      ? ((recentEngagement - previousEngagement) / previousEngagement) * 100 
      : recentEngagement > 0 ? 100 : 0;

    // Members joined recently
    const recentMembers = members.filter((m: any) => 
      new Date(m.joinedAt) >= thirtyDaysAgo
    ).length;

    // Total RSVPs across all events
    const totalRsvps = events.reduce((acc: number, e: any) => acc + (e.goingCount || 0), 0);

    return {
      upcomingEvents,
      pastEvents,
      recentEvents,
      totalMembers: members.length,
      recentMembers,
      engagementTrend,
      recentEngagement,
      previousEngagement,
      totalRsvps
    };
  }, [events, members]);

  // Priority alerts (max 5)
  const priorityAlerts = useMemo(() => {
    const alerts: Array<{
      id: string;
      type: 'warning' | 'info' | 'success' | 'urgent';
      title: string;
      description: string;
      action?: { label: string; href: string };
    }> = [];

    if (!metrics || !events) return alerts;

    const now = new Date();

    // Check for pending join requests
    const pendingRequests = joinRequests?.filter((r: any) => r.status === 'pending') || [];
    if (pendingRequests.length > 0) {
      alerts.push({
        id: 'join-requests',
        type: 'urgent',
        title: `${pendingRequests.length} pending join request${pendingRequests.length > 1 ? 's' : ''}`,
        description: 'People are waiting to join your group',
        action: { label: 'Review', href: `/groups/${id}/manage?tab=requests` }
      });
    }

    // Check for events happening today
    const todayEvents = metrics.upcomingEvents.filter((e: any) => {
      const eventDate = new Date(e.datetime);
      return eventDate.toDateString() === now.toDateString();
    });
    if (todayEvents.length > 0) {
      alerts.push({
        id: 'today-events',
        type: 'info',
        title: `${todayEvents.length} event${todayEvents.length > 1 ? 's' : ''} happening today`,
        description: todayEvents.map((e: any) => e.title).join(', '),
        action: { label: 'View', href: `/events/${todayEvents[0].slug || todayEvents[0].id}` }
      });
    }

    // Check for events with low attendance
    const lowAttendanceEvents = metrics.upcomingEvents.filter((e: any) => {
      const eventDate = new Date(e.datetime);
      const daysUntil = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return daysUntil < 3 && daysUntil > 0 && (e.goingCount || 0) < 3;
    });
    if (lowAttendanceEvents.length > 0) {
      alerts.push({
        id: 'low-attendance',
        type: 'warning',
        title: 'Event needs attention',
        description: `"${lowAttendanceEvents[0].title}" has low RSVPs and is happening soon`,
        action: { label: 'Boost', href: `/events/${lowAttendanceEvents[0].slug || lowAttendanceEvents[0].id}` }
      });
    }

    // Engagement trend alert
    if (metrics.engagementTrend < -20 && metrics.previousEngagement > 0) {
      alerts.push({
        id: 'engagement-drop',
        type: 'warning',
        title: 'Engagement dropping',
        description: `Event attendance is down ${Math.abs(Math.round(metrics.engagementTrend))}% from last month`,
        action: { label: 'Create Event', href: `/create-event?groupId=${id}` }
      });
    }

    // Success alert for growth
    if (metrics.recentMembers >= 5) {
      alerts.push({
        id: 'growth',
        type: 'success',
        title: 'Your group is growing!',
        description: `${metrics.recentMembers} new members joined this month`,
      });
    }

    // Limit to 5 alerts
    return alerts.slice(0, 5);
  }, [metrics, events, joinRequests, id]);

  // "Do this next" actions
  const nextActions = useMemo(() => {
    const actions: Array<{
      id: string;
      label: string;
      description: string;
      href: string;
      icon: any;
      priority: number;
    }> = [];

    if (!metrics || !group) return actions;

    const now = new Date();
    const hasUpcomingEvent = metrics.upcomingEvents.length > 0;
    const hasPastEvents = metrics.pastEvents.length > 0;
    const pendingRequests = joinRequests?.filter((r: any) => r.status === 'pending') || [];

    // Priority order
    if (pendingRequests.length > 0) {
      actions.push({
        id: 'review-requests',
        label: 'Review join requests',
        description: `${pendingRequests.length} people waiting`,
        href: `/groups/${id}/manage?tab=requests`,
        icon: UserCheck,
        priority: 1
      });
    }

    if (!hasUpcomingEvent) {
      actions.push({
        id: 'create-event',
        label: 'Create an event',
        description: 'No upcoming events scheduled',
        href: `/create-event?groupId=${id}`,
        icon: Calendar,
        priority: 2
      });
    }

    if (hasUpcomingEvent) {
      const nextEvent = metrics.upcomingEvents[0];
      actions.push({
        id: 'promote-event',
        label: 'Share your next event',
        description: `"${nextEvent.title}" is coming up`,
        href: `/events/${nextEvent.slug || nextEvent.id}`,
        icon: Zap,
        priority: 3
      });
    }

    if (metrics.totalMembers < 10) {
      actions.push({
        id: 'invite-members',
        label: 'Invite more members',
        description: 'Grow your community',
        href: `/groups/${id}`,
        icon: Users,
        priority: 4
      });
    }

    return actions.sort((a, b) => a.priority - b.priority).slice(0, 3);
  }, [metrics, group, joinRequests, id]);

  // Loading state
  if (groupLoading) {
    return (
      <SimpleBackground className="min-h-screen">
        <div className="absolute inset-0 bg-black/25" />
        <div className="relative z-10">
          <Header />
          <main className="flex-1 px-4 sm:px-6 lg:px-8 pt-28 pb-16">
            <div className="max-w-7xl mx-auto">
              <div className="animate-pulse space-y-6">
                <div className="h-8 w-64 bg-slate-700/50 rounded" />
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-32 bg-slate-700/50 rounded-lg" />
                  ))}
                </div>
              </div>
            </div>
          </main>
        </div>
      </SimpleBackground>
    );
  }

  // Group not found
  if (!group) {
    return (
      <SimpleBackground className="min-h-screen">
        <div className="absolute inset-0 bg-black/25" />
        <div className="relative z-10">
          <Header />
          <main className="flex-1 px-4 sm:px-6 lg:px-8 pt-28 pb-16">
            <div className="max-w-7xl mx-auto text-center py-16">
              <h1 className="text-2xl font-bold text-white mb-4">Group not found</h1>
              <Button asChild variant="outline" className="border-white/30 text-white hover:bg-white/20">
                <Link href="/groups">Back to Groups</Link>
              </Button>
            </div>
          </main>
        </div>
      </SimpleBackground>
    );
  }

  // Access denied for members (only owners and hosts can access dashboard)
  if (!hasEventHostAccess && members) {
    return (
      <SimpleBackground className="min-h-screen">
        <div className="absolute inset-0 bg-black/25" />
        <div className="relative z-10">
          <Header />
          <main className="flex-1 px-4 sm:px-6 lg:px-8 pt-28 pb-16">
            <div className="max-w-7xl mx-auto text-center py-16">
              <h1 className="text-2xl font-bold text-white mb-4">Access Denied</h1>
              <p className="text-white/70 mb-6">Only group owners and hosts can access the dashboard.</p>
              <Button asChild variant="outline" className="border-white/30 text-white hover:bg-white/20">
                <Link href={`/groups/${id}`}>Back to Group</Link>
              </Button>
            </div>
          </main>
        </div>
      </SimpleBackground>
    );
  }

  // Host view: Only show their events and event-level metrics
  if (isHost && !isOwner) {
    // Filter events to only show those hosted by the current user
    const myEvents = events?.filter((e: any) => e.hostId === user?.id) || [];
    const myUpcomingEvents = myEvents.filter((e: any) => new Date(e.datetime) > new Date())
      .sort((a: any, b: any) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());
    const myPastEvents = myEvents.filter((e: any) => new Date(e.datetime) <= new Date())
      .sort((a: any, b: any) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime());
    const myTotalRsvps = myEvents.reduce((acc: number, e: any) => acc + (e.goingCount || 0), 0);

    return (
      <SimpleBackground className="min-h-screen">
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative z-10">
          <Header />
          <main className="flex-1 px-4 sm:px-6 md:px-8 lg:px-10 pt-24 md:pt-28 pb-24 md:pb-20">
            <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
              {/* Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6">
                <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
                  <Button asChild variant="ghost" size="sm" className="text-slate-200 hover:bg-slate-800 h-9 px-3">
                    <Link href={`/groups/${id}`}>
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      <span className="text-sm">Back</span>
                    </Link>
                  </Button>
                  <div className="flex-1">
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight flex items-center gap-3">
                      <Calendar className="h-6 w-6 md:h-7 md:w-7 text-purple-400" />
                      <span className="truncate">My Events</span>
                    </h1>
                    <p className="text-slate-300 text-sm mt-1 truncate">
                      In {group.name}
                    </p>
                  </div>
                </div>
              </div>

              {/* Host Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                <Card className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-700/50">
                  <CardContent className="p-5 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm text-slate-400 font-medium">My Events</p>
                        <p className="text-3xl font-bold text-white mt-1">{myEvents.length}</p>
                        <p className="text-xs text-slate-400 mt-1">total</p>
                      </div>
                      <div className="h-12 w-12 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0">
                        <Calendar className="h-6 w-6 text-purple-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-700/50">
                  <CardContent className="p-5 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm text-slate-400 font-medium">Upcoming</p>
                        <p className="text-3xl font-bold text-white mt-1">{myUpcomingEvents.length}</p>
                        <p className="text-xs text-slate-400 mt-1">scheduled</p>
                      </div>
                      <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                        <Clock className="h-6 w-6 text-blue-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-700/50">
                  <CardContent className="p-5 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm text-slate-400 font-medium">Total RSVPs</p>
                        <p className="text-3xl font-bold text-white mt-1">{myTotalRsvps}</p>
                        <p className="text-xs text-slate-400 mt-1">my events</p>
                      </div>
                      <div className="h-12 w-12 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                        <Ticket className="h-6 w-6 text-emerald-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-700/50">
                  <CardContent className="p-5 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm text-slate-400 font-medium">Avg RSVPs</p>
                        <p className="text-3xl font-bold text-white mt-1">
                          {myEvents.length > 0 ? Math.round(myTotalRsvps / myEvents.length) : 0}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">per event</p>
                      </div>
                      <div className="h-12 w-12 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                        <BarChart3 className="h-6 w-6 text-amber-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Create Event Button */}
              <Card className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 border-purple-500/30">
                <CardContent className="p-5 sm:p-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white">Create New Event</h3>
                      <p className="text-slate-300 text-sm">Host an event for the group</p>
                    </div>
                    <Button asChild className="bg-purple-600 hover:bg-purple-700 text-white w-full sm:w-auto h-10 text-sm">
                      <Link href={`/create-event?groupId=${id}`}>
                        <Calendar className="h-4 w-4 mr-2" />
                        Create Event
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* My Events List */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {/* Upcoming Events */}
                <Card className="bg-slate-800/50 border-slate-700/50">
                  <CardHeader className="p-5 sm:p-6">
                    <CardTitle className="text-lg text-white flex items-center gap-2">
                      <Clock className="h-5 w-5 text-blue-400" />
                      My Upcoming Events
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 sm:space-y-4 p-5 sm:p-6 pt-0">
                    {myUpcomingEvents.length > 0 ? (
                      myUpcomingEvents.slice(0, 5).map((event: any) => (
                        <Link key={event.id} href={`/event/${event.slug || event.id}`}>
                          <div className="p-4 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition-colors cursor-pointer border border-slate-600/30">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-white text-sm truncate">{event.title}</p>
                                <p className="text-sm text-slate-400 mt-1">
                                  {new Date(event.datetime).toLocaleDateString()}
                                </p>
                              </div>
                              <Badge variant="outline" className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs px-2 py-0.5 whitespace-nowrap">
                                {event.goingCount || 0} RSVPs
                              </Badge>
                            </div>
                          </div>
                        </Link>
                      ))
                    ) : (
                      <p className="text-slate-400 text-center py-6 text-sm">No upcoming events</p>
                    )}
                  </CardContent>
                </Card>

                {/* Past Events */}
                <Card className="bg-slate-800/50 border-slate-700/50">
                  <CardHeader className="p-5 sm:p-6">
                    <CardTitle className="text-lg text-white flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-slate-400" />
                      My Past Events
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 sm:space-y-4 p-5 sm:p-6 pt-0">
                    {myPastEvents.length > 0 ? (
                      myPastEvents.slice(0, 5).map((event: any) => (
                        <Link key={event.id} href={`/event/${event.slug || event.id}`}>
                          <div className="p-4 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition-colors cursor-pointer border border-slate-600/30">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-white text-sm truncate">{event.title}</p>
                                <p className="text-sm text-slate-400 mt-1">
                                  {new Date(event.datetime).toLocaleDateString()}
                                </p>
                              </div>
                              <Badge variant="outline" className="bg-slate-500/20 text-slate-300 border-slate-500/30 text-xs px-2 py-0.5 whitespace-nowrap">
                                {event.goingCount || 0} attended
                              </Badge>
                            </div>
                          </div>
                        </Link>
                      ))
                    ) : (
                      <p className="text-slate-400 text-center py-6 text-sm">No past events yet</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </main>
        </div>
      </SimpleBackground>
    );
  }

  // Owner view: Full dashboard (existing code)
  return (
    <SimpleBackground className="min-h-screen">
      <div className="absolute inset-0 bg-black/10" />
      <div className="relative z-10">
        <Header />
        <main className="flex-1 px-4 sm:px-6 md:px-8 lg:px-10 pt-24 md:pt-28 pb-24 md:pb-20">
          <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6">
              <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
                <Button asChild variant="ghost" size="sm" className="text-slate-200 hover:bg-slate-800 h-9 px-3">
                  <Link href={`/groups/${id}`}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    <span className="text-sm">Back</span>
                  </Link>
                </Button>
                <div className="flex-1">
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight flex items-center gap-3">
                    <Sparkles className="h-6 w-6 md:h-7 md:w-7 text-amber-400" />
                    <span className="truncate">{group.name}</span>
                  </h1>
                  <p className="text-slate-300 text-sm mt-1">
                    Command center
                  </p>
                </div>
              </div>
              <Button asChild variant="outline" size="sm" className="border-slate-600 text-slate-200 hover:bg-slate-700 h-9 px-4 text-sm w-full sm:w-auto">
                <Link href={`/groups/${id}/manage`}>
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Link>
              </Button>
            </div>

            {/* Tab Navigation */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6 sm:space-y-8">
              <TabsList className="bg-slate-800/70 border border-slate-700/50 p-1.5 sm:p-2 flex-wrap h-auto gap-2 w-full">
                <TabsTrigger 
                  value="command-center" 
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500/20 data-[state=active]:to-orange-500/20 data-[state=active]:text-amber-300 text-sm px-3 py-2 flex-1 sm:flex-none"
                >
                  <Activity className="h-4 w-4 mr-2" />
                  Command
                </TabsTrigger>
                <TabsTrigger 
                  value="events-intelligence"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500/20 data-[state=active]:to-cyan-500/20 data-[state=active]:text-blue-300 text-sm px-3 py-2 flex-1 sm:flex-none"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Events
                </TabsTrigger>
                <TabsTrigger 
                  value="financial-intelligence"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500/20 data-[state=active]:to-green-500/20 data-[state=active]:text-emerald-300 text-sm px-3 py-2 flex-1 sm:flex-none"
                >
                  <Wallet className="h-4 w-4 mr-2" />
                  Financial
                </TabsTrigger>
                <TabsTrigger 
                  value="community-health"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-rose-500/20 data-[state=active]:to-red-500/20 data-[state=active]:text-rose-300 text-sm px-3 py-2 flex-1 sm:flex-none"
                >
                  <HeartPulse className="h-4 w-4 mr-2" />
                  Community
                </TabsTrigger>
                <TabsTrigger 
                  value="member-intelligence"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500/20 data-[state=active]:to-violet-500/20 data-[state=active]:text-indigo-300 text-sm px-3 py-2 flex-1 sm:flex-none"
                >
                  <Crown className="h-4 w-4 mr-2" />
                  Members
                </TabsTrigger>
              </TabsList>

              {/* Command Center Tab */}
              <TabsContent value="command-center" className="space-y-6 sm:space-y-8">
                {/* Today's Pulse - Key Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                  {/* Total Members */}
                  <Card className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-700/50">
                    <CardContent className="p-5 sm:p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm text-slate-400 font-medium">Total Members</p>
                          <p className="text-3xl font-bold text-white mt-1">{metrics?.totalMembers || 0}</p>
                          {metrics?.recentMembers ? (
                            <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                              <TrendingUp className="h-3 w-3" />
                              +{metrics.recentMembers} month
                            </p>
                          ) : null}
                        </div>
                        <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                          <Users className="h-6 w-6 text-blue-400" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Upcoming Events */}
                  <Card className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-700/50">
                    <CardContent className="p-5 sm:p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm text-slate-400 font-medium">Upcoming</p>
                          <p className="text-3xl font-bold text-white mt-1">{metrics?.upcomingEvents?.length || 0}</p>
                          {metrics?.upcomingEvents?.[0] && (
                            <p className="text-xs text-slate-300 mt-1 truncate max-w-[180px]">
                              {metrics.upcomingEvents[0].title}
                            </p>
                          )}
                        </div>
                        <div className="h-12 w-12 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0">
                          <Calendar className="h-6 w-6 text-purple-400" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Total RSVPs */}
                  <Card className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-700/50">
                    <CardContent className="p-5 sm:p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm text-slate-400 font-medium">Total RSVPs</p>
                          <p className="text-3xl font-bold text-white mt-1">{metrics?.totalRsvps || 0}</p>
                          <p className="text-xs text-slate-400 mt-1">all events</p>
                        </div>
                        <div className="h-12 w-12 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                          <Ticket className="h-6 w-6 text-emerald-400" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Total Revenue */}
                  <Card className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-700/50">
                    <CardContent className="p-5 sm:p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm text-slate-400 font-medium">Revenue</p>
                          <p className="text-3xl font-bold text-white mt-1">₹{financialData?.totalCollected || 0}</p>
                          <p className="text-xs text-slate-400 mt-1">paid events</p>
                        </div>
                        <div className="h-12 w-12 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                          <Wallet className="h-6 w-6 text-amber-400" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Priority Alerts & Actions Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  {/* Priority Alerts */}
                  <Card className="bg-slate-800/50 border-slate-700/50">
                    <CardHeader className="p-5 sm:p-6 pb-3">
                      <CardTitle className="text-lg text-white flex items-center gap-2">
                        <Bell className="h-5 w-5 text-amber-400" />
                        Priority Alerts
                      </CardTitle>
                      <CardDescription className="text-slate-400 text-sm">
                        Need attention
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 sm:space-y-4 p-5 sm:p-6 pt-0">
                      {priorityAlerts.length > 0 ? (
                        priorityAlerts.map(alert => (
                          <div 
                            key={alert.id}
                            className={`p-4 rounded-lg border flex items-start gap-3 ${
                              alert.type === 'urgent' ? 'bg-red-500/10 border-red-500/30' :
                              alert.type === 'warning' ? 'bg-amber-500/10 border-amber-500/30' :
                              alert.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30' :
                              'bg-blue-500/10 border-blue-500/30'
                            }`}
                          >
                            <div className={`p-1.5 rounded-full ${
                              alert.type === 'urgent' ? 'bg-red-500/20' :
                              alert.type === 'warning' ? 'bg-amber-500/20' :
                              alert.type === 'success' ? 'bg-emerald-500/20' :
                              'bg-blue-500/20'
                            }`}>
                              {alert.type === 'urgent' && <AlertTriangle className="h-4 w-4 text-red-400" />}
                              {alert.type === 'warning' && <AlertTriangle className="h-4 w-4 text-amber-400" />}
                              {alert.type === 'success' && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                              {alert.type === 'info' && <Clock className="h-4 w-4 text-blue-400" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-white">{alert.title}</p>
                              <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{alert.description}</p>
                            </div>
                            {alert.action && (
                              <Button asChild size="sm" variant="ghost" className="shrink-0 text-slate-300 hover:text-white h-9 px-3 text-sm">
                                <Link href={alert.action.href}>
                                  {alert.action.label}
                                  <ChevronRight className="h-4 w-4 ml-1" />
                                </Link>
                              </Button>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-slate-400">
                          <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-emerald-400/50" />
                          <p className="text-sm">All caught up!</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Do This Next */}
                  <Card className="bg-slate-800/50 border-slate-700/50">
                    <CardHeader className="p-5 sm:p-6 pb-3">
                      <CardTitle className="text-lg text-white flex items-center gap-2">
                        <Zap className="h-5 w-5 text-amber-400" />
                        Do This Next
                      </CardTitle>
                      <CardDescription className="text-slate-400 text-sm">
                        Grow your group
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 sm:space-y-4 p-5 sm:p-6 pt-0">
                      {nextActions.length > 0 ? (
                        nextActions.map((action, index) => (
                          <Link key={action.id} href={action.href}>
                            <div className="p-4 rounded-lg bg-slate-700/30 border border-slate-600/30 hover:bg-slate-700/50 hover:border-slate-500/50 transition-all cursor-pointer group">
                              <div className="flex items-center gap-4">
                                <div className="flex items-center justify-center h-10 w-10 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 text-amber-400 shrink-0">
                                  <span className="text-lg font-bold">{index + 1}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-white group-hover:text-amber-300 transition-colors line-clamp-1">
                                    {action.label}
                                  </p>
                                  <p className="text-xs text-slate-400 line-clamp-1">{action.description}</p>
                                </div>
                                <ArrowRight className="h-5 w-5 text-slate-500 group-hover:text-amber-400 transition-colors shrink-0" />
                              </div>
                            </div>
                          </Link>
                        ))
                      ) : (
                        <div className="text-center py-8 text-slate-400">
                          <Target className="h-12 w-12 mx-auto mb-3 text-slate-500" />
                          <p className="text-sm">All set!</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Quick Event Overview */}
                {metrics?.upcomingEvents && metrics.upcomingEvents.length > 0 && (
                  <Card className="bg-slate-800/50 border-slate-700/50">
                    <CardHeader className="p-5 sm:p-6 pb-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <CardTitle className="text-lg text-white flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-purple-400" />
                            Upcoming Events
                          </CardTitle>
                          <CardDescription className="text-slate-400 text-sm">
                            Next scheduled
                          </CardDescription>
                        </div>
                        <Button asChild size="sm" variant="outline" className="border-slate-600 text-slate-200 hover:bg-slate-700 h-9 px-4 text-sm">
                          <Link href={`/create-event?groupId=${id}`}>
                            <Plus className="h-4 w-4 mr-2" />
                            Create
                          </Link>
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-5 sm:p-6 pt-0">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                        {metrics.upcomingEvents.slice(0, 3).map((event: any) => (
                          <Link key={event.id} href={`/events/${event.slug || event.id}`}>
                            <div className="p-4 rounded-lg bg-slate-700/30 border border-slate-600/30 hover:bg-slate-700/50 transition-all cursor-pointer">
                              <h4 className="font-medium text-white truncate text-sm sm:text-base">{event.title}</h4>
                              <p className="text-sm text-slate-400 mt-1 line-clamp-1">
                                {formatDate(event.datetime)}
                              </p>
                              <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
                                <span className="flex items-center gap-1">
                                  <UserCheck className="h-3.5 w-3.5" />
                                  {event.goingCount || 0} going
                                </span>
                                {event.ticketingEnabled && (
                                  <span className="flex items-center gap-1">
                                    <Ticket className="h-3.5 w-3.5" />
                                    ₹{event.ticketPrice}
                                  </span>
                                )}
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Events Intelligence Tab */}
              <TabsContent value="events-intelligence" className="space-y-6">
                <EventsIntelligence 
                  events={events || []} 
                  groupId={Number(id)} 
                  analytics={analytics}
                />
              </TabsContent>

              {/* Financial Intelligence Tab */}
              <TabsContent value="financial-intelligence" className="space-y-6">
                <FinancialIntelligence 
                  data={financialData}
                  events={events || []}
                />
              </TabsContent>

              {/* Event Quality Tab */}
              <TabsContent value="community-health" className="space-y-6">
                <CommunityHealthDiagnostics 
                  data={communityHealthData}
                  groupId={group?.id || 0}
                />
              </TabsContent>

              <TabsContent value="member-intelligence" className="space-y-6">
                <MemberIntelligence 
                  data={memberIntelligenceData}
                  groupId={group?.id || 0}
                />
              </TabsContent>
            </Tabs>
          </div>
        </main>
        <MobileNav />
      </div>
    </SimpleBackground>
  );
}

// Events Intelligence Component
function EventsIntelligence({ 
  events, 
  groupId,
  analytics 
}: { 
  events: any[]; 
  groupId: number;
  analytics?: any;
}) {
  const now = new Date();
  
  // Separate past and future events
  const pastEvents = events
    .filter(e => new Date(e.datetime) <= now)
    .sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime());
  
  const upcomingEvents = events
    .filter(e => new Date(e.datetime) > now)
    .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());

  // Calculate event stats
  const eventStats = useMemo(() => {
    if (pastEvents.length === 0) return null;

    const totalRsvps = pastEvents.reduce((sum, e) => sum + (e.goingCount || 0), 0);
    const avgAttendance = totalRsvps / pastEvents.length;
    
    // Find best performing event
    const bestEvent = pastEvents.reduce((best, current) => 
      (current.goingCount || 0) > (best.goingCount || 0) ? current : best
    , pastEvents[0]);

    return {
      totalEvents: pastEvents.length,
      totalRsvps,
      avgAttendance: Math.round(avgAttendance * 10) / 10,
      bestEvent
    };
  }, [pastEvents]);

  // Event funnel data (from analytics)
  const funnelData = analytics?.eventFunnel || null;

  // Recent events for performance tracking (last 5)
  const recentPastEvents = pastEvents.slice(0, 5);

  // Events ending within 48 hours for post-event summary
  const recentlyEndedEvents = pastEvents.filter(e => {
    const eventDate = new Date(e.datetime);
    const hoursSince = (now.getTime() - eventDate.getTime()) / (1000 * 60 * 60);
    return hoursSince <= 48 && hoursSince > 0;
  });

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-700/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 font-medium">Total Events</p>
                <p className="text-3xl font-bold text-white mt-1">{events.length}</p>
                <p className="text-xs text-slate-400 mt-1">
                  {upcomingEvents.length} upcoming
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-700/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 font-medium">Total RSVPs</p>
                <p className="text-3xl font-bold text-white mt-1">{eventStats?.totalRsvps || 0}</p>
                <p className="text-xs text-slate-400 mt-1">across all events</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <UserCheck className="h-6 w-6 text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-700/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 font-medium">Avg RSVPs</p>
                <p className="text-3xl font-bold text-white mt-1">{eventStats?.avgAttendance || 0}</p>
                <p className="text-xs text-slate-400 mt-1">per event</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-700/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 font-medium">Most Popular</p>
                <p className="text-lg font-bold text-white mt-1 truncate max-w-[140px]">
                  {eventStats?.bestEvent?.title || 'N/A'}
                </p>
                <p className="text-xs text-emerald-400 mt-1">
                  {eventStats?.bestEvent?.goingCount || 0} RSVPs
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                <Target className="h-6 w-6 text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Event Stats - Views to RSVP */}
      {funnelData && funnelData.views > 0 && (
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <Eye className="h-5 w-5 text-cyan-400" />
              Event Engagement (Last 30 Days)
            </CardTitle>
            <CardDescription className="text-slate-400">
              Views to RSVP conversion
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center gap-8">
              {/* Views */}
              <div className="text-center">
                <div className="h-24 w-32 bg-cyan-500/20 rounded-lg flex items-center justify-center mb-2">
                  <div>
                    <Eye className="h-8 w-8 text-cyan-400 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-white">{funnelData.views || 0}</p>
                  </div>
                </div>
                <p className="text-sm text-slate-400">Event Views</p>
              </div>

              <ArrowRight className="h-6 w-6 text-slate-500" />

              {/* RSVPs */}
              <div className="text-center">
                <div className="h-24 w-32 bg-emerald-500/20 rounded-lg flex items-center justify-center mb-2">
                  <div>
                    <UserCheck className="h-8 w-8 text-emerald-400 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-white">{funnelData.rsvps || 0}</p>
                  </div>
                </div>
                <p className="text-sm text-slate-400">RSVPs</p>
                <p className="text-xs text-emerald-400">
                  {funnelData.views > 0 ? Math.round((funnelData.rsvps / funnelData.views) * 100) : 0}% conversion
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Post-Event Performance (48h window) */}
      {recentlyEndedEvents.length > 0 && (
        <Card className="bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border-emerald-500/30">
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              Post-Event Summary
            </CardTitle>
            <CardDescription className="text-slate-400">
              Events that just happened (within 48 hours)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentlyEndedEvents.map(event => (
                <div key={event.id} className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium text-white">{event.title}</h4>
                      <p className="text-sm text-slate-400 mt-1">
                        {new Date(event.datetime).toLocaleDateString(undefined, {
                          weekday: 'long',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                    <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                      Completed
                    </Badge>
                  </div>
                  <div className="flex items-center gap-6 mt-4 text-sm">
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-emerald-400" />
                      <span className="text-white font-medium">{event.goingCount || 0}</span>
                      <span className="text-slate-400">RSVPs</span>
                    </div>
                    {event.ticketingEnabled && (
                      <div className="flex items-center gap-2">
                        <Ticket className="h-4 w-4 text-amber-400" />
                        <span className="text-white font-medium">₹{(event.goingCount || 0) * (event.ticketPrice || 0)}</span>
                        <span className="text-slate-400">revenue</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Event Performance Comparison */}
      {recentPastEvents.length > 0 && (
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-400" />
              Event Performance
            </CardTitle>
            <CardDescription className="text-slate-400">
              Compare RSVPs across your recent events
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentPastEvents.map((event, index) => {
                const maxRsvps = Math.max(...recentPastEvents.map(e => e.goingCount || 1));
                const percentage = ((event.goingCount || 0) / maxRsvps) * 100;
                
                return (
                  <div key={event.id} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white font-medium truncate max-w-[200px]">{event.title}</span>
                      <span className="text-slate-400">{event.goingCount || 0} RSVPs</span>
                    </div>
                    <div className="relative">
                      <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all ${
                            index === 0 ? 'bg-gradient-to-r from-blue-500 to-cyan-500' :
                            'bg-gradient-to-r from-slate-500 to-slate-400'
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Events - Quick Actions */}
      {upcomingEvents.length > 0 && (
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-400" />
              Upcoming Events Performance
            </CardTitle>
            <CardDescription className="text-slate-400">
              Track RSVPs and engagement for future events
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {upcomingEvents.slice(0, 4).map(event => {
                const eventDate = new Date(event.datetime);
                const daysUntil = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                const capacityUsed = event.maxGuests ? ((event.goingCount || 0) / event.maxGuests) * 100 : 0;
                
                return (
                  <Link key={event.id} href={`/events/${event.slug || event.id}`}>
                    <div className="p-4 rounded-lg bg-slate-700/30 border border-slate-600/30 hover:bg-slate-700/50 transition-all cursor-pointer">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-medium text-white">{event.title}</h4>
                          <p className="text-sm text-slate-400 mt-0.5">
                            {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `In ${daysUntil} days`}
                          </p>
                        </div>
                        {daysUntil <= 3 && (
                          <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30">
                            Soon
                          </Badge>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-400">RSVPs</span>
                          <span className="text-white font-medium">
                            {event.goingCount || 0}
                            {event.maxGuests && ` / ${event.maxGuests}`}
                          </span>
                        </div>
                        {event.maxGuests && (
                          <Progress value={capacityUsed} className="h-2 bg-slate-700" />
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {events.length === 0 && (
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardContent className="py-16 text-center">
            <Calendar className="h-16 w-16 text-slate-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No events yet</h3>
            <p className="text-slate-400 mb-6">Create your first event to start seeing analytics</p>
            <Button asChild className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600">
              <Link href={`/create-event?groupId=${id}`}>Create Your First Event</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Financial Intelligence Component
function FinancialIntelligence({ 
  data,
  events 
}: { 
  data?: any;
  events: any[];
}) {
  if (!data) {
    return (
      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardContent className="py-16 text-center">
          <Wallet className="h-16 w-16 text-slate-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Loading financial data...</h3>
          <p className="text-slate-400">Please wait while we fetch your analytics</p>
        </CardContent>
      </Card>
    );
  }

  const { revenue, payments, refunds, ticketedEvents } = data;
  const hasTicketedEvents = ticketedEvents?.count > 0;

  return (
    <div className="space-y-6">
      {/* Revenue Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <Card className="bg-gradient-to-br from-emerald-900/50 to-green-900/50 border-emerald-700/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-emerald-300/80 font-medium">Total Revenue</p>
                <p className="text-3xl font-bold text-white mt-1">₹{revenue?.total?.toLocaleString() || 0}</p>
                {revenue?.trend !== undefined && (
                  <p className={`text-xs mt-1 flex items-center gap-1 ${
                    revenue.trend >= 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {revenue.trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {revenue.trend >= 0 ? '+' : ''}{Math.round(revenue.trend)}% vs last month
                  </p>
                )}
              </div>
              <div className="h-12 w-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Revenue (30 days) */}
        <Card className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-700/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 font-medium">Last 30 Days</p>
                <p className="text-3xl font-bold text-white mt-1">₹{revenue?.recent?.toLocaleString() || 0}</p>
                <p className="text-xs text-slate-400 mt-1">
                  Previous: ₹{revenue?.previous?.toLocaleString() || 0}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Host Earnings */}
        <Card className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-700/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 font-medium">Host Earnings</p>
                <p className="text-3xl font-bold text-white mt-1">₹{revenue?.hostEarnings?.toLocaleString() || 0}</p>
                <p className="text-xs text-slate-400 mt-1">
                  After platform fees
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                <Wallet className="h-6 w-6 text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending Revenue */}
        <Card className="bg-gradient-to-br from-purple-900/50 to-indigo-900/50 border-purple-700/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-300/80 font-medium">Pending Payments</p>
                <p className="text-3xl font-bold text-white mt-1">₹{revenue?.pending?.toLocaleString() || 0}</p>
                <p className="text-xs text-purple-300/60 mt-1">
                  From {ticketedEvents?.upcomingPaid || 0} upcoming events
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Clock className="h-6 w-6 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Health Monitor */}
      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-blue-400" />
            Payment Health Monitor
          </CardTitle>
          <CardDescription className="text-slate-400">
            Track payment success rates and identify issues
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Success Rate */}
            <div className="p-4 rounded-lg bg-slate-700/30 border border-slate-600/30">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span className="text-sm text-slate-400">Success Rate</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {Math.round(payments?.successRate || 0)}%
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {payments?.successful || 0} of {payments?.total || 0}
              </p>
            </div>

            {/* Stuck Payments */}
            <div className={`p-4 rounded-lg border ${
              (payments?.stuck || 0) > 0 
                ? 'bg-amber-500/10 border-amber-500/30' 
                : 'bg-slate-700/30 border-slate-600/30'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <Timer className={`h-4 w-4 ${(payments?.stuck || 0) > 0 ? 'text-amber-400' : 'text-slate-400'}`} />
                <span className="text-sm text-slate-400">Stuck Payments</span>
              </div>
              <p className={`text-2xl font-bold ${(payments?.stuck || 0) > 0 ? 'text-amber-400' : 'text-white'}`}>
                {payments?.stuck || 0}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {(payments?.stuck || 0) > 0 ? 'Needs attention' : 'All clear'}
              </p>
            </div>

            {/* Failed Payments */}
            <div className={`p-4 rounded-lg border ${
              (payments?.failed || 0) > 0 
                ? 'bg-red-500/10 border-red-500/30' 
                : 'bg-slate-700/30 border-slate-600/30'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <Ban className={`h-4 w-4 ${(payments?.failed || 0) > 0 ? 'text-red-400' : 'text-slate-400'}`} />
                <span className="text-sm text-slate-400">Failed</span>
              </div>
              <p className={`text-2xl font-bold ${(payments?.failed || 0) > 0 ? 'text-red-400' : 'text-white'}`}>
                {payments?.failed || 0}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Total failed payments
              </p>
            </div>

            {/* Refunds */}
            <div className="p-4 rounded-lg bg-slate-700/30 border border-slate-600/30">
              <div className="flex items-center gap-2 mb-2">
                <RefreshCcw className="h-4 w-4 text-slate-400" />
                <span className="text-sm text-slate-400">Refund Rate</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {Math.round(refunds?.rate || 0)}%
              </p>
              <p className="text-xs text-slate-500 mt-1">
                ₹{refunds?.total?.toLocaleString() || 0} refunded
              </p>
            </div>
          </div>

          {/* Payment Methods Breakdown */}
          {payments?.methods && Object.keys(payments.methods).length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-medium text-slate-300 mb-3">Payment Methods</h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(payments.methods).map(([method, count]) => (
                  <Badge 
                    key={method} 
                    className="bg-slate-700/50 text-slate-300 border-slate-600/50 px-3 py-1"
                  >
                    {method}: {count as number}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Revenue by Event */}
      {hasTicketedEvents && ticketedEvents?.revenueByEvent?.length > 0 && (
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <Receipt className="h-5 w-5 text-emerald-400" />
              Ticketed Events Performance
            </CardTitle>
            <CardDescription className="text-slate-400">
              Revenue breakdown by event
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {ticketedEvents.revenueByEvent.map((event: any, index: number) => {
                const maxRevenue = Math.max(...ticketedEvents.revenueByEvent.map((e: any) => e.revenue || 1));
                const percentage = ((event.revenue || 0) / maxRevenue) * 100;
                
                return (
                  <div key={event.eventId} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white font-medium truncate max-w-[200px]">{event.title}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-slate-400">{event.ticketsSold} tickets</span>
                        <span className="text-emerald-400 font-medium">₹{event.revenue?.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="relative">
                      <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-500 transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state for no ticketed events */}
      {!hasTicketedEvents && (
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardContent className="py-12 text-center">
            <Ticket className="h-12 w-12 text-slate-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No ticketed events yet</h3>
            <p className="text-slate-400 mb-4">Start selling tickets to see financial analytics</p>
            <Button asChild variant="outline" className="border-slate-600 text-slate-200 hover:bg-slate-700">
              <Link href={`/create-event?groupId=${id}`}>Create Ticketed Event</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Community Insights Component (renamed from Health Diagnostics)
function CommunityHealthDiagnostics({ 
  data,
  groupId
}: { 
  data: any;
  groupId: number;
}) {
  if (!data) {
    return (
      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardContent className="py-12 text-center">
          <BarChart3 className="h-12 w-12 text-slate-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Loading community insights...</h3>
        </CardContent>
      </Card>
    );
  }

  const { eventPatterns, memberJoinPatterns, eventTypeStats } = data;

  return (
    <div className="space-y-6">
      {/* Event Timing Patterns */}
      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-cyan-400" />
            Event Timing Patterns
          </CardTitle>
          <CardDescription className="text-slate-400">
            When your events are scheduled
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Events by Day of Week */}
          <div>
            <p className="text-sm font-medium text-slate-300 mb-2">Events by Day</p>
            <div className="flex gap-1">
              {eventPatterns?.byDay?.map((day: any, index: number) => {
                const maxEvents = Math.max(...(eventPatterns.byDay?.map((d: any) => d.count) || [1]));
                const intensity = day.count / maxEvents;
                
                return (
                  <div 
                    key={index}
                    className="flex-1 text-center p-2 rounded bg-slate-700/50"
                  >
                    <div className="text-xs text-slate-400">{day.name?.slice(0, 3)}</div>
                    <div 
                      className="text-sm font-semibold"
                      style={{ color: intensity > 0.5 ? '#22c55e' : intensity > 0 ? '#eab308' : '#64748b' }}
                    >
                      {day.count}
                    </div>
                  </div>
                );
              }) || (
                <p className="text-slate-400 text-sm">No data available</p>
              )}
            </div>
          </div>

          {/* Events by Month */}
          {eventPatterns?.byMonth && eventPatterns.byMonth.length > 0 && (
            <div>
              <p className="text-sm font-medium text-slate-300 mb-2">Events by Month</p>
              <div className="grid grid-cols-6 gap-1">
                {eventPatterns.byMonth.map((month: any, index: number) => (
                  <div 
                    key={index}
                    className="text-center p-2 rounded bg-slate-700/50"
                  >
                    <div className="text-xs text-slate-400">{month.name?.slice(0, 3)}</div>
                    <div 
                      className="text-sm font-semibold"
                      style={{ color: month.count > 2 ? '#22c55e' : month.count > 0 ? '#eab308' : '#64748b' }}
                    >
                      {month.count}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Event Types */}
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-400" />
              Event Type Breakdown
            </CardTitle>
            <CardDescription className="text-slate-400">
              RSVPs by event category
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {eventTypeStats && eventTypeStats.length > 0 ? (
              eventTypeStats.map((type: any, index: number) => (
                <div 
                  key={index}
                  className="p-3 rounded-lg bg-slate-700/30 border border-slate-600/30"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-white">{type.type || 'General'}</span>
                    <Badge variant="outline" className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                      {type.count} events
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-slate-400">Total RSVPs</span>
                      <p className="text-white font-medium">{type.totalRsvps || 0}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Avg RSVPs</span>
                      <p className="text-emerald-400 font-medium">{type.avgRsvps || 0}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-400 text-center py-4">Host more events to see breakdown</p>
            )}
          </CardContent>
        </Card>

        {/* Member Join Patterns */}
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-blue-400" />
              Member Join Patterns
            </CardTitle>
            <CardDescription className="text-slate-400">
              When members are joining
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {memberJoinPatterns && memberJoinPatterns.length > 0 ? (
              memberJoinPatterns.slice(0, 6).map((month: any, index: number) => {
                const maxJoins = Math.max(...memberJoinPatterns.map((m: any) => m.count || 1));
                const percentage = ((month.count || 0) / maxJoins) * 100;
                
                return (
                  <div key={index} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-300">{month.month}</span>
                      <span className="text-white font-medium">{month.count} joined</span>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-slate-400 text-center py-4">No join data available</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-700/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 font-medium">Total Events</p>
                <p className="text-3xl font-bold text-white mt-1">{eventPatterns?.totalEvents || 0}</p>
                <p className="text-xs text-slate-400 mt-1">all time</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-700/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 font-medium">Total RSVPs</p>
                <p className="text-3xl font-bold text-white mt-1">{eventPatterns?.totalRsvps || 0}</p>
                <p className="text-xs text-slate-400 mt-1">across all events</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Ticket className="h-6 w-6 text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-700/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 font-medium">Avg RSVPs/Event</p>
                <p className="text-3xl font-bold text-white mt-1">{eventPatterns?.avgRsvpsPerEvent || 0}</p>
                <p className="text-xs text-slate-400 mt-1">average</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Empty state */}
      {(!eventPatterns?.totalEvents || eventPatterns.totalEvents === 0) && (
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 text-slate-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Not enough data yet</h3>
            <p className="text-slate-400 mb-4">Create events to see community insights</p>
            <Button asChild variant="outline" className="border-slate-600 text-slate-200 hover:bg-slate-700">
              <Link href={`/create-event?groupId=${id}`}>Create Event</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Member Intelligence Component
function MemberIntelligence({ 
  data,
  groupId
}: { 
  data: any;
  groupId: number;
}) {
  if (!data) {
    return (
      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardContent className="py-12 text-center">
          <Users className="h-12 w-12 text-slate-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Loading member data...</h3>
        </CardContent>
      </Card>
    );
  }

  const { memberStats, topRsvpers, recentMembers, memberGrowth } = data;

  return (
    <div className="space-y-6">
      {/* Member Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-600/20 to-cyan-600/20 border-blue-500/30">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-300 font-medium">New This Month</p>
                <p className="text-3xl font-bold text-white mt-1">{memberStats?.newThisMonth || 0}</p>
              </div>
              <UserPlus className="h-8 w-8 text-blue-400" />
            </div>
            {memberStats?.previousMonth !== undefined && (
              <p className="text-xs text-slate-400 mt-2">
                Last month: {memberStats.previousMonth}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-600/20 to-green-600/20 border-emerald-500/30">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-emerald-300 font-medium">Total Members</p>
                <p className="text-3xl font-bold text-white mt-1">{memberStats?.total || 0}</p>
              </div>
              <Users className="h-8 w-8 text-emerald-400" />
            </div>
            <p className="text-xs text-slate-400 mt-2">Active community members</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-600/20 to-orange-600/20 border-amber-500/30">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-300 font-medium">Avg. Tenure</p>
                <p className="text-3xl font-bold text-white mt-1">{memberStats?.avgTenureDays || 0}</p>
              </div>
              <Clock className="h-8 w-8 text-amber-400" />
            </div>
            <p className="text-xs text-slate-400 mt-2">Days as member</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top RSVPers - Members with Most RSVPs */}
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-400" />
              Most Active Members
            </CardTitle>
            <CardDescription className="text-slate-400">
              Members with the most RSVPs
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {topRsvpers && topRsvpers.length > 0 ? (
              topRsvpers.map((member: any, index: number) => (
                <div 
                  key={index}
                  className="flex items-center gap-3 p-3 rounded-lg bg-slate-700/30 border border-slate-600/30"
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    index === 0 ? 'bg-amber-500 text-amber-900' :
                    index === 1 ? 'bg-slate-300 text-slate-800' :
                    index === 2 ? 'bg-amber-700 text-amber-100' :
                    'bg-slate-600 text-slate-200'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-white">{member.name || member.email?.split('@')[0] || 'Member'}</p>
                    <p className="text-xs text-slate-400">Joined {member.joinedAgo}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-emerald-400">{member.rsvpCount}</div>
                    <p className="text-xs text-slate-400">RSVPs</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-400 text-center py-4">No RSVP data yet</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Members */}
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-blue-400" />
              Recent Members
            </CardTitle>
            <CardDescription className="text-slate-400">
              Newest members to join your community
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentMembers && recentMembers.length > 0 ? (
              recentMembers.map((member: any, index: number) => (
                <div 
                  key={index}
                  className="flex items-center gap-3 p-3 rounded-lg bg-slate-700/30 border border-slate-600/30"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <Users className="h-4 w-4 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-white">{member.name || member.email?.split('@')[0] || 'Member'}</p>
                    <p className="text-xs text-slate-400">Joined {member.joinedAgo}</p>
                  </div>
                  {member.rsvpCount > 0 && (
                    <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                      {member.rsvpCount} RSVPs
                    </Badge>
                  )}
                </div>
              ))
            ) : (
              <p className="text-slate-400 text-center py-4">No recent members</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Member Growth Over Time */}
      {memberGrowth && memberGrowth.length > 0 && (
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-400" />
              Member Growth
            </CardTitle>
            <CardDescription className="text-slate-400">
              New members per month
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {memberGrowth.slice(0, 6).map((month: any, index: number) => {
                const maxJoins = Math.max(...memberGrowth.map((m: any) => m.count || 1));
                const percentage = ((month.count || 0) / maxJoins) * 100;
                
                return (
                  <div key={index} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-300">{month.month}</span>
                      <span className="text-white font-medium">{month.count} members</span>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {(!topRsvpers || topRsvpers.length === 0) && (!recentMembers || recentMembers.length === 0) && (
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 text-slate-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Not enough member data</h3>
            <p className="text-slate-400">Invite more members to see analytics</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
