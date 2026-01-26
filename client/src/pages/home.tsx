import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Plus,ChevronLeft, ChevronRight  } from "lucide-react";
import { useMemo, useState, memo } from "react";
import { Link } from "wouter";
import Header from "@/components/layout/header";
import MobileNav from "@/components/layout/mobile-nav";

export default function Home() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<"all" | "hosting" | "attending" | "past">("all");

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["/api/events"],
  });

  const eventList = (events as any[]) || [];
  const EventPoster = memo(({ event }: { event: any }) => {
    // Image Logic
    const image = event.imageUrl || (event.posterData ? (typeof event.posterData === 'string' ? JSON.parse(event.posterData) : event.posterData)?.selectedImage : null);

    return (
      <Link href={`/events/${event.slug || event.id}`}>
        {/* Fixed width for scrolling consistency */}
        <div className="w-[200px] sm:w-[240px] flex-shrink-0 group cursor-pointer">
          
          {/* Poster Image Only - Square Ratio */}
          <div className="relative aspect-square rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 mb-3 shadow-sm transition-all duration-500 group-hover:shadow-xl group-hover:-translate-y-2">
            {image ? (
              <img 
                src={image} 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                alt={event.title} 
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-violet-200 to-indigo-200 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center">
                <Calendar className="text-violet-400 dark:text-gray-500 opacity-50 h-12 w-12" />
              </div>
            )}
            
            {/* Optional: Subtle gradient overlay at bottom so text doesn't look floating? 
                (Removed per request for 'just poster and name', but kept clean) */}
          </div>

          {/* Event Name Only */}
          <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors truncate">
            {event.title}
          </h3>
          {/* Optional: Tiny date text if you change your mind later, otherwise hidden */}
          {/* <p className="text-sm text-slate-500 mt-1">{new Date(event.datetime).toLocaleDateString()}</p> */}
        </div>
      </Link>
    );
  });

  // Memoized filters for performance
  const filteredEvents = useMemo(() => {
    const now = new Date();
    switch (filter) {
      case "hosting": return eventList.filter(e => e.hostId === (user as any)?.id);
      case "attending": return eventList.filter(e => e.hostId !== (user as any)?.id);
      case "past": return eventList.filter(e => new Date(e.datetime) < now);
      default: return eventList;
    }
  }, [filter, eventList, user]);

  const formatEventDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

  const EventCard = memo(({ event, userId }: { event: any; userId: string }) => {
    const isHost = event.hostId === userId;
    const isPast = new Date(event.datetime) < new Date();
    
    // Improved Image Logic
    const image = event.imageUrl || (event.posterData ? (typeof event.posterData === 'string' ? JSON.parse(event.posterData) : event.posterData)?.selectedImage : null);

    return (
      <Link href={`/events/${event.slug || event.id}`}>
        <div className="w-[260px] sm:w-[280px] flex-shrink-0 snap-start cursor-pointer group">
          <div className="bg-white dark:bg-gray-950 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.5)] border border-slate-100 dark:border-gray-800 overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(99,102,241,0.2)]">
            <div className="relative aspect-[4/3] overflow-hidden">
              {image ? (
                <img
                  src={image}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  alt={event.title}
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-violet-300/70 to-blue-300/50 dark:from-gray-800/70 dark:to-gray-900/50" />
              )}

              <div className="absolute top-3 left-3 text-[11px] px-2.5 py-1 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur border border-white/60 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 font-medium">
                {formatEventDate(event.datetime)}
              </div>

              <div className="absolute top-3 right-3">
                <span className={`text-[11px] px-2.5 py-1 rounded-full font-medium shadow-sm ${
                  isPast
                    ? "bg-slate-900/70 text-white"
                    : isHost
                    ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white"
                    : "bg-white/90 text-slate-600"
                }`}>
                  {isPast ? "Past" : isHost ? "Hosting" : "Attending"}
                </span>
              </div>
            </div>

            <div className="p-4 space-y-2 min-h-[108px]">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white line-clamp-1">
                {event.title}
              </h3>

              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-xs">
                <MapPin className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                <span className="truncate">{event.location || "Main Street, Downtown"}</span>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex -space-x-2">
                  <div className="h-7 w-7 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 border-2 border-white" />
                  <div className="h-7 w-7 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 border-2 border-white" />
                  <div className="h-7 w-7 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 border-2 border-white" />
                </div>
                <span className="text-xs px-3 py-1 rounded-full bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-sm">
                  {isPast ? "Past" : "Going"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Link>
    );
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-black">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-indigo-200 dark:border-indigo-800 border-t-indigo-600 dark:border-t-indigo-400 rounded-full animate-spin" />
          <p className="text-slate-500 dark:text-slate-400 font-medium animate-pulse">Loading your vibes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-black text-slate-900 dark:text-slate-100 font-sans">
      <Header />

      {/* Hero Section */}
      <section className="relative pt-20 overflow-hidden isolate">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-50/60 via-white to-purple-50/40 dark:from-gray-950 dark:via-black dark:to-gray-900" />
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-b from-transparent to-[#F8FAFC] dark:to-black" />

        <div className="max-w-7xl mx-auto relative z-10 grid lg:grid-cols-2 gap-12 items-center">
          
          {/* LEFT COLUMN: Text Content */}
          <div className="flex flex-col items-start pl-6 max-w-xl">
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white mb-3">
              Welcome, <span className="text-indigo-600 dark:text-indigo-400">{(user as any)?.firstName || "there"}</span> 👋
            </h1>
            <p className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">
              Plan, share, and organize <span className="text-violet-500 dark:text-gray-200">events in one place.</span>
            </p>
            {/* <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md leading-relaxed">
              Manage your events, customize posters, and connect with your community seamlessly.
            </p> */}
            
            {/* Mobile-only CTA (since floating visuals are hidden on mobile) */}
            <div className="mt-6 lg:hidden">
                <Button asChild className="rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900">
                   <Link href="/create-event">Get Started</Link>
                </Button>
            </div>
          </div>

          {/* RIGHT COLUMN: Floating Decor Area */}
          <div className="relative h-[320px] hidden lg:block w-full">
            
            {/* Sticky Note - Now on the Right (Inner Left) */}
            <div className="absolute left-10 top-10 z-10">
              <div className="w-40 p-3.5 bg-yellow-100 dark:bg-yellow-900/80 rounded-xl shadow-xl rotate-[-6deg] animate-float">
                <p className="text-xs font-medium text-slate-800 dark:text-yellow-100 leading-snug">
                  Plan amazing
                  <br />
                  events together ❤️
                </p>
                <span className="absolute -top-2 left-1/2 w-3 h-3 bg-red-500 rounded-full -translate-x-1/2" />
              </div>
            </div>

            {/* Event Card Preview - Now on the Right (Inner Right) */}
            <div className="absolute right-0 top-6 z-20">
              <div className="w-60 rounded-2xl overflow-hidden shadow-2xl rotate-[4deg] bg-white dark:bg-slate-900 animate-float-delayed border border-slate-100 dark:border-slate-800">
                <div className="p-4 bg-white dark:bg-slate-900">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="text-sm font-bold text-slate-900 dark:text-white">Birthday Dinner</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Sat, May 12 · 7:00 PM</div>
                    </div>
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="h-1.5 w-3/4 bg-slate-100 dark:bg-slate-800 rounded" />
                    <div className="h-1.5 w-1/2 bg-slate-100 dark:bg-slate-800 rounded" />
                  </div>
                </div>
              </div>
            </div>

            {/* Create Event Pill - Right Bottom */}
            <div className="absolute right-12 bottom-12 z-30">
              <Link href="/create-event">
                <div className="px-5 py-2.5 rounded-full bg-gradient-to-r from-violet-600 to-purple-600 shadow-lg flex items-center gap-2 hover:scale-105 transition-transform cursor-pointer">
                  <span className="text-white font-semibold text-xs">Create Event</span>
                  <span className="text-white text-sm">→</span>
                </div>
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* Events */}
      <main className="max-w-7xl mx-auto px-6 pb-32 mt-6">
      <div className="bg-white/70 dark:bg-gray-900/90 backdrop-blur rounded-3xl p-6 border border-slate-200/60 dark:border-gray-800/60 shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
        
        {/* Header & Controls */}
        <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Your Events</h2>
            <span className="px-2.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300 text-xs font-medium">
              {filteredEvents.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="h-9 w-9 flex items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-violet-600 dark:hover:text-violet-400 hover:border-violet-300 dark:hover:border-violet-600 hover:shadow-sm transition-all active:scale-95"
              onClick={() => {
                const el = document.getElementById("eventsScroller");
                if (el) el.scrollBy({ left: -360, behavior: "smooth" });
              }}
              aria-label="Scroll left"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              className="h-9 w-9 flex items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-violet-600 dark:hover:text-violet-400 hover:border-violet-300 dark:hover:border-violet-600 hover:shadow-sm transition-all active:scale-95"
              onClick={() => {
                const el = document.getElementById("eventsScroller");
                if (el) el.scrollBy({ left: 360, behavior: "smooth" });
              }}
              aria-label="Scroll right"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2 hide-scrollbar">
          {(["all", "hosting", "attending", "past"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap ${
                filter === f
                  ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md"
                  : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-violet-300 dark:hover:border-violet-600 hover:text-violet-700 dark:hover:text-violet-400 hover:bg-slate-50 dark:hover:bg-slate-700"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Horizontal Scroller */}
        {filteredEvents.length > 0 ? (
          <div id="eventsScroller" className="overflow-x-auto hide-scrollbar scroll-smooth pb-4"> {/* pb-4 added for hover lift room */}
            <div className="flex gap-6 sm:gap-8">
              {filteredEvents.map((event) => (
                <EventPoster key={event.id} event={event} />
              ))}
            </div>
          </div>
        ) : (
          <div className="py-20 text-center">
            <div className="w-16 h-16 bg-violet-50 dark:bg-violet-950 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-bounce-slow">
              <Calendar className="h-8 w-8 text-violet-500 dark:text-violet-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No events yet</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-xs mx-auto">
              Create your first event and get people together.
            </p>
            <Button asChild className="rounded-full px-6 h-11 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100">
              <Link href="/create-event">Create Your First Event</Link>
            </Button>
          </div>
        )}
      </div>
    </main>

      <MobileNav />
    </div>
  );
}