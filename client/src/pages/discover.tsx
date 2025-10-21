import { useQuery } from "@tanstack/react-query";
import { useState, useMemo, useEffect, useCallback } from "react";
import { Link } from "wouter";
import Header from "@/components/layout/header";
import MobileNav from "@/components/layout/mobile-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { Event } from "@shared/schema";
import {
  Calendar,
  Users,
  MapPin,
  Search,
  SlidersHorizontal,
  Filter,
  Share2,
  Gamepad2,
  PartyPopper,
  Clock,
  Sparkles,
  Globe2
} from "lucide-react";

// Extended type with RSVP metadata
interface EventWithCounts extends Event {
  rsvpCount?: number;
  goingCount?: number;
}

type FilterCategory = "all" | "gaming" | "parties" | "this-week" | "small-groups";
type SortOption = "date" | "newest" | "popular";

export default function Discover() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<FilterCategory>("all");
  const [sortBy, setSortBy] = useState<SortOption>("date");
  const [showFilters, setShowFilters] = useState(false);

  const { data: events = [], isLoading, isFetching } = useQuery<EventWithCounts[]>({
    queryKey: ["/api/events/discover"],
    // ✅ OPTIMIZED: Cache discover events for 1 minute instead of always refetching
    staleTime: 60000, // Consider data fresh for 1 minute
    gcTime: 180000, // Keep in cache for 3 minutes
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
  });

  const formatEventDate = (dateString: string) => new Date(dateString).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const isThisWeek = (dateString: string) => {
    const eventDate = new Date(dateString);
    const now = new Date();
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return eventDate >= now && eventDate <= oneWeekFromNow;
  };

  const isSmallGroup = (event: EventWithCounts) => event.maxGuests !== null && event.maxGuests !== undefined && event.maxGuests <= 10;

  // Derived filtered list
  const filteredAndSortedEvents = useMemo(() => {
    let filtered = [...events];

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(ev => (
        ev.title.toLowerCase().includes(term) ||
        ev.description?.toLowerCase().includes(term) ||
        ev.location?.toLowerCase().includes(term)
      ));
    }

    switch (selectedCategory) {
      case 'gaming':
        filtered = filtered.filter(ev => ev.eventType === 'online');
        break;
      case 'parties':
        filtered = filtered.filter(ev => ev.eventType === 'offline');
        break;
      case 'this-week':
        filtered = filtered.filter(ev => isThisWeek(ev.datetime.toString()));
        break;
      case 'small-groups':
        filtered = filtered.filter(ev => isSmallGroup(ev));
        break;
      default:
        break;
    }

    switch (sortBy) {
      case 'date':
        filtered.sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());
        break;
      case 'newest':
        filtered.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        break;
      case 'popular':
        filtered.sort((a, b) => (b.goingCount || b.rsvpCount || 0) - (a.goingCount || a.rsvpCount || 0));
        break;
    }

    return filtered;
  }, [events, searchTerm, selectedCategory, sortBy]);

  const categories: { id: FilterCategory; label: string; icon: any; count: number }[] = [
    { id: 'all', label: 'All', icon: Globe2, count: events.length },
    { id: 'gaming', label: 'Gaming', icon: Gamepad2, count: events.filter(e => e.eventType === 'online').length },
    { id: 'parties', label: 'Parties', icon: PartyPopper, count: events.filter(e => e.eventType === 'offline').length },
    { id: 'this-week', label: 'This Week', icon: Calendar, count: events.filter(e => isThisWeek(e.datetime.toString())).length },
    { id: 'small-groups', label: 'Small', icon: Users, count: events.filter(e => isSmallGroup(e)).length },
  ];

  const copyShare = (eventId: number) => {
    const url = `${window.location.origin}/events/${eventId}/share`;
    navigator.clipboard.writeText(url).then(() => {
      toast({ title: 'Link copied!', description: 'Event share link copied.' });
    }).catch(() => {
      toast({ title: 'Failed', description: 'Copy manually.', variant: 'destructive' });
    });
  };

  // Loading skeleton UI
  const SkeletonCard = () => (
    <div className="animate-pulse rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-5 space-y-4">
      <div className="flex justify-between">
        <div className="h-5 w-20 bg-white/10 rounded" />
        <div className="h-5 w-10 bg-white/10 rounded" />
      </div>
      <div className="h-4 w-3/4 bg-white/10 rounded" />
      <div className="h-4 w-1/2 bg-white/10 rounded" />
      <div className="h-20 w-full bg-white/5 rounded" />
      <div className="flex gap-2">
        <div className="h-8 flex-1 bg-white/10 rounded" />
        <div className="h-8 w-8 bg-white/10 rounded" />
        <div className="h-8 flex-1 bg-white/10 rounded" />
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black overflow-x-hidden">
        <Header />
        <main className="pb-24 md:pb-12 w-full px-4 sm:px-6 lg:px-24 space-y-10 pt-24">
          <div className="text-center space-y-3">
            <h1 className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300">Discover Events</h1>
            <p className="text-white/60 text-sm">Finding happenings near you...</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        </main>
        <MobileNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black overflow-x-hidden">
      <Header />
      
      {/* Hero - Full Width Gradient Section */}
      <section className="relative pt-20 w-full overflow-hidden">
        <div className="absolute inset-0 top-0 hero-animated-gradient" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black to-transparent pointer-events-none" />
        <div className="relative z-10 px-4 sm:px-6 lg:px-24 py-36">
          <div className="flex flex-col lg:flex-row gap-6 lg:items-center lg:justify-between">
            <div className="flex-1 space-y-3">
              <h1 className="text-4xl sm:text-5xl font-bold text-white">Discover Events</h1>
              <p className="text-white/70 max-w-2xl text-sm sm:text-base leading-relaxed">Browse public gaming sessions, parties, and gatherings. Filter, explore, and join what excites you.</p>
            </div>
            <div className="flex gap-3">
              <Button asChild size="lg" className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white shadow-lg shadow-violet-500/20">
                <Link href="/create-event">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Host an Event
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <main className="pb-24 md:pb-12 w-full px-4 sm:px-6 lg:px-24 space-y-12 mt-8">
        {/* Search & Filters */}
        <section className="space-y-6">
            <div className="flex flex-col lg:flex-row gap-4 lg:items-center">
              <div className="relative flex-1 max-w-xl">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                <Input value={searchTerm} onChange={(e)=>setSearchTerm(e.target.value)} placeholder="Search events..." className="pl-9 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:bg-white/15" />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={()=>setShowFilters(v=>!v)} className="border-white/30 text-white bg-white/10 hover:bg-white/20">
                  <SlidersHorizontal className="h-4 w-4 mr-2" /> {showFilters ? 'Hide Filters' : 'Show Filters'}
                </Button>
                <div className="flex items-center gap-2 text-white/60 text-xs">
                  <Clock className="h-3.5 w-3.5" /> {filteredAndSortedEvents.length} results
                </div>
              </div>
            </div>

            {/* Category Pills */}
            <div className="flex flex-wrap gap-2">
              {categories.map(cat => {
                const Icon = cat.icon;
                const active = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={()=>setSelectedCategory(cat.id)}
                    className={`group px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 border backdrop-blur transition ${active ? 'bg-white/25 border-white/40 text-white' : 'bg-white/10 border-white/20 text-white/60 hover:text-white hover:bg-white/15'}`}
                  >
                    <Icon className="h-3.5 w-3.5" />{cat.label}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full transition ${active ? 'bg-white/30 text-white' : 'bg-white/10 text-white/50 group-hover:bg-white/20 group-hover:text-white/80'}`}>{cat.count}</span>
                  </button>
                );
              })}
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="rounded-2xl border border-white/15 bg-white/5 backdrop-blur p-4 flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2 text-white/70 text-xs font-medium"><Filter className="h-3.5 w-3.5" /> Sort by</div>
                <Select value={sortBy} onValueChange={(v: SortOption)=>setSortBy(v)}>
                  <SelectTrigger className="w-40 h-8 bg-white/10 border-white/20 text-white text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#111] border border-white/10 text-white">
                    <SelectItem value="date" className="text-xs">Date (Soonest)</SelectItem>
                    <SelectItem value="newest" className="text-xs">Newest</SelectItem>
                    <SelectItem value="popular" className="text-xs">Popular</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </section>

          {/* Events */}
          <section>
            {filteredAndSortedEvents.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAndSortedEvents.map(event => {
                  const share = (e: any) => { e.preventDefault(); e.stopPropagation(); copyShare(event.id); };
                  const isPast = new Date(event.datetime) < new Date();
                  return (
                    <Link key={event.id} href={`/events/${event.id}`}>
                      <Card className={`relative group overflow-hidden border-white/15 bg-white/10 backdrop-blur transition hover:border-white/30 ${isPast ? 'opacity-75' : ''}`}>
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition bg-gradient-to-br from-primary/20 via-primary/10 to-cyan-400/20" />
                        <CardHeader className="pb-3 relative z-10">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Badge variant={event.eventType === 'online' ? 'default' : 'secondary'} className={event.eventType === 'online' ? 'bg-indigo-500' : 'bg-pink-600'}>
                                {event.eventType === 'online' ? 'Gaming' : 'Party'}
                              </Badge>
                              {isPast && <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 border border-white/20 text-white/60">Past</span>}
                            </div>
                            <div className="text-[10px] px-2 py-1 rounded bg-white/10 border border-white/15 text-white/60">Public</div>
                          </div>
                          <CardTitle className="text-base line-clamp-2 text-white">{event.title}</CardTitle>
                          {event.description && <p className="text-xs text-white/60 line-clamp-2 mt-1">{event.description}</p>}
                        </CardHeader>
                        <CardContent className="pt-0 relative z-10">
                          <div className="space-y-2 text-[11px] text-white/70">
                            <div className="flex items-center"><Calendar className="h-3.5 w-3.5 mr-2" /> <span className="truncate">{formatEventDate(event.datetime.toString())}</span></div>
                            {event.location && <div className="flex items-center"><MapPin className="h-3.5 w-3.5 mr-2" /><span className="truncate">{event.location}</span></div>}
                            <div className="flex items-center"><Users className="h-3.5 w-3.5 mr-2" /><span>{event.goingCount || 0}/{event.maxGuests || '∞'} going</span></div>
                          </div>
                          <div className="flex gap-2 mt-4">
                            <Button size="sm" variant="outline" className="text-[11px] flex-1 border-white/25 text-white/80 hover:text-white">
                              View
                            </Button>
                            <Button size="sm" variant="outline" className="text-[11px] border-white/25 text-white/80 hover:text-white" onClick={share}>
                              <Share2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <Card className="bg-white/10 border-white/15 backdrop-blur">
                <CardContent className="p-12 text-center space-y-5">
                  <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-r from-indigo-500/20 to-pink-500/20 flex items-center justify-center">
                    <Search className="h-10 w-10 text-white/70" />
                  </div>
                  <h3 className="text-2xl font-semibold text-white">{searchTerm ? 'No events found' : 'No public events yet'}</h3>
                  <p className="text-sm text-white/60 max-w-sm mx-auto">{searchTerm ? 'Try different keywords or clear filters.' : 'Be the first to host something people can join!'}</p>
                  <Button asChild className="brand-gradient">
                    <Link href="/create-event">Create Event</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </section>
        </main>
        <MobileNav />
    </div>
  );
}

