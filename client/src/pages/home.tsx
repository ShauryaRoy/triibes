import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, MapPin, Plus, Lock } from "lucide-react";
import { useMemo, useState, useEffect, memo } from "react";
import { Link } from "wouter";
import Header from "@/components/layout/header";
import MobileNav from "@/components/layout/mobile-nav";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [filter, setFilter] = useState<'all' | 'hosting' | 'attending' | 'past'>('all');

  const { data: events = [], isLoading, isFetching } = useQuery({
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

  // Poster customization removed from cards per request

  const formatEventDate = (dateString: string) => new Date(dateString).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

  // ✅ Memoized event card to prevent unnecessary re-renders
  const EventListCard = memo(({ event, userId }: { event: any; userId: string }) => {
    const isHost = event.hostId === userId;
    const isPast = new Date(event.datetime) < new Date();
    
    return (
      <Card className={`min-w-[280px] sm:min-w-[320px] lg:min-w-[360px] snap-start relative group overflow-hidden border-white/15 bg-white/10 backdrop-blur transition hover:border-white/30 ${isPast ? 'opacity-75' : ''}`}>
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
            <Button asChild size="sm" className="text-[11px] flex-1 w-full brand-gradient hover:shadow-md">
              <Link href={`/events/${event.id}`}>View</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black overflow-x-hidden">
        <Header />
        <div className="flex-1 flex items-center justify-center min-h-[80vh]">
          <div className="space-y-4 text-center">
            <div className="mx-auto h-10 w-10 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            <p className="text-white/80 text-sm">Loading your events...</p>
          </div>
        </div>
        <MobileNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black overflow-x-hidden">
      <Header />
        
        {/* Hero / Welcome - Full width gradient section */}
  <section className="relative pt-20 w-full overflow-hidden">
          {/* Gradient fills entire section from the very top */}
          <div className="absolute inset-0 top-0 hero-animated-gradient" />
          {/* Fade to black at bottom */}
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black to-transparent pointer-events-none" />

          <div className="relative z-10 px-4 sm:px-6 lg:px-24 py-36">
            <div className="flex flex-col lg:flex-row gap-6 lg:items-center lg:justify-between">
            <div className="flex-1 space-y-3">
              <h1 className="text-3xl sm:text-4xl font-bold text-white">
                Welcome back, {(user as any)?.firstName || 'Host'} 👋
              </h1>
              <p className="text-white/60 max-w-xl text-sm leading-relaxed">
                Manage your events, customize posters, and connect with your community.
              </p>
            </div>
            <div className="flex gap-3">
              <Button asChild size="lg" className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white shadow-lg shadow-violet-500/20">
                <Link href="/create-event">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Event
                </Link>
              </Button>
            </div>
            </div>
          </div>
    </section>
        
  <main className="pb-24 md:pb-12 w-full px-4 sm:px-6 lg:px-24 space-y-8 mt-8">


          {/* Filters */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3 flex-wrap">
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
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="border-white/20 text-white/80 hover:text-white hover:bg-white/10"
                  onClick={() => {
                    const el = document.getElementById('eventsScroller');
                    if (el) el.scrollBy({ left: -Math.max(320, el.clientWidth * 0.8), behavior: 'smooth' });
                  }}
                  aria-label="Scroll left"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><path d="m15 18-6-6 6-6"/></svg>
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="border-white/20 text-white/80 hover:text-white hover:bg-white/10"
                  onClick={() => {
                    const el = document.getElementById('eventsScroller');
                    if (el) el.scrollBy({ left: Math.max(320, el.clientWidth * 0.8), behavior: 'smooth' });
                  }}
                  aria-label="Scroll right"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><path d="m9 18 6-6-6-6"/></svg>
                </Button>
              </div>
            </div>

          {/* Events - Horizontal Scroll */}
          <section>
            {filteredEvents.length > 0 ? (
              <div id="eventsScroller" className="overflow-x-auto hide-scrollbar -mx-4 sm:-mx-6 lg:-mx-8 pb-2 scroll-smooth">
                <div className="px-4 sm:px-6 lg:px-8 inline-flex gap-4 md:gap-6 snap-x snap-mandatory">
                  {filteredEvents.map((event: any) => (
                    <EventListCard key={event.id} event={event} userId={(user as any)?.id} />
                  ))}
                </div>
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

  {/* PosterCustomizer removed from Home */}
    </div>
  );
}
