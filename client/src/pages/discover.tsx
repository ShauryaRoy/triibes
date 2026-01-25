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
  Gamepad2,
  PartyPopper,
  Clock,
  Sparkles,
  Globe2,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { SEO } from "@/components/SEO";

// Extended type with RSVP metadata
interface EventWithCounts extends Event {
  rsvpCount?: number;
  goingCount?: number;
}

type FilterCategory = "all" | "gaming" | "gatherings" | "this-week" | "small-groups";
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
      case 'gatherings':
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
    { id: 'gatherings', label: 'Gatherings', icon: PartyPopper, count: events.filter(e => e.eventType === 'offline').length },
    { id: 'this-week', label: 'This Week', icon: Calendar, count: events.filter(e => isThisWeek(e.datetime.toString())).length },
    { id: 'small-groups', label: 'Small', icon: Users, count: events.filter(e => isSmallGroup(e)).length },
  ];



  // Loading skeleton UI
  const SkeletonCard = () => (
    <div className="animate-pulse rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-5 space-y-4">
      <div className="flex justify-between">
        <div className="h-5 w-20 bg-slate-200 dark:bg-slate-800 rounded" />
        <div className="h-5 w-10 bg-slate-100 dark:bg-slate-700 rounded" />
      </div>
      <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-800 rounded" />
      <div className="h-4 w-1/2 bg-slate-100 dark:bg-slate-700 rounded" />
      <div className="h-20 w-full bg-slate-50 dark:bg-slate-800 rounded" />
      <div className="flex gap-2">
        <div className="h-8 flex-1 bg-slate-200 dark:bg-slate-800 rounded" />
        <div className="h-8 w-8 bg-slate-100 dark:bg-slate-700 rounded" />
        <div className="h-8 flex-1 bg-slate-200 dark:bg-slate-800 rounded" />
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 overflow-x-hidden">
        <Header />
        <main className="pb-24 md:pb-12 w-full px-4 sm:px-6 lg:px-8 space-y-10 pt-24 max-w-7xl mx-auto">
          <div className="text-center space-y-3">
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">Discover Events</h1>
            <p className="text-slate-600 dark:text-slate-400 text-sm">Finding happenings near you...</p>
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
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
      {/* SEO Meta Tags */}
      <SEO 
        title="Discover Events"
        description="Browse and discover amazing public events, gaming sessions, parties, and community gatherings. Find activities that match your interests and connect with like-minded people."
        keywords="discover events, local events, gaming sessions, parties, community events, social activities"
      />
      
      <Header />
      
      {/* Hero Section */}
      <section className="relative pt-16 px-6 overflow-hidden isolate">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-50/60 via-white to-purple-50/40 dark:from-violet-950/30 dark:via-slate-950 dark:to-purple-950/20" />
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-b from-transparent to-[#F8FAFC] dark:to-slate-950" />

        <div className="max-w-7xl mx-auto relative z-10 grid lg:grid-cols-2 gap-12 items-center">
          
          {/* LEFT COLUMN: Text Content */}
          <div className="flex flex-col items-start pl-6 max-w-xl">
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white mb-3">
              Discover <span className="text-violet-600 dark:text-violet-400">Events</span> 🎉
            </h1>
            <p className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">
              Find and join <span className="text-violet-500 dark:text-violet-400">amazing experiences.</span>
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md leading-relaxed mb-6">
              Browse public gaming sessions, parties, and gatherings. Filter, explore, and join what excites you.
            </p>
            
            <Button asChild size="lg" className="rounded-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-violet-200">
              <Link href="/create-event">
                <Sparkles className="h-4 w-4 mr-2" />
                Host an Event
              </Link>
            </Button>
          </div>

          {/* RIGHT COLUMN: Floating Decor Area */}
          <div className="relative h-[320px] hidden lg:block w-full">
            
            {/* Calendar Icon Float */}
            <div className="absolute left-10 top-10 z-10">
              <div className="w-40 p-3.5 bg-blue-100 dark:bg-blue-900/80 rounded-xl shadow-xl rotate-[-6deg] animate-float">
                <p className="text-xs font-medium text-slate-800 dark:text-blue-100 leading-snug">
                  Explore exciting
                  <br />
                  events nearby 🎊
                </p>
                <span className="absolute -top-2 left-1/2 w-3 h-3 bg-blue-500 rounded-full -translate-x-1/2" />
              </div>
            </div>

            {/* Event Preview Card */}
            <div className="absolute right-0 top-6 z-20">
              <div className="w-60 rounded-2xl overflow-hidden shadow-2xl rotate-[4deg] bg-white dark:bg-slate-900 animate-float-delayed border border-slate-100 dark:border-slate-800">
                <div className="aspect-square bg-gradient-to-br from-purple-400 to-pink-400" />
                <div className="p-4 bg-white dark:bg-slate-900">
                  <div className="text-sm font-bold text-slate-900 dark:text-white mb-1">Gaming Night</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">Sat, Jan 20 · 8:00 PM</div>
                </div>
              </div>
            </div>

            {/* Sparkle Button */}
            <div className="absolute right-12 bottom-12 z-30">
              <Link href="/create-event">
                <div className="px-5 py-2.5 rounded-full bg-gradient-to-r from-violet-600 to-purple-600 shadow-lg flex items-center gap-2 hover:scale-105 transition-transform cursor-pointer">
                  <span className="text-white font-semibold text-xs">Host Event</span>
                  <span className="text-white text-sm">→</span>
                </div>
              </Link>
            </div>

          </div>
        </div>
      </section>

      <main className="pb-24 md:pb-12 w-full px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-12 mt-6 max-w-7xl mx-auto">
        {/* Search & Filters */}
        <section className="bg-white/70 dark:bg-slate-900/70 backdrop-blur rounded-3xl p-6 border border-slate-200/60 dark:border-slate-800/60 shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)]">
            <div className="flex flex-col lg:flex-row gap-4 lg:items-center mb-6">
              <div className="relative flex-1 max-w-xl">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
                <Input value={searchTerm} onChange={(e)=>setSearchTerm(e.target.value)} placeholder="Search events..." className="pl-9 bg-white  border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-violet-300 dark:focus:border-violet-600" />
              </div>
              <div className="flex gap-2 flex-wrap items-center">
                <Button size="sm" variant="outline" onClick={()=>setShowFilters(v=>!v)} className="border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-full">
                  <SlidersHorizontal className="h-4 w-4 mr-2" /> {showFilters ? 'Hide Filters' : 'Show Filters'}
                </Button>
                <div className="flex items-center gap-2 text-slate-500 text-xs">
                  <Clock className="h-3.5 w-3.5" /> {filteredAndSortedEvents.length} results
                </div>
              </div>
            </div>

            {/* Category Pills */}
            <div className="flex flex-wrap gap-2 mb-6">
              {categories.map(cat => {
                const Icon = cat.icon;
                const active = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={()=>setSelectedCategory(cat.id)}
                    className={`group px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 border transition-all ${
                      active 
                        ? 'bg-slate-900 text-white shadow-md' 
                        : 'bg-white border-slate-200 text-slate-600 hover:border-violet-300 hover:text-violet-700 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="h-4 w-4" />{cat.label}
                    <span className={`text-xs px-2 py-0.5 rounded-full transition ${
                      active 
                        ? 'bg-white/20 text-white' 
                        : 'bg-slate-100 text-slate-500 group-hover:bg-violet-100 group-hover:text-violet-700'
                    }`}>{cat.count}</span>
                  </button>
                );
              })}
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-4 flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-sm font-medium"><Filter className="h-4 w-4" /> Sort by</div>
                <Select value={sortBy} onValueChange={(v: SortOption)=>setSortBy(v)}>
                  <SelectTrigger className="w-40 h-9 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                    <SelectItem value="date" className="text-sm">Date (Soonest)</SelectItem>
                    <SelectItem value="newest" className="text-sm">Newest</SelectItem>
                    <SelectItem value="popular" className="text-sm">Popular</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </section>

          {/* Events */}
          <section>
            {filteredAndSortedEvents.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {filteredAndSortedEvents.map(event => {
                  const isPast = new Date(event.datetime) < new Date();
                  const eventLink = event.slug || event.id;
                  
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
                  
                  return (
                    <div key={event.id} className="relative group">
                      <Link href={`/events/${eventLink}`}>
                        {/* Poster */}
                        <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-gradient-to-br from-violet-300/70 to-blue-300/50 mb-3 shadow-[0_8px_30px_rgba(0,0,0,0.08)] transition-all duration-300 hover:shadow-[0_18px_40px_rgba(99,102,241,0.2)] hover:-translate-y-1">
                          {eventImageUrl ? (
                            <img 
                              src={eventImageUrl} 
                              alt={event.title} 
                              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="absolute inset-0 bg-gradient-to-br from-violet-300/70 to-blue-300/50 dark:from-violet-900/70 dark:to-blue-900/50 flex items-center justify-center">
                              <Calendar className="h-12 w-12 text-white/60" />
                            </div>
                          )}
                          
                          {isPast && (
                            <div className="absolute top-2 right-2">
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900/70 dark:bg-slate-100/70 text-white dark:text-slate-900 backdrop-blur-sm">Past</span>
                            </div>
                          )}
                        </div>
                      </Link>

                      {/* Event Title */}
                      <Link href={`/events/${eventLink}`}>
                        <h3 className="font-semibold text-sm text-slate-900 dark:text-white line-clamp-2 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                          {event.title}
                        </h3>
                      </Link>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur rounded-3xl p-6 border border-slate-200/60 dark:border-slate-800/60 shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)]">
                <div className="py-12 text-center">
                  <div className="w-16 h-16 bg-violet-50 dark:bg-violet-950 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Search className="h-8 w-8 text-violet-500 dark:text-violet-400" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{searchTerm ? 'No events found' : 'No public events yet'}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-sm mx-auto">{searchTerm ? 'Try different keywords or clear filters.' : 'Be the first to host something people can join!'}</p>
                  <Button asChild className="rounded-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white">
                    <Link href="/create-event">Create Event</Link>
                  </Button>
                </div>
              </div>
            )}
          </section>
        </main>
        <MobileNav />
    </div>
  );
}

