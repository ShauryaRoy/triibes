import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, MapPin, Plus, Gamepad2, PartyPopper, Sparkles, Share2, Lock, Filter, Clock, Trophy } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "wouter";
import Header from "@/components/layout/header";
import MobileNav from "@/components/layout/mobile-nav";
import PosterCustomizer from "@/components/poster-customizer";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ThemeBackground } from "@/components/theme-background";
import { getThemeById } from "@shared/themes";

export default function Home() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isPosterCustomizerOpen, setIsPosterCustomizerOpen] = useState(false);
  const [currentEventData, setCurrentEventData] = useState<any>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'hosting' | 'attending' | 'past'>('all');
  const theme = getThemeById('quantum-dark');

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["/api/events"],
  });

  const eventList = (events as any[]) || [];
  const hosting = useMemo(() => eventList.filter((e: any) => e.hostId === (user as any)?.id), [eventList, user]);
  const attending = useMemo(() => eventList.filter((e: any) => e.hostId !== (user as any)?.id), [eventList, user]);
  const past = useMemo(() => eventList.filter((e: any) => new Date(e.datetime) < new Date()), [eventList]);
  const upcoming = useMemo(() => eventList.filter((e: any) => new Date(e.datetime) >= new Date()), [eventList]);
  const filteredEvents = useMemo(() => {
    switch (filter) {
      case 'hosting': return hosting;
      case 'attending': return attending;
      case 'past': return past;
      default: return eventList;
    }
  }, [filter, hosting, attending, past, eventList]);

  const handleSavePoster = async (posterData: any) => {
    if (!currentEventData) return;
    try {
      await apiRequest("PUT", `/api/events/${currentEventData.id}`, { posterData });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({ title: "Poster saved!", description: "Your custom poster has been saved." });
    } catch {
      toast({ title: "Error", description: "Failed to save poster.", variant: "destructive" });
    }
  };

  const openPosterCustomizer = (event: any) => { setCurrentEventData(event); setIsPosterCustomizerOpen(true); };

  const formatEventDate = (dateString: string) => new Date(dateString).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

  if (isLoading) {
    return (
      <ThemeBackground theme={theme} className="min-h-screen">
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 min-h-screen flex flex-col">
          <Header />
          <div className="flex-1 flex items-center justify-center">
            <div className="space-y-4 text-center">
              <div className="mx-auto h-10 w-10 rounded-full border-2 border-white/30 border-t-transparent animate-spin" />
              <p className="text-white/60 text-sm">Loading your events...</p>
            </div>
          </div>
          <MobileNav />
        </div>
      </ThemeBackground>
    );
  }

  return (
    <ThemeBackground theme={theme} className="min-h-screen">
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative z-10 min-h-screen flex flex-col">
        <Header />
        <main className="pt-28 pb-24 md:pb-12 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 space-y-10">
          {/* Hero / Welcome */}
          <section className="relative rounded-3xl overflow-hidden border border-white/15 backdrop-blur-xl p-6 sm:p-10 bg-gradient-to-br from-primary/25 via-primary/10 to-cyan-400/20">
            <div className="flex flex-col lg:flex-row gap-8 lg:items-center">
              <div className="flex-1 space-y-4">
                <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 drop-shadow">
                  Welcome back, {(user as any)?.firstName || 'Host'} 👋
                </h1>
                <p className="text-white/70 max-w-xl text-sm sm:text-base leading-relaxed">
                  Manage, customize, and share your gaming nights and parties all in one sleek dashboard.
                </p>
                <div className="flex flex-wrap gap-3 pt-2">
                  <Button asChild className="brand-gradient brand-gradient-hover">
                    <Link href="/create-event">Create Event</Link>
                  </Button>
                  <Button asChild variant="outline" className="border-white/30 text-white bg-white/10 hover:bg-white/20">
                    <Link href="/discover">Discover</Link>
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
                <div className="rounded-2xl p-4 bg-white/10 backdrop-blur border border-white/20">
                  <p className="text-xs uppercase tracking-wide text-white/50 mb-1">Hosting</p>
                  <p className="text-3xl font-bold text-white">{hosting.length}</p>
                </div>
                <div className="rounded-2xl p-4 bg-white/10 backdrop-blur border border-white/20">
                  <p className="text-xs uppercase tracking-wide text-white/50 mb-1">Attending</p>
                  <p className="text-3xl font-bold text-white">{attending.length}</p>
                </div>
                <div className="rounded-2xl p-4 bg-white/10 backdrop-blur border border-white/20">
                  <p className="text-xs uppercase tracking-wide text-white/50 mb-1">Upcoming</p>
                  <p className="text-3xl font-bold text-white">{upcoming.length}</p>
                </div>
                <div className="rounded-2xl p-4 bg-white/10 backdrop-blur border border-white/20">
                  <p className="text-xs uppercase tracking-wide text-white/50 mb-1">Past</p>
                  <p className="text-3xl font-bold text-white">{past.length}</p>
                </div>
              </div>
            </div>
            <div className="absolute -top-10 -right-10 w-56 h-56 bg-pink-500/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-10 -left-10 w-56 h-56 bg-indigo-500/20 rounded-full blur-3xl" />
          </section>

          {/* Quick Templates */}
          <section>
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><Sparkles className="h-4 w-4" /> Quick Start</h2>
            <div className="grid sm:grid-cols-1 gap-4 max-w-sm">
              <Button asChild className="brand-gradient brand-gradient-hover">
                <Link href="/create-event">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Event
                </Link>
              </Button>
            </div>
          </section>

          {/* Filters */}
            <div className="flex flex-wrap gap-2 items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Your Events</h2>
              <div className="flex flex-wrap gap-2">
                {(['all','hosting','attending','past'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur border transition ${filter===f ? 'bg-white/25 border-white/40 text-white' : 'bg-white/10 border-white/20 text-white/60 hover:text-white hover:bg-white/15'}`}
                  >
                    {f.charAt(0).toUpperCase()+f.slice(1)}
                  </button>
                ))}
              </div>
            </div>

          {/* Events Grid */}
          <section>
            {filteredEvents.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredEvents.map((event: any) => {
                  const isHost = event.hostId === (user as any)?.id;
                  const isPast = new Date(event.datetime) < new Date();
                  return (
                    <Card key={event.id} className={`relative group overflow-hidden border-white/15 bg-white/10 backdrop-blur transition hover:border-white/30 ${isPast ? 'opacity-75' : ''}`}>
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition bg-gradient-to-br from-primary/20 via-primary/10 to-cyan-400/20" />
                      <CardHeader className="pb-3 relative z-10">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant={event.eventType === 'online' ? 'default':'secondary'} className={event.eventType === 'online' ? 'bg-indigo-500':'bg-pink-600'}>
                              {event.eventType === 'online' ? 'Gaming':'Party'}
                            </Badge>
                            {!event.isPublic && (
                              <div className="relative group/lock">
                                <Lock className="w-4 h-4 text-white/50" />
                                <span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 text-[10px] px-2 py-1 rounded bg-black/70 text-white opacity-0 group-hover/lock:opacity-100 transition">Private</span>
                              </div>
                            )}
                            {isPast && <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 border border-white/20 text-white/60">Past</span>}
                          </div>
                          <span className="text-[11px] text-white/60 font-medium">{isHost ? 'Host' : 'Guest'}</span>
                        </div>
                        <CardTitle className="text-base line-clamp-2 text-white">{event.title}</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0 relative z-10">
                        <div className="space-y-2 text-xs text-white/70">
                          <div className="flex items-center"><Calendar className="h-3.5 w-3.5 mr-2" /> <span className="truncate">{formatEventDate(event.datetime)}</span></div>
                          {event.location && <div className="flex items-center"><MapPin className="h-3.5 w-3.5 mr-2" /><span className="truncate">{event.location}</span></div>}
                          <div className="flex items-center"><Users className="h-3.5 w-3.5 mr-2" /><span>{event.maxGuests ? `Max ${event.maxGuests}` : 'Unlimited'}</span></div>
                        </div>
                        {event.description && <p className="text-xs text-white/60 mt-3 line-clamp-2">{event.description}</p>}
                        <div className="flex gap-2 mt-4">
                          <Button size="sm" variant="outline" className="text-[11px] flex-1 border-white/25 text-white/80 hover:text-white" onClick={() => openPosterCustomizer(event)}>
                            <Sparkles className="h-3 w-3 mr-1" /> Poster
                          </Button>
                          {event.isPublic && (
                            <Button size="sm" variant="outline" className="text-[11px] border-white/25 text-white/80 hover:text-white" onClick={(e) => { e.preventDefault(); e.stopPropagation(); const shareUrl = `${window.location.origin}/events/${event.id}/share`; navigator.clipboard.writeText(shareUrl).then(() => toast({ title:'Link copied!', description:'Event share link copied.'})).catch(() => toast({ title:'Failed', description:'Copy manually', variant:'destructive'})); }}>
                              <Share2 className="h-3 w-3" />
                            </Button>
                          )}
                          <Button asChild size="sm" className="text-[11px] flex-1 w-full brand-gradient hover:shadow-md">
                            <Link href={`/events/${event.id}`}>View</Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="bg-white/10 border-white/15 backdrop-blur">
                <CardContent className="p-10 text-center space-y-4">
                  <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-r from-indigo-500/20 to-pink-500/20 flex items-center justify-center">
                    <Calendar className="h-8 w-8 text-white/70" />
                  </div>
                  <h3 className="text-xl font-semibold text-white">No events yet</h3>
                  <p className="text-sm text-white/60 max-w-sm mx-auto">Create your first event to get started with the ultimate planning experience!</p>
                  <Button asChild className="brand-gradient">
                    <Link href="/create-event">Create Your First Event</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </section>
        </main>
        <MobileNav />

        <PosterCustomizer
          open={isPosterCustomizerOpen}
          onOpenChange={setIsPosterCustomizerOpen}
          eventData={currentEventData}
          onSave={handleSavePoster}
        />
      </div>
    </ThemeBackground>
  );
}
