import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, MapPin, Globe, Lock, Plus, Palette, Image, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import Header from "@/components/layout/header";
import { ThemeSelector } from "@/components/theme-selector";
import { ThemeBackground } from "@/components/theme-background";
import PosterGallery from "@/components/poster-gallery";
import PosterCustomizer from "@/components/poster-customizer";
import { getThemeById } from "@shared/themes";

// Schema
const createEventSchema = z.object({
  title: z.string().min(1, "Event title is required"),
  eventType: z.enum(["offline", "online"]),
  datetime: z.string().min(1, "Date and time are required").refine((val) => {
    const d = new Date(val); return d >= new Date();
  }, { message: "Event date and time must be in the future" }),
  location: z.string().optional(),
  mapLink: z.string().optional(),
  description: z.string().optional(),
  maxGuests: z.number().min(1, "Must allow at least 1 guest"),
  isPrivate: z.boolean(),
  themeId: z.string().min(1, "Please select a theme"),
  communityId: z.number().optional(),
  posterData: z.any().optional()
});
type CreateEventFormData = z.infer<typeof createEventSchema>;

export default function CreateEventPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTheme, setSelectedTheme] = useState('quantum-dark');
  const [posterData, setPosterData] = useState<any>(null);
  const [isPosterCustomizerOpen, setIsPosterCustomizerOpen] = useState(false);
  const [posterError, setPosterError] = useState("");
  const theme = getThemeById(selectedTheme);

  // Fetch user's communities
  const { data: userCommunities = [] } = useQuery({
    queryKey: ["/api/profile/communities"],
    queryFn: async () => {
      const response = await fetch("/api/profile/communities", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch communities");
      return response.json();
    },
  });

  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<CreateEventFormData>({
    resolver: zodResolver(createEventSchema),
    defaultValues: { eventType: 'offline', isPrivate: false, themeId: selectedTheme, maxGuests: 10 }
  });
  const eventType = watch('eventType');
  const formValues = watch();

  // Sync poster title if user edits event title
  useEffect(() => {
    if (posterData && formValues.title) {
      setPosterData((prev: any) => ({ ...prev, customTitle: formValues.title }));
    }
  }, [formValues.title, posterData]);

  const createEventMutation = useMutation({
    mutationFn: async (data: CreateEventFormData & { posterData?: any }) => {
      const payload = { ...data, datetime: new Date(data.datetime).toISOString(), posterData: data.posterData };
      const res = await apiRequest('POST', '/api/events', payload);
      if (!res.ok) throw new Error((await res.json()).message || 'Failed to create event');
      return res.json();
    },
    onSuccess: (ev) => {
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      toast({ title: 'Event created', description: 'Your event has been created.' });
      setLocation(`/events/${ev.id}`);
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message || 'Failed to create event', variant: 'destructive' })
  });

  const onSubmit = (data: CreateEventFormData) => {
    if (!posterData) {
      setPosterError('Please select or customize a poster');
      document.getElementById('poster-section')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    setPosterError('');
    createEventMutation.mutate({ ...data, posterData });
  };

  const handleSavePoster = (pd: any) => {
    setPosterData(pd); setPosterError(''); setIsPosterCustomizerOpen(false);
    toast({ title: 'Poster saved', description: 'Your custom poster is ready.' });
  };

  // UI
  return (
    <ThemeBackground theme={theme} className="min-h-screen">
      <div className="absolute inset-0 bg-black/25" />
      <div className="relative z-10 min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 px-4 sm:px-6 lg:px-8 pt-28 pb-16">
          <div className="max-w-7xl mx-auto space-y-10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-white tracking-tight drop-shadow">Create Event</h1>
                <p className="text-white/70 text-sm mt-1">Set up details, customize a poster, and share it.</p>
              </div>
              <Link href="/">
                <Button variant="outline" className="border-white/30 text-white hover:bg-white/15 self-start sm:self-center"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
              </Link>
            </div>

            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="grid lg:grid-cols-5 gap-10 items-start">
                {/* Left Form */}
                <div className="lg:col-span-3 space-y-8">
                  <div className="rounded-2xl border border-white/15 bg-white/5 backdrop-blur-xl p-6 md:p-8 shadow-xl space-y-10">
                    {/* Basic Info */}
                    <section className="space-y-6">
                      <header className="space-y-1">
                        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/15 text-[11px] font-medium">1</span>
                          Basic Info
                        </h2>
                        <p className="text-xs text-white/50">Name and schedule.</p>
                      </header>
                      <div className="grid gap-5">
                        <div className="space-y-2">
                          <Label htmlFor="title" className="text-white">Event Title</Label>
                          <Input id="title" {...register('title')} placeholder="Epic Friday Game Night 🎮" className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:bg-white/20" />
                          {errors.title && <p className="text-sm text-red-300">{errors.title.message}</p>}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="eventType" className="text-white">Event Type</Label>
                          <Select defaultValue="offline" onValueChange={(v) => setValue('eventType', v as any)}>
                            <SelectTrigger className="bg-white/10 border-white/20 text-white"><SelectValue placeholder="Select type" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="offline">In-Person Party</SelectItem>
                              <SelectItem value="online">Gaming Session</SelectItem>
                            </SelectContent>
                          </Select>
                          {errors.eventType && <p className="text-sm text-red-300">{errors.eventType.message}</p>}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="communityId" className="text-white">Community (Optional)</Label>
                          <Select onValueChange={(v) => setValue('communityId', v === 'standalone' ? undefined : parseInt(v))}>
                            <SelectTrigger className="bg-white/10 border-white/20 text-white">
                              <SelectValue placeholder="Standalone event or select community" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="standalone">🎉 Standalone Event</SelectItem>
                              {userCommunities.map((community: any) => (
                                <SelectItem key={community.id} value={community.id.toString()}>
                                  {community.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-white/50">Choose a community to organize this event under, or keep it standalone.</p>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-5">
                        <div className="space-y-2">
                          <Label htmlFor="datetime" className="text-white">Date & Time</Label>
                          <Input id="datetime" type="datetime-local" min={new Date().toISOString().slice(0, 16)} {...register('datetime')} className="bg-white/10 border-white/20 text-white focus:bg-white/20" />
                          {errors.datetime && <p className="text-sm text-red-300">{errors.datetime.message}</p>}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="maxGuests" className="text-white">Max Guests</Label>
                          <Input id="maxGuests" type="number" {...register('maxGuests', { valueAsNumber: true })} min={1} className="bg-white/10 border-white/20 text-white focus:bg-white/20" />
                          {errors.maxGuests && <p className="text-sm text-red-300">{errors.maxGuests.message}</p>}
                        </div>
                      </div>
                      </div>
                    </section>

                    {/* Location */}
                    {eventType === 'offline' && (
                      <section className="space-y-6">
                        <header className="space-y-1">
                          <h2 className="text-xl font-semibold text-white flex items-center gap-2"><span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/15 text-[11px] font-medium">2</span>Location</h2>
                          <p className="text-xs text-white/50">Where guests should arrive.</p>
                        </header>
                        <div className="grid gap-5">
                          <div className="space-y-2">
                            <Label htmlFor="location" className="text-white flex items-center gap-2"><MapPin className="h-4 w-4" />Location Name</Label>
                            <Input id="location" {...register('location')} placeholder="Mike's Gaming Den" className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:bg-white/20" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="mapLink" className="text-white flex items-center gap-2"><Globe className="h-4 w-4" />Map Link (optional)</Label>
                            <Input id="mapLink" {...register('mapLink')} placeholder="https://maps.google.com/..." className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:bg-white/20" />
                            <p className="text-xs text-white/50">Paste any Google / Apple Maps URL.</p>
                          </div>
                        </div>
                      </section>
                    )}

                    {/* Description */}
                    <section className="space-y-6">
                      <header className="space-y-1">
                        <h2 className="text-xl font-semibold text-white flex items-center gap-2"><span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/15 text-[11px] font-medium">{eventType === 'offline' ? '3' : '2'}</span>Description</h2>
                        <p className="text-xs text-white/50">Tell guests what to expect.</p>
                      </header>
                      <div className="space-y-2">
                        <Label htmlFor="description" className="text-white">Event Description</Label>
                        <Textarea id="description" {...register('description')} placeholder="Snacks, tournaments, team battles..." className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:bg-white/20 min-h-[120px]" />
                      </div>
                    </section>

                    {/* Privacy */}
                    <section className="space-y-6">
                      <header className="space-y-1">
                        <h2 className="text-xl font-semibold text-white flex items-center gap-2"><span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/15 text-[11px] font-medium">{eventType === 'offline' ? '4' : '3'}</span>Privacy</h2>
                        <p className="text-xs text-white/50">Control who can discover this event.</p>
                      </header>
                      <div className="flex flex-wrap gap-4">
                        <button type="button" onClick={() => setValue('isPrivate', false)} className={`group flex-1 min-w-[140px] rounded-xl border p-4 text-left transition ${!watch('isPrivate') ? 'border-green-400/60 bg-green-400/10 shadow-inner' : 'border-white/15 hover:bg-white/10'} text-white`}>
                          <div className="flex items-center gap-3 mb-1"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15"><Globe className="h-3.5 w-3.5" /></span><span className="text-sm font-medium">Public</span></div>
                          <p className="text-[11px] text-white/60">Anyone can find & join</p>
                        </button>
                        <button type="button" onClick={() => setValue('isPrivate', true)} className={`group flex-1 min-w-[140px] rounded-xl border p-4 text-left transition ${watch('isPrivate') ? 'border-purple-400/60 bg-purple-400/10 shadow-inner' : 'border-white/15 hover:bg-white/10'} text-white`}>
                          <div className="flex items-center gap-3 mb-1"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15"><Lock className="h-3.5 w-3.5" /></span><span className="text-sm font-medium">Private</span></div>
                          <p className="text-[11px] text-white/60">Only invited guests</p>
                        </button>
                      </div>
                      <p className="text-xs text-white/50">{watch('isPrivate') ? 'Only invited guests can view and RSVP.' : 'Event is discoverable by others.'}</p>
                    </section>

                    <div className="pt-4 border-t border-white/10">
                      <Button type="submit" disabled={createEventMutation.isPending} className="w-full brand-gradient text-white shadow-lg shadow-cyan-400/30 hover:brightness-110">
                        <Save className="mr-2 h-4 w-4" /> {createEventMutation.isPending ? 'Creating...' : 'Create Event'}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Right Side */}
                <div className="lg:col-span-2 space-y-8">
                  <div id="poster-section" className="rounded-2xl border border-white/15 bg-white/5 backdrop-blur-xl p-6 md:p-8 shadow-xl">
                    <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
                      <h3 className="text-xl font-semibold text-white flex items-center"><Image className="mr-2 h-5 w-5" /> Poster Preview <span className="text-red-400 ml-1">*</span></h3>
                      <div className="flex gap-2">
                        {!posterData && (
                          <Button type="button" onClick={() => {
                            const defaultPoster = { template: { gradient: 'from-blue-600 to-purple-600', textColor: 'text-white', accentColor: 'text-blue-200' }, customTitle: formValues.title || 'Your Event Title', customSubtitle: '', showDetails: true };
                            setPosterData(defaultPoster); setPosterError(''); toast({ title: 'Default poster selected', description: 'You can customize it further.' });
                          }} variant="outline" size="sm" className="border-green-400/50 text-green-400 hover:bg-green-400/10">Use Default</Button>
                        )}
                        <Button type="button" onClick={() => setIsPosterCustomizerOpen(true)} variant="outline" size="sm" className="border-white/30 text-white hover:bg-white/15"><Plus className="mr-2 h-4 w-4" /> {posterData ? 'Edit Poster' : 'Create Custom'}</Button>
                      </div>
                    </div>
                    {posterError && <p className="text-sm text-red-300 mb-3">{posterError}</p>}
                    <div className={`mx-auto max-w-sm transition-all ${posterError ? 'ring-2 ring-red-400/50 rounded-lg' : ''}`}>
                      <PosterGallery event={{ id: 0, title: formValues.title || 'Your Event Title', datetime: formValues.datetime || new Date().toISOString(), location: formValues.location || (eventType === 'offline' ? 'Your Location' : ''), description: formValues.description || '', themeId: selectedTheme, posterData }} onCustomize={() => setIsPosterCustomizerOpen(true)} isPreview={true} />
                    </div>
                    <div className="text-center mt-4">
                      <p className="text-xs text-white/60">{posterData ? <span className="text-green-400">✓ Poster selected</span> : <span>Select or create a poster <span className="text-red-400">*</span></span>}</p>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/15 bg-white/5 backdrop-blur-xl p-6 md:p-8 shadow-xl">
                    <h3 className="text-xl font-semibold text-white flex items-center mb-4"><Palette className="mr-2 h-5 w-5" /> Theme & Background</h3>
                    <div className="space-y-4">
                      <ThemeSelector selectedTheme={selectedTheme} onThemeSelect={(t) => { setSelectedTheme(t); setValue('themeId', t); }} />
                      <p className="text-xs text-white/50">Theme updates page ambiance and poster styling.</p>
                    </div>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </main>

        <PosterCustomizer
          open={isPosterCustomizerOpen}
          onOpenChange={setIsPosterCustomizerOpen}
          eventData={{ id: 0, title: formValues.title || 'Your Event Title', datetime: formValues.datetime || new Date().toISOString(), location: formValues.location || (eventType === 'offline' ? 'Your Location' : ''), description: formValues.description || '', themeId: selectedTheme, posterData }}
          onSave={handleSavePoster}
        />
      </div>
    </ThemeBackground>
  );
}
