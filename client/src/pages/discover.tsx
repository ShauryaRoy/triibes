import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Link } from "wouter";
import Header from "@/components/layout/header";
import MobileNav from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Event } from "@shared/schema";
import {
  Calendar,
  Users,
  MapPin,
  Search,
  Plus
} from "lucide-react";
import { SEO } from "@/components/SEO";

interface EventWithCounts extends Event {
  rsvpCount?: number;
  goingCount?: number;
}

type FilterCategory = "all" | "gaming" | "gatherings" | "this-week";
type SortOption = "date" | "popular";

export default function Discover() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<FilterCategory>("all");
  const [sortBy, setSortBy] = useState<SortOption>("date");

  const { data: events = [], isLoading } = useQuery<EventWithCounts[]>({
    queryKey: ["/api/events/discover"],
    staleTime: 60000,
  });

  const isThisWeek = (dateString: string) => {
    const eventDate = new Date(dateString);
    const now = new Date();
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return eventDate > now && eventDate <= oneWeekFromNow;
  };

  const filteredEvents = useMemo(() => {
    let filtered = [...events];
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(ev => ev.title.toLowerCase().includes(term) || ev.description?.toLowerCase().includes(term));
    }
    if (selectedCategory === "gaming") filtered = filtered.filter(e => e.eventType === "online");
    if (selectedCategory === "gatherings") filtered = filtered.filter(e => e.eventType === "offline");
    if (selectedCategory === "this-week") filtered = filtered.filter(e => isThisWeek(e.datetime.toString()));

    if (sortBy === "date") filtered.sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());
    if (sortBy === "popular") filtered.sort((a, b) => (b.goingCount || 0) - (a.goingCount || 0));

    return filtered;
  }, [events, searchTerm, selectedCategory, sortBy]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="w-8 h-8 border-4 border-slate-200 dark:border-slate-800 border-t-indigo-600 dark:border-t-indigo-400 rounded-full animate-spin" />
      </div>
    );
  }

  const EventPoster = ({ event }: { event: any }) => {
    const image = event.imageUrl || (event.posterData ? (typeof event.posterData === 'string' ? JSON.parse(event.posterData) : event.posterData)?.selectedImage : null);
    
    return (
      <Link href={`/events/${event.slug || event.id}`}>
        <div className="group cursor-pointer">
          <div className="relative aspect-square rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1">
            {image ? (
              <img src={image} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt={event.title} />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                 <Calendar className="h-10 w-10 text-slate-300 dark:text-slate-700" />
              </div>
            )}
            <div className="absolute top-2 left-1.5 right-1.5 flex justify-between">
               <span className="text-[10px] uppercase font-black px-2 py-1 rounded-lg bg-white/90 dark:bg-slate-900/90 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800">
                  {new Date(event.datetime).toLocaleDateString([], { month: 'short', day: 'numeric' })}
               </span>
            </div>
          </div>
          <h3 className="mt-3 text-sm font-bold text-slate-900 dark:text-white line-clamp-2 leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            {event.title}
          </h3>
          <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
             <MapPin className="h-3 w-3" />
             <span className="truncate">{event.location || "TBD"}</span>
          </div>
        </div>
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans pb-20">
      <SEO title="Discover Events" />
      <Header />

      {/* Simplified Functional Hero */}
      <section className="pt-24 md:pt-32 pb-8 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 p-6 md:p-10 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 md:gap-12 relative overflow-hidden group">
           {/* Subtle decorative elements */}
           <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 dark:bg-indigo-900/10 rounded-full -translate-y-1/2 translate-x-1/2" />
           <div className="absolute bottom-0 left-0 w-24 h-24 bg-emerald-50 dark:bg-emerald-900/10 rounded-full translate-y-1/2 -translate-x-1/2" />

           <div className="relative z-10 text-center md:text-left max-w-xl">
             <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white mb-2">
               Discover <span className="text-indigo-600 dark:text-indigo-400">Vibes</span>
             </h1>
             <p className="text-slate-600 dark:text-slate-400 font-medium">
               Find the experiences you care about, from high-energy gaming to social gatherings.
             </p>
           </div>
           <Button asChild size="lg" className="rounded-full bg-indigo-600 hover:bg-indigo-700 text-white h-11 px-8 font-semibold shadow-md hover:scale-[1.02] transition-all relative z-10 w-full md:w-auto">
             <Link href="/create-event">
               <Plus className="h-5 w-5 mr-3" />
               Host Event
             </Link>
           </Button>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 md:px-6">
        
        {/* Filters & Search */}
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 p-6 mb-12 shadow-sm">
           <div className="flex flex-col lg:flex-row gap-4 items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search and find events..."
                  className="pl-12 h-12 rounded-full border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>
              <div className="flex gap-2 w-full lg:w-auto">
                 <Select value={selectedCategory} onValueChange={(v: any) => setSelectedCategory(v)}>
                    <SelectTrigger className="h-12 w-full sm:w-48 rounded-full border-slate-200 dark:border-slate-800 font-bold uppercase text-[10px] tracking-widest px-6 shadow-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                       <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl">
                       <SelectItem value="all">Everywhere</SelectItem>
                       <SelectItem value="gaming">Gaming/Online</SelectItem>
                       <SelectItem value="gatherings">Gatherings/Offline</SelectItem>
                       <SelectItem value="this-week">This Week</SelectItem>
                    </SelectContent>
                 </Select>
                 <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                    <SelectTrigger className="h-12 w-full sm:w-40 rounded-full border-slate-200 dark:border-slate-800 font-bold uppercase text-[10px] tracking-widest px-6 shadow-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                       <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl">
                       <SelectItem value="date">Soonest</SelectItem>
                       <SelectItem value="popular">Popular</SelectItem>
                    </SelectContent>
                 </Select>
              </div>
           </div>
        </div>

        {/* Results Grid */}
        {filteredEvents.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-6 gap-y-10">
            {filteredEvents.map(event => (
              <EventPoster key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <div className="py-32 text-center">
            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-6">
               <Search className="h-10 w-10 text-slate-300" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">No results found</h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium">Try broadening your search criteria.</p>
          </div>
        )}
      </main>

      <MobileNav />
    </div>
  );
}
