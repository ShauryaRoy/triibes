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

  // Scroll to top when component mounts (especially when redirected for login)
  useEffect(() => {
    // Use multiple methods to ensure scroll to top
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);

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
    
    // Get image URL
    const getEventImageUrl = () => {
      if (event.imageUrl) return event.imageUrl;
      if (event.posterData) {
        try {
          const posterDataObj = typeof event.posterData === 'string' 
            ? JSON.parse(event.posterData) 
            : event.posterData;
          if (posterDataObj?.selectedImage) return posterDataObj.selectedImage;
          if (posterDataObj?.url) return posterDataObj.url;
        } catch (error) {
          console.error('Error parsing posterData:', error);
        }
      }
      return null;
    };
    
    const eventImageUrl = getEventImageUrl();
    const eventLink = event.slug || event.id;
    
    return (
      <div className="min-w-[160px] sm:min-w-[200px] lg:min-w-[240px] snap-start relative group">
        <Link href={`/events/${eventLink}`}>
                        {/* 1:1 Square Poster */}
                        <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-gradient-to-br from-primary/40 to-blue-600/40 mb-2">
                          {eventImageUrl ? (
                            <img 
                              src={eventImageUrl} 
                              alt={event.title} 
                              className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/30 to-blue-600/30" />
                          )}
            
            {/* Host/Guest badge */}
            <div className="absolute top-2 right-2">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/60 border border-white/20 text-white/80 backdrop-blur-sm font-medium">
                {isHost ? 'Host' : 'Guest'}
              </span>
            </div>
            
            {isPast && (
              <div className="absolute bottom-2 right-2">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/60 border border-white/20 text-white/80 backdrop-blur-sm">Past</span>
              </div>
            )}
          </div>
        </Link>

        {/* Event Title */}
        <Link href={`/events/${eventLink}`}>
          <h3 className="font-semibold text-sm sm:text-base text-white line-clamp-2 group-hover:text-primary transition-colors">
            {event.title}
          </h3>
        </Link>
      </div>
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

          <div className="relative z-10 px-4 sm:px-6 lg:px-24 py-12 sm:py-24 lg:py-36">
            <div className="flex flex-col lg:flex-row gap-6 lg:items-center lg:justify-between">
            <div className="flex-1 space-y-3">
              <h1 className="text-2xl sm:text-4xl font-bold text-white">
                Welcome, {(user as any)?.firstName || 'Host'} 👋
              </h1>
              <p className="text-white/60 max-w-xl text-sm leading-relaxed">
                Manage your events, customize posters, and connect with your community.
              </p>
            </div>
            <div className="flex gap-3">
              <Button asChild size="lg" className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white shadow-lg shadow-violet-500/20  sm:w-sm">
                <Link href="/create-event">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Event
                </Link>
              </Button>
            </div>
            </div>
          </div>
    </section>
        
  <main className="pb-24 md:pb-12 w-full px-4 sm:px-6 lg:px-24 space-y-6 sm:space-y-8 mt-4 sm:mt-8">


          {/* Filters */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-2xl font-bold text-white">Your Events</h2>
                <div className="flex flex-wrap gap-4">
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
              <div className="flex items-center gap-4 pb-5 pt-5">
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
                <div className="px-4 sm:px-6 lg:px-8 inline-flex gap-5 md:gap-7 snap-x snap-mandatory">
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
