import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Plus } from "lucide-react";
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

  // Memoized filters for performance
  const filteredEvents = useMemo(() => {
    const now = new Date();
    switch (filter) {
      case "hosting": 
        return eventList.filter(e => e.hostId === (user as any)?.id && new Date(e.datetime) >= now);
      case "attending": 
        return eventList.filter(e => e.hostId !== (user as any)?.id && new Date(e.datetime) >= now);
      case "past": 
        return eventList.filter(e => new Date(e.datetime) < now);
      default: 
        return eventList;
    }
  }, [filter, eventList, user]);

  const hostingCount = eventList.filter(e => e.hostId === (user as any)?.id && new Date(e.datetime) >= new Date()).length;
  const attendingCount = eventList.filter(e => e.hostId !== (user as any)?.id && new Date(e.datetime) >= new Date()).length;

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
        <div className="group cursor-pointer h-full">
          <div className="h-full bg-white dark:bg-slate-900 rounded-2xl shadow-sm hover:shadow-md border border-slate-200 dark:border-slate-800 overflow-hidden transition-all duration-300 hover:-translate-y-1">
            <div className="relative aspect-[4/3] overflow-hidden bg-slate-100 dark:bg-slate-800">
              {image ? (
                <img
                  src={image}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  alt={event.title}
                />
              ) : (
                <div className="absolute inset-0 bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                   <Calendar className="text-slate-300 dark:text-slate-600 h-10 w-10" />
                </div>
              )}

              <div className="absolute top-3 left-3 text-[11px] px-2.5 py-1 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium shadow-sm">
                {formatEventDate(event.datetime)}
              </div>

              <div className="absolute top-3 right-3">
                <span className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded-full font-bold shadow-sm ${
                  isPast
                    ? "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                    : isHost
                    ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 ring-1 ring-indigo-200 dark:ring-indigo-800"
                    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 ring-1 ring-emerald-200 dark:ring-emerald-800"
                }`}>
                  {isPast ? "Past" : isHost ? "Hosting" : "Attending"}
                </span>
              </div>
            </div>

            <div className="p-4 flex flex-col justify-between" style={{ minHeight: '120px' }}>
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white line-clamp-1 mb-1.5">
                  {event.title}
                </h3>
  
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-xs">
                  <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate">{event.location || "Location TBD"}</span>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <div className="flex -space-x-1.5">
                  <div className="h-6 w-6 rounded-full bg-indigo-100 dark:bg-indigo-900 border-2 border-white dark:border-slate-900" />
                  <div className="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900 border-2 border-white dark:border-slate-900" />
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Guests</span>
              </div>
            </div>
          </div>
        </div>
      </Link>
    );
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-slate-200 dark:border-slate-800 border-t-indigo-600 dark:border-t-indigo-400 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans pb-20">
      <Header />

      {/* Hero Section */}
      <section className="pt-24 md:pt-32 pb-8 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 p-6 md:p-10 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">
              Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, <span className="text-indigo-600 dark:text-indigo-400">{(user as any)?.firstName || "there"}</span>
            </h1>
            <p className="text-slate-600 dark:text-slate-400 font-medium">
              You are hosting {hostingCount} upcoming event{hostingCount === 1 ? '' : 's'} and attending {attendingCount}.
            </p>
          </div>
          <Button asChild size="lg" className="rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex-shrink-0 w-full md:w-auto shadow-md">
             <Link href="/create-event">
               <Plus className="h-5 w-5 mr-2" />
               Create Event
             </Link>
          </Button>
        </div>
      </section>

      {/* Events Feed Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6">
        
        {/* Controls / Tabs */}
        <div className="flex items-center justify-between gap-4 mb-6 sticky top-20 z-10 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-md pt-2 pb-4">
          <div className="flex gap-2 overflow-x-auto hide-scrollbar w-full leading-none">
            {(["all", "hosting", "attending", "past"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap capitalize border ${
                  filter === f
                    ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-sm"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Content Grid */}
        {filteredEvents.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredEvents.map((event) => (
              <EventCard key={event.id} event={event} userId={String((user as any)?.id)} />
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 p-12 text-center mt-4">
            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="h-8 w-8 text-slate-400 dark:text-slate-500" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No events found</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-sm mx-auto">
              You don't have any events in this view right now. Start building your community!
            </p>
            <Button asChild variant="outline" className="rounded-full border-slate-300 dark:border-slate-700">
              <Link href="/create-event">Create New Event</Link>
            </Button>
          </div>
        )}
      </main>

      <MobileNav />
    </div>
  );
}