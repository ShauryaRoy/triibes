import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  ArrowLeft,
  Calendar,
  Clock3,
  Compass,
  LayoutDashboard,
  Lock,
  MapPin,
  ShieldAlert,
  Sparkles,
  Ticket,
  UserCheck,
  Users,
  UsersRound,
  Settings,
  LineChart as LineChartIcon,
} from "lucide-react";
import Header from "@/components/layout/header";
import MobileNav from "@/components/layout/mobile-nav";
import { SimpleBackground } from "@/components/simple-background";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  CartesianGrid,
  XAxis,
  YAxis,
  BarChart,
  Bar,
  LineChart,
  Line,
} from "recharts";

function formatDateTime(dateInput?: string | null) {
  if (!dateInput) return "Not set";
  const date = new Date(dateInput);
  return date.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getStatusTone(status: string) {
  if (status === "going") return "text-emerald-200 bg-emerald-500/15 border-emerald-300/25";
  if (status === "maybe") return "text-amber-200 bg-amber-500/15 border-amber-300/25";
  if (status === "not_going") return "text-rose-200 bg-rose-500/15 border-rose-300/25";
  return "text-white/80 bg-white/10 border-white/20";
}

type FormQuestion = {
  id: string;
  label: string;
  type: "text" | "textarea" | "select";
  required?: boolean;
  options?: string[];
};

export default function EventDashboardPage() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState<"overview" | "metrics" | "questions" | "applications" | "approved_pending" | "registered" | "settings">("overview");
  const [settingsPanel, setSettingsPanel] = useState<"rsvp" | "privacy" | "setting" | "discover">("rsvp");
  const [discoverRequestMessage, setDiscoverRequestMessage] = useState("");
  const [settingsDraft, setSettingsDraft] = useState<{
    rsvpMode: "rsvp" | "register";
    entryMode: "open" | "approval" | "invite_only";
    guestListVisibility: "host-only" | "attendees-only" | "everyone";
    showGuestCount: boolean;
    isClosed: boolean;
  }>({
    rsvpMode: "register",
    entryMode: "open",
    guestListVisibility: "everyone",
    showGuestCount: true,
    isClosed: false,
  });
  const [questionDraft, setQuestionDraft] = useState<FormQuestion[]>([]);

  const handleGoBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
      return;
    }
    setLocation(`/events/${event?.slug || event?.id || id}`);
  };

  const { data: event, isLoading, error } = useQuery<any>({
    queryKey: [`/api/events/${id}`],
    queryFn: async () => {
      const response = await fetch(`/api/events/${id}`, { credentials: "include" });
      if (!response.ok) {
        throw new Error("Failed to fetch event");
      }
      return response.json();
    },
    enabled: !!id,
  });

  const isHost = user && event && String(user.id) === String(event.hostId);

  const { data: rsvps = [] } = useQuery<any[]>({
    queryKey: [`/api/events/${event?.id}/rsvps`],
    enabled: !!event?.id && !!isHost,
  });

  const { data: applications = [] } = useQuery<any[]>({
    queryKey: [`/api/events/${event?.id}/applications`],
    enabled: !!event?.id && !!isHost,
    queryFn: async () => {
      const response = await fetch(`/api/events/${event.id}/applications`, { credentials: "include" });
      if (!response.ok) return [];
      return response.json();
    },
  });

  const reviewApplicationMutation = useMutation({
    mutationFn: async ({ applicationId, action }: { applicationId: number; action: "approve" | "reject" }) => {
      const response = await fetch(`/api/events/${event.id}/applications/${applicationId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error?.message || "Failed to update application");
      }

      return response.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${event?.id}/applications`] });
      queryClient.invalidateQueries({ queryKey: [`/api/events/${event?.id}`] });
      toast({
        title: variables.action === "approve" ? "Application approved" : "Application rejected",
        description: "The decision has been saved.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const saveQuestionsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/events/${event.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          entryMode: "approval",
          formSchema: questionDraft,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error?.message || "Failed to save questions");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/events/${event?.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/events/${event?.id}/applications`] });
      toast({
        title: "Questions saved",
        description: "Application questions were updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Save failed",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const sendReminderMutation = useMutation({
    mutationFn: async ({ applicationId }: { applicationId: number }) => {
      const response = await fetch(`/api/events/${event.id}/applications/${applicationId}/send-reminder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error?.message || "Failed to send reminder email");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Reminder sent",
        description: "Reminder email was sent successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Send failed",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const saveSettingsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/events/${event.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          rsvpMode: settingsDraft.rsvpMode,
          entryMode: settingsDraft.entryMode,
          guestListVisibility: settingsDraft.guestListVisibility,
          showGuestCount: settingsDraft.showGuestCount,
          isClosed: settingsDraft.isClosed,
          formSchema: settingsDraft.entryMode === "approval" ? questionDraft : [],
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error?.message || "Failed to save settings");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/events/${event?.id}`] });
      toast({
        title: "Settings saved",
        description: "Event settings were updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Save failed",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const requestDiscoverMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/events/${event.id}/request-discover`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: discoverRequestMessage }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Failed to request discover access");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/events/${event?.id}`] });
      setDiscoverRequestMessage("");
      toast({
        title: "Request submitted",
        description: "Discover page request sent for review.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Request failed",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const cancelDiscoverMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/events/${event.id}/cancel-discover-request`, {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Failed to cancel request");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/events/${event?.id}`] });
      toast({
        title: "Request cancelled",
        description: "Discover page request has been cancelled.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Cancel failed",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const dashboardStats = useMemo(() => {
    if (!event) return null;

    const cap = event.maxCapacity ?? event.maxGuests ?? null;
    const goingByRsvp = rsvps.filter((item) => item.status === "going").length;
    const current = goingByRsvp || event.currentCapacity || event.goingCount || 0;
    const occupancy = cap && cap > 0 ? Math.min(100, Math.round((current / cap) * 100)) : null;
    const pendingApplications = applications.filter((item) => item.status === "pending").length;
    const maybeCount = rsvps.filter((item) => item.status === "maybe").length;
    const notGoingCount = rsvps.filter((item) => item.status === "not_going").length;
    const estimatedRevenue = Number(event.ticketPrice || 0) * current;
    const start = event.datetime ? new Date(event.datetime) : null;
    const end = event.endDatetime ? new Date(event.endDatetime) : null;

    let durationHours: number | null = null;
    if (start && end && end > start) {
      durationHours = Number(((end.getTime() - start.getTime()) / (1000 * 60 * 60)).toFixed(1));
    }

    return {
      current,
      cap,
      occupancy,
      pendingApplications,
      maybeCount,
      notGoingCount,
      estimatedRevenue,
      durationHours,
      entryMode: event.entryMode || "open",
      modeLabel: event.rsvpMode === "register" ? "Register" : "RSVP",
    };
  }, [event, rsvps, applications]);

  const metricData = useMemo(() => {
    const going = rsvps.filter((item) => item.status === "going").length;
    const maybe = rsvps.filter((item) => item.status === "maybe").length;
    const notGoing = rsvps.filter((item) => item.status === "not_going").length;

    const statusDistribution = [
      { name: "Going", value: going, color: "#34d399" },
      { name: "Maybe", value: maybe, color: "#fbbf24" },
      { name: "Not Going", value: notGoing, color: "#fb7185" },
    ];

    const today = new Date();
    const days = Array.from({ length: 7 }).map((_, index) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (6 - index));
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString(undefined, { weekday: "short" });
      return { key, label };
    });

    const countByDay: Record<string, number> = {};
    for (const item of rsvps) {
      const createdAt = item.createdAt ? new Date(item.createdAt) : null;
      if (!createdAt || Number.isNaN(createdAt.getTime())) {
        continue;
      }
      const key = createdAt.toISOString().slice(0, 10);
      countByDay[key] = (countByDay[key] || 0) + 1;
    }

    let cumulative = 0;
    const rsvpTrend = days.map((day) => {
      const added = countByDay[day.key] || 0;
      cumulative += added;
      return {
        day: day.label,
        added,
        cumulative,
      };
    });

    const cap = dashboardStats?.cap || 0;
    const current = dashboardStats?.current || 0;

    const capacityData = [
      { name: "Filled", value: current },
      { name: "Open", value: cap > current ? cap - current : 0 },
    ];

    return {
      statusDistribution,
      rsvpTrend,
      capacityData,
    };
  }, [rsvps, dashboardStats]);

  const questionLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    const schema = Array.isArray(event?.formSchema) ? event.formSchema : [];
    for (const q of schema) {
      if (q && typeof q.id === "string") {
        map.set(q.id, q.label || q.id);
      }
    }
    return map;
  }, [event?.formSchema]);

  const registeredGuests = useMemo(() => {
    return rsvps.filter((item) => item.status === "going");
  }, [rsvps]);

  const rsvpStatusByUserId = useMemo(() => {
    const map = new Map<string, string>();
    for (const rsvp of rsvps) {
      map.set(String(rsvp.userId), String(rsvp.status || ""));
    }
    return map;
  }, [rsvps]);

  const approvedPendingGuests = useMemo(() => {
    const rsvpByUserId = new Map<string, any>();
    for (const rsvp of rsvps) {
      rsvpByUserId.set(String(rsvp.userId), rsvp);
    }

    return applications
      .filter((application) => application.status === "approved")
      .map((application) => {
        const userId = String(application.userId || application.user?.id || "");
        const rsvp = rsvpByUserId.get(userId);
        const rsvpStatus = rsvp?.status || null;
        return {
          application,
          rsvp,
          rsvpStatus,
        };
      })
      .filter((entry) => entry.rsvpStatus !== "going");
  }, [applications, rsvps]);

  const navItems = useMemo(() => {
    const items: Array<{ key: "overview" | "metrics" | "questions" | "applications" | "approved_pending" | "registered" | "settings"; label: string; icon: any }> = [
      { key: "overview", label: "Overview", icon: Compass },
      { key: "metrics", label: "Metrics", icon: LineChartIcon },
    ];

    if ((event?.entryMode || "open") === "approval") {
      items.push({ key: "questions", label: "Questions", icon: Settings });
      items.push({ key: "applications", label: "Applications", icon: UserCheck });
      items.push({ key: "approved_pending", label: "Approved Pending", icon: UsersRound });
    }

    items.push({ key: "registered", label: "Registered", icon: UsersRound });
    items.push({ key: "settings", label: "Settings", icon: Settings });
    return items;
  }, [event?.entryMode]);

  useEffect(() => {
    if ((event?.entryMode || "open") !== "approval" && activeSection === "questions") {
      setActiveSection("overview");
    }
    if ((event?.entryMode || "open") !== "approval" && activeSection === "applications") {
      setActiveSection("overview");
    }
    if ((event?.entryMode || "open") !== "approval" && activeSection === "approved_pending") {
      setActiveSection("overview");
    }
  }, [event?.entryMode, activeSection]);

  useEffect(() => {
    if (!event) return;
    setQuestionDraft(Array.isArray(event.formSchema) ? event.formSchema : []);
    setSettingsDraft({
      rsvpMode: event.rsvpMode || "register",
      entryMode: event.entryMode || "open",
      guestListVisibility: event.guestListVisibility || "everyone",
      showGuestCount: event.showGuestCount !== false,
      isClosed: Boolean(event.isClosed),
    });
  }, [event?.id, event?.rsvpMode, event?.entryMode, event?.guestListVisibility, event?.showGuestCount, event?.isClosed, event?.formSchema]);

  const isQuestionBuilderLocked = applications.length > 0;

  const addQuestion = () => {
    setQuestionDraft((prev) => [
      ...prev,
      {
        id: `q${Date.now()}`,
        label: "New question",
        type: "text",
        required: false,
      },
    ]);
  };

  const updateQuestion = (id: string, patch: Partial<FormQuestion>) => {
    setQuestionDraft((prev) => prev.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  };

  const deleteQuestion = (id: string) => {
    setQuestionDraft((prev) => prev.filter((q) => q.id !== id));
  };

  if (isLoading) {
    return (
      <SimpleBackground className="min-h-screen">
        <Header />
        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-24">
          <div className="rounded-3xl border border-white/15 bg-white/5 p-10 text-center text-white/70">
            Loading event dashboard...
          </div>
        </main>
        <MobileNav />
      </SimpleBackground>
    );
  }

  if (error || !event) {
    return (
      <SimpleBackground className="min-h-screen">
        <Header />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-24">
          <div className="rounded-3xl border border-red-400/30 bg-red-500/10 p-8 text-white">
            <h1 className="text-xl font-semibold">Event not found</h1>
            <p className="mt-2 text-sm text-white/80">This event could not be loaded for dashboard management.</p>
            <div className="mt-4">
              <Button onClick={() => setLocation("/")} variant="outline" className="border-white/30 text-white hover:bg-white/10">
                Go Home
              </Button>
            </div>
          </div>
        </main>
        <MobileNav />
      </SimpleBackground>
    );
  }

  if (!isHost) {
    return (
      <SimpleBackground className="min-h-screen">
        <Header />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-24">
          <div className="rounded-3xl border border-amber-400/30 bg-amber-500/10 p-8 text-white">
            <div className="flex items-center gap-2 text-amber-300">
              <ShieldAlert className="h-5 w-5" />
              Host access required
            </div>
            <p className="mt-2 text-sm text-white/80">Only the event host can open this dashboard.</p>
            <div className="mt-4">
              <Link href={`/events/${event.slug || event.id}`}>
                <Button variant="outline" className="border-white/30 text-white hover:bg-white/10">
                  Back to Event
                </Button>
              </Link>
            </div>
          </div>
        </main>
        <MobileNav />
      </SimpleBackground>
    );
  }

  return (
    <SimpleBackground className="min-h-screen">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_10%_10%,rgba(245,158,11,0.15),transparent_36%),radial-gradient(circle_at_90%_20%,rgba(56,189,248,0.18),transparent_38%),radial-gradient(circle_at_50%_100%,rgba(16,185,129,0.14),transparent_42%)]" />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_bottom,rgba(2,6,23,0.65),rgba(2,6,23,0.9))]" />
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 space-y-6">
        <section className="rounded-3xl border border-white/15 bg-black/35 backdrop-blur-xl p-5 sm:p-7 shadow-2xl shadow-black/40">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleGoBack}
                className="border-white/20 text-white hover:bg-white/10"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <h1 className="text-2xl sm:text-4xl font-semibold tracking-tight text-white flex items-center gap-2">
                <LayoutDashboard className="h-7 w-7 text-amber-300" />
                Host Command Center
              </h1>
              <p className="text-white/80 text-sm sm:text-base">{event.title}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge className="bg-cyan-500/20 text-cyan-100 border-cyan-300/30">{dashboardStats?.modeLabel} Mode</Badge>
              <Badge className="bg-amber-500/20 text-amber-100 border-amber-300/30">Entry: {dashboardStats?.entryMode}</Badge>
              <Badge className="bg-emerald-500/20 text-emerald-100 border-emerald-300/30">
                {event.isClosed ? "Closed" : "Open for joins"}
              </Badge>
              {dashboardStats && dashboardStats.occupancy !== null && (
                <Badge className="bg-blue-500/20 text-blue-100 border-blue-300/30">Occupancy {dashboardStats.occupancy}%</Badge>
              )}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            <Card className="border-white/15 bg-white/5 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-white/70 flex items-center gap-2">
                  <UsersRound className="h-4 w-4 text-cyan-300" />
                  Confirmed Attendees
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold">{dashboardStats?.current ?? 0}</p>
                <p className="text-xs text-white/60 mt-1">Going right now</p>
              </CardContent>
            </Card>

            <Card className="border-white/15 bg-white/5 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-white/70 flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-amber-300" />
                  Pending Applications
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold">{dashboardStats?.pendingApplications ?? 0}</p>
                <p className="text-xs text-white/60 mt-1">Awaiting host decision</p>
              </CardContent>
            </Card>

            <Card className="border-white/15 bg-white/5 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-white/70 flex items-center gap-2">
                  <Ticket className="h-4 w-4 text-emerald-300" />
                  Revenue Snapshot
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold">INR {(dashboardStats?.estimatedRevenue ?? 0).toLocaleString()}</p>
                <p className="text-xs text-white/60 mt-1">Estimated from confirmed attendees</p>
              </CardContent>
            </Card>

            <Card className="border-white/15 bg-white/5 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-white/70 flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-blue-300" />
                  Duration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold">{dashboardStats?.durationHours ?? "-"}{dashboardStats?.durationHours ? "h" : ""}</p>
                <p className="text-xs text-white/60 mt-1">Event runtime</p>
              </CardContent>
            </Card>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4 items-start">
          <aside className="lg:sticky lg:top-24 rounded-2xl border border-white/15 bg-black/35 backdrop-blur-xl p-3">
            <p className="text-xs uppercase tracking-[0.18em] text-white/50 px-3 py-2">Sections</p>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = activeSection === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => setActiveSection(item.key)}
                    className={`w-full flex items-center gap-2 rounded-xl px-3 py-2.5 text-left transition-colors ${
                      active
                        ? "bg-white/20 text-white border border-white/20"
                        : "text-white/70 hover:text-white hover:bg-white/10 border border-transparent"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>

          <section className="space-y-4">
            {activeSection === "overview" && (
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <Card className="xl:col-span-2 border-white/15 bg-black/25 text-white">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Compass className="h-5 w-5 text-cyan-300" />
                      Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div>
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-white/70">Capacity Usage</span>
                        <span className="text-white">
                          {dashboardStats?.current ?? 0}
                          {dashboardStats?.cap ? ` / ${dashboardStats.cap}` : ""}
                        </span>
                      </div>
                      <Progress value={dashboardStats?.occupancy ?? 0} className="h-2 bg-white/10" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="rounded-xl border border-white/15 bg-white/5 p-3">
                        <p className="text-xs text-white/60 uppercase tracking-wide">Start</p>
                        <p className="text-sm mt-1 flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-cyan-300" />
                          {formatDateTime(event.datetime)}
                        </p>
                      </div>
                      <div className="rounded-xl border border-white/15 bg-white/5 p-3">
                        <p className="text-xs text-white/60 uppercase tracking-wide">End</p>
                        <p className="text-sm mt-1 flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-amber-300" />
                          {formatDateTime(event.endDatetime)}
                        </p>
                      </div>
                      <div className="rounded-xl border border-white/15 bg-white/5 p-3">
                        <p className="text-xs text-white/60 uppercase tracking-wide">Location</p>
                        <p className="text-sm mt-1 flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-emerald-300" />
                          {event.location || "Location not specified"}
                        </p>
                      </div>
                      <div className="rounded-xl border border-white/15 bg-white/5 p-3">
                        <p className="text-xs text-white/60 uppercase tracking-wide">Discover</p>
                        <p className="text-sm mt-1 flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-violet-300" />
                          {event.discoverStatus || "not_requested"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-white/15 bg-black/25 text-white">
                  <CardHeader>
                    <CardTitle className="text-lg">Basic Business View</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="rounded-xl border border-emerald-300/25 bg-emerald-500/10 p-3">
                      <p className="text-emerald-100/70 text-xs uppercase">Revenue Earned</p>
                      <p className="text-xl font-semibold text-emerald-100 mt-1">
                        INR {(dashboardStats?.estimatedRevenue ?? 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="rounded-xl border border-blue-300/25 bg-blue-500/10 p-3">
                      <p className="text-blue-100/70 text-xs uppercase">Event Mode</p>
                      <p className="text-base font-semibold text-blue-100 mt-1">{dashboardStats?.modeLabel}</p>
                    </div>
                    <div className="rounded-xl border border-white/15 bg-white/5 p-3 text-xs text-white/70 flex items-start gap-2">
                      <Lock className="h-4 w-4 mt-0.5 text-white/70" />
                      Switch to Settings to control RSVP, privacy, discover, applications, and event closure.
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeSection === "metrics" && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <Card className="border-white/15 bg-black/25 text-white">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-cyan-300" />
                      RSVP Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="h-[320px] flex flex-col">
                    <div className="flex-1 min-h-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={metricData.statusDistribution}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={68}
                            outerRadius={105}
                            paddingAngle={3}
                          >
                            {metricData.statusDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              background: "rgba(2, 6, 23, 0.92)",
                              border: "1px solid rgba(255, 255, 255, 0.15)",
                              borderRadius: 12,
                              color: "#fff",
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center justify-center gap-3 text-xs text-white/90">
                      {metricData.statusDistribution.map((entry) => (
                        <div key={`legend-${entry.name}`} className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-2 py-1">
                          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                          <span>{entry.name}</span>
                          <span className="text-white/65">({entry.value})</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-white/15 bg-black/25 text-white">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <LineChartIcon className="h-5 w-5 text-amber-300" />
                      RSVP Trend (7 Days)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={metricData.rsvpTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.12)" />
                        <XAxis dataKey="day" stroke="rgba(255,255,255,0.65)" />
                        <YAxis stroke="rgba(255,255,255,0.65)" allowDecimals={false} />
                        <Tooltip
                          contentStyle={{
                            background: "rgba(2, 6, 23, 0.92)",
                            border: "1px solid rgba(255, 255, 255, 0.15)",
                            borderRadius: 12,
                            color: "#fff",
                          }}
                        />
                        <Line type="monotone" dataKey="added" stroke="#38bdf8" strokeWidth={2.5} dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="cumulative" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 2 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="xl:col-span-2 border-white/15 bg-black/25 text-white">
                  <CardHeader>
                    <CardTitle className="text-lg">Capacity Fill Chart</CardTitle>
                  </CardHeader>
                  <CardContent className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={metricData.capacityData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.12)" />
                        <XAxis dataKey="name" stroke="rgba(255,255,255,0.65)" />
                        <YAxis stroke="rgba(255,255,255,0.65)" allowDecimals={false} />
                        <Tooltip
                          contentStyle={{
                            background: "rgba(2, 6, 23, 0.92)",
                            border: "1px solid rgba(255, 255, 255, 0.15)",
                            borderRadius: 12,
                            color: "#fff",
                          }}
                        />
                        <Bar dataKey="value" fill="#2dd4bf" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeSection === "questions" && (event.entryMode || "open") === "approval" && (
              <Card className="border-white/15 bg-black/25 text-white">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Settings className="h-5 w-5 text-cyan-300" />
                    Application Questions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-white/80">Build the form applicants need to fill before approval.</p>
                    <Button
                      type="button"
                      size="sm"
                      onClick={addQuestion}
                      disabled={isQuestionBuilderLocked}
                      className="bg-cyan-600 hover:bg-cyan-500 text-white"
                    >
                      + Add Question
                    </Button>
                  </div>

                  {isQuestionBuilderLocked && (
                    <div className="rounded-lg border border-amber-300/30 bg-amber-500/10 p-3 text-xs text-amber-100">
                      Questions are locked because applications already exist for this event.
                    </div>
                  )}

                  {questionDraft.length === 0 && (
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
                      No questions yet. Add your first question.
                    </div>
                  )}

                  <div className="space-y-3">
                    {questionDraft.map((question) => (
                      <div key={question.id} className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-3">
                        <div className="flex items-center gap-2">
                          <Input
                            value={question.label}
                            onChange={(e) => updateQuestion(question.id, { label: e.target.value })}
                            disabled={isQuestionBuilderLocked}
                            className="bg-white/10 border-white/20 text-white"
                            placeholder="Question label"
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => deleteQuestion(question.id)}
                            disabled={isQuestionBuilderLocked}
                            className="border-red-400/50 text-red-300 hover:bg-red-500/20"
                          >
                            Remove
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <Select
                            value={question.type}
                            onValueChange={(value: "text" | "textarea" | "select") => {
                              if (isQuestionBuilderLocked) return;
                              updateQuestion(question.id, {
                                type: value,
                                options: value === "select" ? (question.options && question.options.length > 0 ? question.options : [""]) : undefined,
                              });
                            }}
                          >
                            <SelectTrigger className="bg-white/10 border-white/20 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-950 border-white/20">
                              <SelectItem value="text" className="text-white">Text</SelectItem>
                              <SelectItem value="textarea" className="text-white">Textarea</SelectItem>
                              <SelectItem value="select" className="text-white">Select</SelectItem>
                            </SelectContent>
                          </Select>

                          <div className="flex items-center justify-between rounded-md border border-white/20 px-3 py-2 text-sm text-white">
                            Required
                            <Switch
                              checked={Boolean(question.required)}
                              disabled={isQuestionBuilderLocked}
                              onCheckedChange={(checked) => updateQuestion(question.id, { required: checked })}
                            />
                          </div>
                        </div>

                        {question.type === "select" && (
                          <div className="space-y-2">
                            {((question.options && question.options.length > 0) ? question.options : [""]).map((option, optionIndex) => (
                              <div key={`${question.id}-option-${optionIndex}`} className="flex items-center gap-2">
                                <Input
                                  value={option}
                                  onChange={(e) => {
                                    const nextOptions = [...((question.options && question.options.length > 0) ? question.options : [""])];
                                    nextOptions[optionIndex] = e.target.value;
                                    updateQuestion(question.id, { options: nextOptions });
                                  }}
                                  disabled={isQuestionBuilderLocked}
                                  className="bg-white/10 border-white/20 text-white"
                                  placeholder={`Option ${optionIndex + 1}`}
                                />
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={isQuestionBuilderLocked || (((question.options && question.options.length > 0) ? question.options : [""]).length <= 1)}
                                  onClick={() => {
                                    const nextOptions = [...((question.options && question.options.length > 0) ? question.options : [""])];
                                    nextOptions.splice(optionIndex, 1);
                                    updateQuestion(question.id, { options: nextOptions.length > 0 ? nextOptions : [""] });
                                  }}
                                  className="border-red-400/40 text-red-300 hover:bg-red-500/20"
                                >
                                  Remove
                                </Button>
                              </div>
                            ))}

                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={isQuestionBuilderLocked}
                              onClick={() => {
                                const nextOptions = [...((question.options && question.options.length > 0) ? question.options : [""])];
                                nextOptions.push("");
                                updateQuestion(question.id, { options: nextOptions });
                              }}
                              className="border-white/20 text-white hover:bg-white/10"
                            >
                              + Add Option
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="pt-2">
                    <Button
                      onClick={() => saveQuestionsMutation.mutate()}
                      disabled={saveQuestionsMutation.isPending || isQuestionBuilderLocked}
                      className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:brightness-110"
                    >
                      Save Questions
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeSection === "applications" && (event.entryMode || "open") === "approval" && (
              <Card className="border-white/15 bg-black/25 text-white">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <UserCheck className="h-5 w-5 text-amber-300" />
                    Applications
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 max-h-[640px] overflow-auto pr-1">
                  {applications.length === 0 && (
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
                      No applications found for this event.
                    </div>
                  )}
                  {applications.map((application: any) => {
                    const fullName = `${application.user?.firstName || ""} ${application.user?.lastName || ""}`.trim() || "Applicant";
                    const responseEntries = Object.entries(application.responses || {});
                    const currentRsvpStatus = rsvpStatusByUserId.get(String(application.userId || application.user?.id || ""));
                    const isRegisteredGoing = currentRsvpStatus === "going";
                    return (
                      <div key={application.id} className="rounded-xl border border-white/10 bg-white/5 p-3 sm:p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium text-white">{fullName}</p>
                            <p className="text-xs text-white/60">{application.user?.email || "No email"}</p>
                          </div>
                          <span className={`text-xs border rounded-full px-2 py-1 capitalize w-fit ${getStatusTone(application.status)}`}>
                            {String(application.status || "unknown").replace("_", " ")}
                          </span>
                        </div>

                        <div className="mt-3 rounded-lg border border-white/10 bg-black/20 p-3">
                          <p className="text-[11px] uppercase tracking-wide text-white/50 mb-2">Submitted Details</p>
                          {responseEntries.length === 0 ? (
                            <p className="text-xs text-white/60">No responses submitted.</p>
                          ) : (
                            <div className="space-y-2">
                              {responseEntries.map(([key, value]) => (
                                <div key={key} className="rounded-md border border-white/10 bg-white/5 p-2">
                                  <p className="text-xs text-white/60">{questionLabelMap.get(key) || key}</p>
                                  <p className="text-sm text-white whitespace-pre-wrap break-words">{String(value ?? "")}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="mt-3 flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => reviewApplicationMutation.mutate({ applicationId: application.id, action: "approve" })}
                            disabled={reviewApplicationMutation.isPending || application.status === "approved"}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white"
                          >
                            {application.status === "approved" ? "Approved" : "Approve"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => reviewApplicationMutation.mutate({ applicationId: application.id, action: "reject" })}
                            disabled={reviewApplicationMutation.isPending || application.status === "rejected" || isRegisteredGoing}
                            className="border-rose-400/40 text-rose-200 hover:bg-rose-500/20"
                          >
                            {application.status === "rejected" ? "Rejected" : isRegisteredGoing ? "Registered" : "Reject"}
                          </Button>
                        </div>
                        {isRegisteredGoing && (
                          <p className="mt-2 text-xs text-amber-200/90">Cannot reject after registration</p>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {activeSection === "approved_pending" && (event.entryMode || "open") === "approval" && (
              <Card className="border-white/15 bg-black/25 text-white">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <UsersRound className="h-5 w-5 text-cyan-300" />
                    Approved But Not Registered
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 max-h-[640px] overflow-auto pr-1">
                  {approvedPendingGuests.length === 0 && (
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
                      Everyone approved has already registered as going.
                    </div>
                  )}

                  {approvedPendingGuests.map(({ application, rsvp, rsvpStatus }: any) => {
                    const fullName = `${application.user?.firstName || ""} ${application.user?.lastName || ""}`.trim() || "Approved user";

                    return (
                      <div key={application.id} className="rounded-xl border border-white/10 bg-white/5 p-3 sm:p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium text-white">{fullName}</p>
                            <p className="text-xs text-white/60">{application.user?.email || "No email"}</p>
                          </div>

                          {!rsvpStatus && (
                            <span className="text-xs border rounded-full px-2 py-1 w-fit text-white/80 bg-white/10 border-white/20">
                              No RSVP yet
                            </span>
                          )}

                          {rsvpStatus === "maybe" && (
                            <span className="text-xs border rounded-full px-2 py-1 w-fit text-amber-200 bg-amber-500/15 border-amber-300/25">
                              Maybe
                            </span>
                          )}

                          {rsvpStatus === "not_going" && (
                            <span className="text-xs border rounded-full px-2 py-1 w-fit text-rose-200 bg-rose-500/15 border-rose-300/25">
                              Not Going
                            </span>
                          )}
                        </div>

                        <div className="mt-2 text-xs text-white/60">
                          Approved at: {formatDateTime(application.updatedAt || application.createdAt)}
                        </div>

                        {rsvp && (
                          <div className="mt-1 text-xs text-white/60">
                            Last RSVP update: {formatDateTime(rsvp.updatedAt || rsvp.createdAt)}
                          </div>
                        )}

                        <div className="mt-3">
                          <Button
                            size="sm"
                            onClick={() => sendReminderMutation.mutate({ applicationId: application.id })}
                            disabled={sendReminderMutation.isPending || Boolean(application.hostReminderSentAt)}
                            className="bg-cyan-600 hover:bg-cyan-500 text-white"
                          >
                            {application.hostReminderSentAt ? "Reminder Sent" : "Send Reminder Email"}
                          </Button>
                          {application.hostReminderSentAt && (
                            <p className="mt-2 text-xs text-white/65">
                              Sent at: {formatDateTime(application.hostReminderSentAt)}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {activeSection === "registered" && (
              <Card className="border-white/15 bg-black/25 text-white">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5 text-emerald-300" />
                    Registered Guests
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 max-h-[640px] overflow-auto pr-1">
                  {registeredGuests.length === 0 && (
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
                      No registered guests yet.
                    </div>
                  )}
                  {registeredGuests.map((rsvp: any) => {
                    const fullName = `${rsvp.user?.firstName || ""} ${rsvp.user?.lastName || ""}`.trim() || "Guest";
                    return (
                      <div key={rsvp.id} className="rounded-xl border border-white/10 bg-white/5 p-3 sm:p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium text-white">{fullName}</p>
                            <p className="text-xs text-white/60">{rsvp.user?.email || "No email"}</p>
                          </div>
                          <span className={`text-xs border rounded-full px-2 py-1 capitalize w-fit ${getStatusTone(rsvp.status)}`}>
                            {String(rsvp.status || "unknown").replace("_", " ")}
                          </span>
                        </div>
                        <div className="mt-2 text-xs text-white/60">
                          Registered at: {formatDateTime(rsvp.createdAt)}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {activeSection === "settings" && (
              <div className="space-y-4">
                <Card className="border-white/15 bg-black/25 text-white">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Settings className="h-5 w-5 text-cyan-300" />
                      Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-white/60 mb-2">Settings Panel</p>
                      <Select value={settingsPanel} onValueChange={(value: "rsvp" | "privacy" | "setting" | "discover") => setSettingsPanel(value)}>
                        <SelectTrigger className="bg-white/10 border-white/20 text-white">
                          <SelectValue placeholder="Select panel" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-950 border-white/20 text-white">
                          <SelectItem value="rsvp" className="text-white">RSVP</SelectItem>
                          <SelectItem value="privacy" className="text-white">Privacy</SelectItem>
                          <SelectItem value="setting" className="text-white">Setting</SelectItem>
                          <SelectItem value="discover" className="text-white">Discover Page Request</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {settingsPanel === "rsvp" && (
                      <div className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-4">
                        <div>
                          <p className="text-sm text-white font-medium">RSVP Mode</p>
                          <div className="mt-2 grid grid-cols-2 gap-2">
                            <Button
                              type="button"
                              variant={settingsDraft.rsvpMode === "rsvp" ? "default" : "outline"}
                              className={settingsDraft.rsvpMode === "rsvp" ? "bg-cyan-600 hover:bg-cyan-500" : "border-white/20 text-white hover:bg-white/10"}
                              onClick={() => setSettingsDraft((prev) => ({ ...prev, rsvpMode: "rsvp" }))}
                            >
                              RSVP
                            </Button>
                            <Button
                              type="button"
                              variant={settingsDraft.rsvpMode === "register" ? "default" : "outline"}
                              className={settingsDraft.rsvpMode === "register" ? "bg-cyan-600 hover:bg-cyan-500" : "border-white/20 text-white hover:bg-white/10"}
                              onClick={() => setSettingsDraft((prev) => ({ ...prev, rsvpMode: "register" }))}
                            >
                              Register
                            </Button>
                          </div>
                        </div>

                        <div>
                          <p className="text-sm text-white font-medium mb-2">Entry Mode</p>
                          <Select
                            value={settingsDraft.entryMode}
                            onValueChange={(value: "open" | "approval" | "invite_only") =>
                              setSettingsDraft((prev) => ({ ...prev, entryMode: value }))
                            }
                          >
                            <SelectTrigger className="bg-white/10 border-white/20 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-950 border-white/20 text-white">
                              <SelectItem value="open" className="text-white">Open</SelectItem>
                              <SelectItem value="approval" className="text-white">Approval</SelectItem>
                              <SelectItem value="invite_only" className="text-white">Invite Only</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}

                    {settingsPanel === "privacy" && (
                      <div className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-4">
                        <div>
                          <p className="text-sm text-white font-medium mb-2">Guest List Visibility</p>
                          <Select
                            value={settingsDraft.guestListVisibility}
                            onValueChange={(value: "host-only" | "attendees-only" | "everyone") =>
                              setSettingsDraft((prev) => ({ ...prev, guestListVisibility: value }))
                            }
                          >
                            <SelectTrigger className="bg-white/10 border-white/20 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-950 border-white/20 text-white">
                              <SelectItem value="host-only" className="text-white">Host Only</SelectItem>
                              <SelectItem value="attendees-only" className="text-white">Attendees Only</SelectItem>
                              <SelectItem value="everyone" className="text-white">Everyone</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex items-center justify-between rounded-lg border border-white/10 bg-black/20 p-3">
                          <div>
                            <p className="text-sm text-white font-medium">Show Guest Count</p>
                            <p className="text-xs text-white/60">Display total attendees to users.</p>
                          </div>
                          <Switch
                            checked={settingsDraft.showGuestCount}
                            onCheckedChange={(checked) => setSettingsDraft((prev) => ({ ...prev, showGuestCount: checked }))}
                          />
                        </div>
                      </div>
                    )}

                    {settingsPanel === "setting" && (
                      <div className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-4">
                        <div className="flex items-center justify-between rounded-lg border border-white/10 bg-black/20 p-3">
                          <div>
                            <p className="text-sm text-white font-medium">Close Event</p>
                            <p className="text-xs text-white/60">Prevent new joins when enabled.</p>
                          </div>
                          <Switch
                            checked={settingsDraft.isClosed}
                            onCheckedChange={(checked) => setSettingsDraft((prev) => ({ ...prev, isClosed: checked }))}
                          />
                        </div>
                      </div>
                    )}

                    {settingsPanel === "discover" && (
                      <div className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-4">
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-white font-medium">Current Discover Status</p>
                          <Badge className="bg-white/10 text-white border-white/20">{event.discoverStatus || "none"}</Badge>
                        </div>

                        <Textarea
                          value={discoverRequestMessage}
                          onChange={(e) => setDiscoverRequestMessage(e.target.value)}
                          className="bg-white/10 border-white/20 text-white placeholder:text-white/45"
                          rows={4}
                          placeholder="Optional message for discover review"
                        />

                        <div className="flex flex-wrap gap-2">
                          <Button
                            onClick={() => requestDiscoverMutation.mutate()}
                            disabled={requestDiscoverMutation.isPending || event.discoverStatus === "requested" || event.discoverStatus === "approved"}
                            className="bg-cyan-600 hover:bg-cyan-500 text-white"
                          >
                            Request Discover Access
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => cancelDiscoverMutation.mutate()}
                            disabled={cancelDiscoverMutation.isPending || event.discoverStatus !== "requested"}
                            className="border-white/20 text-white hover:bg-white/10"
                          >
                            Cancel Request
                          </Button>
                        </div>
                      </div>
                    )}

                    {settingsPanel !== "discover" && (
                      <div className="pt-1">
                        <Button
                          onClick={() => saveSettingsMutation.mutate()}
                          disabled={saveSettingsMutation.isPending}
                          className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:brightness-110"
                        >
                          Save Changes
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </section>
        </div>
      </main>
      <MobileNav />
    </SimpleBackground>
  );
}
