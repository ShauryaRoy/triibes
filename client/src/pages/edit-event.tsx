import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import LazyImage from "@/components/ui/lazy-image";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, MapPin, Plus, Palette, Image, Users, Edit3, X, Check, Settings, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import Header from "@/components/layout/header";
import { ThemeBackground } from "@/components/ThemeBackground";
import { PosterSelector } from "@/components/poster-selector";
import { ThemeSelector } from "@/components/theme-selector";
import { ManageEventPopup } from "@/components/manage-event-popup";
import { useAuth } from "@/hooks/useAuth";
import { ExtraInfoDialog, type ExtraInfoItem } from "@/components/extra-info-dialog";
// Note: payments/price/privacy/community are immutable post-creation and are not editable here.

// Schema
const editEventSchema = z.object({
  title: z.string().min(1, "Event title is required"),
  eventType: z.enum(["offline", "online"]),
  datetime: z.string().min(1, "Date and time are required"),
  endDatetime: z.string().min(1, "End date and time are required"),
  location: z.string().optional(),
  mapLink: z.string().optional(),
  description: z.string().optional(),
  maxGuests: z.number().min(1, "Must allow at least 1 guest"),
  themeId: z.string().min(1, "Please select a theme"),
  posterData: z.any().optional()
}).refine((data) => {
  const start = new Date(data.datetime);
  const end = new Date(data.endDatetime);
  return end > start;
}, {
  message: "End date must be after start date",
  path: ["endDatetime"],
});

type EditEventFormData = z.infer<typeof editEventSchema>;

export default function EditEventPage() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/edit-event/:id");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [selectedTheme, setSelectedTheme] = useState('matrix-code');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [expandedActions, setExpandedActions] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['basic']));
  const [isPosterSelectorOpen, setIsPosterSelectorOpen] = useState(false);
  const [selectedPoster, setSelectedPoster] = useState<any>(null);
  const [hasPosterChanged, setHasPosterChanged] = useState(false); // Track if user changed poster
  const [hasThemeChanged, setHasThemeChanged] = useState(false); // Track if user changed theme
  const [isManagePopupOpen, setIsManagePopupOpen] = useState(false);
  const [extraInfo, setExtraInfo] = useState<ExtraInfoItem[]>([]);
  const [isExtraInfoOpen, setIsExtraInfoOpen] = useState(false);

  const eventId = params?.id;

  // Fetch event data
  const { data: event, isLoading: eventLoading, error: eventError } = useQuery({
    queryKey: [`/api/events/${eventId}`],
    queryFn: async () => {
      const response = await fetch(`/api/events/${eventId}`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch event");
      return response.json();
    },
    enabled: !!eventId,
  });

  const { register, handleSubmit, formState: { errors }, watch, setValue, reset } = useForm<EditEventFormData>({
    resolver: zodResolver(editEventSchema),
    defaultValues: { 
      eventType: 'offline', 
      themeId: selectedTheme, 
      maxGuests: 10,
      datetime: "",
      endDatetime: "",
    }
  });

  const eventType = watch('eventType');
  const formValues = watch();

  // Populate form when event data loads
  useEffect(() => {
    if (event) {
      
      
      // Check if user is the host
      if (event.hostId !== user?.id) {
        toast({
          title: "Access denied",
          description: "You can only edit events you created.",
          variant: "destructive",
        });
        setLocation("/profile");
        return;
      }

      const parseServerDateTime = (value: any): Date => {
        if (value instanceof Date) return value;
        if (typeof value !== 'string') return new Date(value);

        // If timezone info exists, let Date parse it as absolute instant.
        if (value.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(value)) {
          return new Date(value);
        }

        // Treat timezone-less values as local wall-clock time.
        const normalized = value.replace(' ', 'T');
        const [datePart, timePartRaw = '00:00:00'] = normalized.split('T');
        const [year, month, day] = datePart.split('-').map(Number);
        const [hours = 0, minutes = 0, seconds = 0] = timePartRaw.split(':').map((n) => parseInt(n, 10) || 0);
        return new Date(year, (month || 1) - 1, day || 1, hours, minutes, seconds);
      };

      const toLocalDateTimeInput = (dt: Date) => {
        const year = dt.getFullYear();
        const month = String(dt.getMonth() + 1).padStart(2, '0');
        const day = String(dt.getDate()).padStart(2, '0');
        const hours = String(dt.getHours()).padStart(2, '0');
        const minutes = String(dt.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
      };

      // Convert UTC datetime to local datetime for the datetime-local input
      const eventDateTime = parseServerDateTime(event.datetime);
      const formattedDateTime = toLocalDateTimeInput(eventDateTime);

      // Ensure end datetime exists for editing; default to +1 hour if missing
      const fallbackEnd = new Date(eventDateTime.getTime() + 60 * 60 * 1000);
      const endDateTime = event.endDatetime ? parseServerDateTime(event.endDatetime) : fallbackEnd;
      const formattedEndDateTime = toLocalDateTimeInput(endDateTime);
      
      reset({
        title: event.title,
        eventType: event.eventType,
        datetime: formattedDateTime,
        endDatetime: formattedEndDateTime,
        location: event.location || "",
        mapLink: event.mapLink || "",
        description: event.description || "",
        maxGuests: event.maxGuests,
        themeId: hasThemeChanged ? selectedTheme : event.themeId,
      });
      
      if (!hasThemeChanged) {
        setSelectedTheme(event.themeId || 'matrix-code');
      }
      
      // Handle posterData - normalize the format
      // Only update if user hasn't made local changes
      if (!hasPosterChanged) {
        if (event.posterData) {
          const posterData = typeof event.posterData === 'string' 
            ? JSON.parse(event.posterData) 
            : event.posterData;
          
          // Handle different posterData formats
          if (posterData.selectedImage) {
            // Format from uploaded image or previously selected poster
            setSelectedPoster({
              url: typeof posterData.selectedImage === 'string' 
                ? posterData.selectedImage 
                : posterData.selectedImage.imageUrl,
              title: posterData.customTitle || posterData.selectedImage?.name || 'Custom Poster',
              id: posterData.imageId || posterData.selectedImage?.id || 'custom'
            });
          } else if (posterData.url) {
            // Direct format
            setSelectedPoster(posterData);
          }
        }
      }
      
      // Handle extra info
      const settings = typeof event.settings === 'string' 
        ? JSON.parse(event.settings) 
        : event.settings;
      
      if (settings?.extraInfo) {
        setExtraInfo(settings.extraInfo);
      } else {
        setExtraInfo([]);
      }
    }
  }, [event, reset, user, toast, setLocation, hasPosterChanged, hasThemeChanged, selectedTheme]);

  const updateEventMutation = useMutation({
    mutationFn: async (data: EditEventFormData & { posterData?: any }) => {
      const payload = { 
        ...data, 
        // Send datetime-local strings as-is; backend normalizes timezone consistently.
        datetime: data.datetime,
        endDatetime: data.endDatetime,
        posterData: data.posterData 
      };
      
      const res = await apiRequest('PUT', `/api/events/${eventId}`, payload);
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to update event');
      }
      return res.json();
    },
    onSuccess: (updatedEvent) => {
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      queryClient.invalidateQueries({ queryKey: ['/api/profile/events'] });
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}`] });
      setHasPosterChanged(false); // Reset flag after successful save
      setHasThemeChanged(false); // Reset flag after successful save
      toast({ 
        title: 'Event updated', 
        description: 'Your event has been successfully updated.' 
      });
      setLocation(`/events/${updatedEvent.slug || updatedEvent.id}`);
    },
    onError: (e: any) => {
      toast({ 
        title: 'Error', 
        description: e.message || 'Failed to update event', 
        variant: 'destructive' 
      });
    }
  });

  const onSubmit = (data: EditEventFormData) => {
    // Include poster data and extra info if available
    // Merge settings with existing settings to avoid losing data
    const existingSettings = typeof event?.settings === 'string' 
      ? JSON.parse(event.settings) 
      : (event?.settings || {});
    
    const eventData = {
      ...data,
      posterData: selectedPoster
        ? {
            selectedImage: selectedPoster.url,
            customTitle: selectedPoster.title || 'Custom Poster',
            imageId: selectedPoster.id,
          }
        : event?.posterData || null, // Preserve existing posterData if no changes
      settings: {
        ...existingSettings,
        extraInfo: extraInfo,
      },
    };

    updateEventMutation.mutate(eventData);
  };

  // Poster handlers
  const handlePosterSelect = (poster: any) => {
    setSelectedPoster(poster);
    setHasPosterChanged(true); // Mark that poster has been changed
    toast({ title: 'Poster selected', description: `${poster.title} has been selected for your event.` });
  };

  const handlePosterUpload = async (file: File) => {
    try {
      toast({ title: 'Uploading...', description: 'Please wait while we upload your poster.' });

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload/poster', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      const { url, id } = await response.json();

      const posterData = {
        id: id,
        title: file.name,
        url: url,
        category: 'uploaded'
      };
      
      setSelectedPoster(posterData);
      setHasPosterChanged(true); // Mark that poster has been changed
      toast({ 
        title: 'Poster uploaded', 
        description: 'Your custom poster has been uploaded successfully.' 
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({ 
        title: 'Upload failed', 
        description: 'Could not upload poster. Please try again.', 
        variant: 'destructive' 
      });
    }
  };

  if (!user) {
    return (
      <ThemeBackground themeId="none" className="min-h-screen">
        <div className="absolute inset-0 bg-black/25" />
        <div className="relative z-10 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Please log in</h2>
            <p className="text-white/70">You need to be logged in to edit events.</p>
          </div>
        </div>
      </ThemeBackground>
    );
  }

  if (eventLoading) {
    return (
      <ThemeBackground themeId="none" className="min-h-screen">
        <div className="absolute inset-0 bg-black/25" />
        <div className="relative z-10 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-white mx-auto mb-4" />
            <p className="text-white/70">Loading event...</p>
          </div>
        </div>
      </ThemeBackground>
    );
  }

  if (eventError || !event) {
    return (
      <ThemeBackground themeId="none" className="min-h-screen">
        <div className="absolute inset-0 bg-black/25" />
        <div className="relative z-10 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Event not found</h2>
            <p className="text-white/70 mb-6">The event you're looking for doesn't exist.</p>
            <Button asChild variant="outline" className="border-white/30 text-white hover:bg-white/15">
              <Link href="/profile">Back to Profile</Link>
            </Button>
          </div>
        </div>
      </ThemeBackground>
    );
  }

  return (
    <ThemeBackground themeId={selectedTheme} className="min-h-screen">
      <div className="absolute inset-0 bg-black/25" />
      <div className="relative z-10 min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 px-4 sm:px-6 lg:px-8 pt-28 pb-16">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Modern Header with Inline Title */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
              <div className="flex items-center gap-4 flex-1">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-white/70 hover:text-white hover:bg-white/10"
                  onClick={() => window.history.back()}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <div className="flex items-center gap-2 text-white/50 text-sm">
                  <span>Events</span>
                  <span>/</span>
                  <span className="text-white">Edit Event</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  type="submit" 
                  form="edit-event-form"
                  disabled={updateEventMutation.isPending} 
                  className="brand-gradient text-white shadow-lg"
                >
                  <Check className="h-4 w-4 mr-2" />
                  {updateEventMutation.isPending ? 'Updating...' : 'Update Event'}
                </Button>
              </div>
            </div>

            <form id="edit-event-form" onSubmit={handleSubmit(onSubmit)}>
              <div className="grid lg:grid-cols-6 gap-4 sm:gap-8 items-start">
                {/* Left Form - Modern Minimalist Design */}
                <div className="lg:col-span-3 space-y-4 sm:space-y-6">
                  {/* Large Editable Event Title */}
                  <div className="rounded-xl sm:rounded-2xl border border-white/15 bg-white/5 backdrop-blur-xl p-4 sm:p-8 shadow-xl">
                    {isEditingTitle ? (
                      <div className="flex items-center gap-2 sm:gap-3">
                        <Input
                          {...register('title')}
                          autoFocus
                          onBlur={() => setIsEditingTitle(false)}
                          onKeyDown={(e) => e.key === 'Enter' && setIsEditingTitle(false)}
                          className="text-2xl sm:text-4xl font-light bg-transparent border-none p-0 text-white placeholder:text-white/50 focus:ring-0 shadow-none"
                          placeholder="Untitled Event"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setIsEditingTitle(false)}
                          className="text-white/70 hover:text-white shrink-0"
                        >
                          <Check className="h-4 w-4 sm:h-5 sm:w-5" />
                        </Button>
                      </div>
                    ) : (
                      <div
                        className="cursor-pointer group flex items-center gap-2 sm:gap-3"
                        onClick={() => setIsEditingTitle(true)}
                      >
                        <h1 className="text-2xl sm:text-4xl font-light text-white">
                          {watch('title') || 'Untitled Event'}
                        </h1>
                        <Edit3 className="h-4 w-4 sm:h-5 sm:w-5 text-white/30 group-hover:text-white/70 transition shrink-0" />
                      </div>
                    )}
                    {errors.title && <p className="text-sm text-red-300 mt-2">{errors.title.message}</p>}
                  </div>

                  {/* Poster Section - Mobile Only (shown after title) */}
                  <div className="lg:hidden rounded-xl border border-white/15 bg-white/5 backdrop-blur-xl p-4 shadow-xl">
                    <div className="flex items-center justify-center mb-3">
                      <h3 className="text-base font-semibold text-white flex items-center">
                        <Image className="mr-2 h-4 w-4" />
                        Event Poster
                      </h3>
                    </div>
                    <div className="max-w-xs mx-auto">
                      <button
                        type="button"
                        onClick={() => setIsPosterSelectorOpen(true)}
                        className="w-full aspect-square rounded-lg relative overflow-hidden transition-all hover:scale-105 cursor-pointer group"
                      >
                        {selectedPoster ? (
                          <>
                            <LazyImage src={selectedPoster.url} alt={selectedPoster.title} className="absolute inset-0 w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40" />
                          </>
                        ) : (
                          <>
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-cyan-600" />
                            <div className="absolute inset-0 opacity-10">
                              <div
                                className="absolute inset-0"
                                style={{
                                  backgroundImage:
                                    "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.3'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
                                }}
                              />
                            </div>
                          </>
                        )}
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="bg-white/20 backdrop-blur-sm rounded-full p-2">
                            <Image className="h-5 w-5 text-white" />
                          </div>
                        </div>
                      </button>
                      <div className="text-center mt-2">
                        <p className="text-xs text-green-400 flex items-center justify-center gap-1">
                          <Check className="h-3 w-3" />
                          {selectedPoster ? `${selectedPoster.title || 'Custom Poster'} selected` : 'Click to select poster'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Main Event Details */}
                  <div className="rounded-xl sm:rounded-2xl border border-white/15 bg-white/5 backdrop-blur-xl p-4 sm:p-8 shadow-xl space-y-4 sm:space-y-6">
                    {/* Location Field */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl bg-white/5 border border-white/10 transition-colors hover:bg-white/10">
                        <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-white/70 shrink-0" />
                        <div className="flex-1">
                          <Input
                            {...register('location')}
                            placeholder="Location"
                            className="bg-transparent border-none p-1 sm:p-2 text-white placeholder:text-white/50 focus:ring-0 shadow-none text-base sm:text-lg"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Date & Time Timeline */}
                    <div className="flex gap-3 sm:gap-4">
                      <div className="flex flex-col items-center pt-5 sm:pt-6 pb-5 sm:pb-6">
                        <div className="w-2.5 h-2.5 rounded-full bg-white/30 shrink-0" />
                        <div className="w-0.5 flex-1 bg-white/10 my-2" />
                        <div className="w-2.5 h-2.5 rounded-full bg-white/30 shrink-0" />
                      </div>

                      <div className="flex-1 space-y-4">
                        {/* Start Date Field */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl bg-white/5 border border-white/10 transition-colors hover:bg-white/10">
                            <div className="flex-1">
                              <Label className="text-xs text-white/50 font-medium mb-1 block">STARTS</Label>
                              <Input
                                type="datetime-local"
                                min={new Date().toISOString().slice(0, 16)}
                                {...register('datetime')}
                                className="bg-transparent border-none p-0 text-white placeholder:text-white/50 focus:ring-0 shadow-none text-base sm:text-lg h-auto"
                              />
                            </div>
                          </div>
                          {errors.datetime && <p className="text-sm text-red-300">{errors.datetime.message}</p>}
                        </div>

                        {/* End Date Field */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl bg-white/5 border border-white/10 transition-colors hover:bg-white/10">
                            <div className="flex-1">
                              <Label className="text-xs text-white/50 font-medium mb-1 block">ENDS</Label>
                              <Input
                                type="datetime-local"
                                min={watch('datetime') || new Date().toISOString().slice(0, 16)}
                                {...register('endDatetime')}
                                className="bg-transparent border-none p-0 text-white placeholder:text-white/50 focus:ring-0 shadow-none text-base sm:text-lg h-auto"
                              />
                            </div>
                          </div>
                          {errors.endDatetime && <p className="text-sm text-red-300">{errors.endDatetime.message}</p>}
                        </div>
                      </div>
                    </div>

                    {/* Map Link Field */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl bg-white/5 transition-colors hover:bg-white/10">
                        <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-white/70 shrink-0" />
                        <div className="flex-1">
                          <Input
                            {...register('mapLink')}
                            placeholder="Map link (optional)"
                            className="bg-transparent border-none p-1 sm:p-2 text-white placeholder:text-white/50 focus:ring-0 shadow-none text-base sm:text-lg"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Spots Field */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl bg-white/5 border border-white/10 transition-colors hover:bg-white/10">
                        <Users className="h-4 w-4 sm:h-5 sm:w-5 text-white/70 shrink-0" />
                        <div className="flex-1">
                          <Input
                            type="number"
                            {...register('maxGuests', { valueAsNumber: true })}
                            min={1}
                            placeholder="Spots"
                            onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                            className="bg-transparent border-none p-1 sm:p-2 text-white placeholder:text-white/50 focus:ring-0 shadow-none text-base sm:text-lg"
                          />
                        </div>
                      </div>
                      {errors.maxGuests && <p className="text-sm text-red-300">{errors.maxGuests.message}</p>}
                    </div>
                  </div>

                  {/* Description Box */}
                  <div className="rounded-xl sm:rounded-2xl border border-white/15 bg-white/5 backdrop-blur-xl p-4 sm:p-8 shadow-xl">
                    <Textarea
                      {...register('description')}
                      placeholder="Tell people more about your event..."
                      className="bg-transparent border-none p-1 sm:p-2 text-white placeholder:text-white/50 focus:ring-0 shadow-none text-base sm:text-lg min-h-[100px] sm:min-h-[120px] resize-none"
                    />
                  </div>

                  {/* Extra Info Button */}
                  <div className="rounded-xl sm:rounded-2xl border border-white/15 bg-white/5 backdrop-blur-xl p-4 sm:p-6 shadow-xl">
                    <button
                      type="button"
                      onClick={() => setIsExtraInfoOpen(true)}
                      className="w-full flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white group-hover:scale-110 transition-transform">
                          <Plus className="h-5 w-5" />
                        </div>
                        <div className="text-left">
                          <h3 className="text-white font-medium">Extra Info?</h3>
                          <p className="text-white/50 text-xs mt-0.5">
                            {extraInfo.length > 0 
                              ? `${extraInfo.length} item${extraInfo.length > 1 ? 's' : ''} added`
                              : 'Add links, playlists, parking info & more'}
                          </p>
                        </div>
                      </div>
                      <Plus className="h-5 w-5 text-white/50 group-hover:text-white transition-colors" />
                    </button>
                  </div>

                  {/* Theme & Manage Buttons - Mobile Only (at the end) */}
                  <div className="lg:hidden space-y-3">
                    <ThemeSelector
                      selectedTheme={selectedTheme}
                      onThemeChange={(themeId) => {
                        setSelectedTheme(themeId);
                        setValue('themeId', themeId);
                        setHasThemeChanged(true);
                      }}
                    />

                    <button
                      type="button"
                      onClick={() => setIsManagePopupOpen(true)}
                      className="w-full group"
                    >
                      <div className="relative overflow-hidden rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl p-4 shadow-xl transition-all duration-300 hover:bg-white/15 hover:border-white/30 hover:scale-[1.02]">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 ring-2 ring-white/20 shadow-lg">
                            <Settings className="w-7 h-7 text-white" />
                          </div>
                          
                          <div className="flex-1 text-left">
                            <p className="text-white/50 text-xs font-medium uppercase tracking-wider mb-1">Settings</p>
                            <p className="text-white font-semibold text-lg">Manage</p>
                            <p className="text-white/40 text-xs mt-0.5">Guest List, RSVP & More</p>
                          </div>
                          
                          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 group-hover:bg-white/20 transition-colors">
                            <Settings className="w-4 h-4 text-white/70 group-hover:text-white transition-colors" />
                          </div>
                        </div>
                        
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                      </div>
                    </button>
                  </div>
                </div>

                {/* Middle Column - Poster & Theme (hidden on mobile, shown on desktop) */}
                <div className="hidden lg:block lg:col-span-2 space-y-4 sm:space-y-6">
                  {/* Event Poster Section */}
                  <div className="rounded-xl sm:rounded-2xl border border-white/15 bg-white/5 backdrop-blur-xl p-4 sm:p-6 shadow-xl">
                    <div className="flex items-center justify-center mb-4">
                      <h3 className="text-lg font-semibold text-white flex items-center">
                        <Image className="mr-2 h-5 w-5" />
                        Event Poster
                      </h3>
                    </div>
                    <div className="mx-auto max-w-sm">
                      <button
                        type="button"
                        onClick={() => setIsPosterSelectorOpen(true)}
                        className="w-full aspect-square rounded-xl relative overflow-hidden transition-all hover:scale-105 hover:shadow-2xl cursor-pointer group"
                      >
                        {selectedPoster ? (
                          <>
                            <LazyImage src={selectedPoster.url} alt={selectedPoster.title} className="absolute inset-0 w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40" />
                          </>
                        ) : (
                          <>
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-cyan-600" />
                            <div className="absolute inset-0 opacity-10">
                              <div
                                className="absolute inset-0"
                                style={{
                                  backgroundImage:
                                    "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.3'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
                                }}
                              />
                            </div>
                          </>
                        )}
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                            <Image className="h-6 w-6 text-white" />
                          </div>
                        </div>
                      </button>
                      <div className="text-center mt-4">
                        <p className="text-xs text-green-400 flex items-center justify-center gap-1">
                          <Check className="h-3 w-3" />
                          {selectedPoster ? `${selectedPoster.title || 'Custom Poster'} selected` : 'Click to select poster'}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Theme Selector - Below Poster */}
                  <ThemeSelector
                    selectedTheme={selectedTheme}
                    onThemeChange={(themeId) => {
                      setSelectedTheme(themeId);
                      setValue('themeId', themeId);
                      setHasThemeChanged(true);
                    }}
                  />

                  {/* Manage Button */}
                  <button
                    type="button"
                    onClick={() => setIsManagePopupOpen(true)}
                    className="w-full group"
                  >
                    <div className="relative overflow-hidden rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl p-4 shadow-xl transition-all duration-300 hover:bg-white/15 hover:border-white/30 hover:scale-[1.02]">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 ring-2 ring-white/20 shadow-lg">
                          <Settings className="w-7 h-7 text-white" />
                        </div>
                        
                        <div className="flex-1 text-left">
                          <p className="text-white/50 text-xs font-medium uppercase tracking-wider mb-1">Settings</p>
                          <p className="text-white font-semibold text-lg">Manage</p>
                          <p className="text-white/40 text-xs mt-0.5">Guest List, RSVP & More</p>
                        </div>
                        
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 group-hover:bg-white/20 transition-colors">
                          <Settings className="w-4 h-4 text-white/70 group-hover:text-white transition-colors" />
                        </div>
                      </div>
                      
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                    </div>
                  </button>
                </div>

              </div>
            </form>
          </div>
        </main>

        <PosterSelector
          isOpen={isPosterSelectorOpen}
          onClose={() => setIsPosterSelectorOpen(false)}
          onSelect={handlePosterSelect}
          onUpload={handlePosterUpload}
        />
        
        <ManageEventPopup
          isOpen={isManagePopupOpen}
          onClose={() => setIsManagePopupOpen(false)}
          eventId={event?.id || parseInt(eventId || '0')}
          eventSlug={event?.slug || eventId}
          eventData={{
            maxGuests: watch('maxGuests'),
            isPublic: event?.isPublic ?? true,
            isClosed: event?.isClosed ?? false,
            guestListVisibility: event?.guestListVisibility || 'everyone',
            rsvpMode: event?.rsvpMode || 'rsvp',
            showGuestCount: event?.showGuestCount ?? true,
          }}
          onUpdate={(data) => {
            // Update form values with management settings
            if (data.maxGuests) setValue('maxGuests', data.maxGuests);
            // guestListVisibility and rsvpMode are saved directly via the manage popup
          }}
          lockImmutableFields
        />

        <ExtraInfoDialog
          isOpen={isExtraInfoOpen}
          onClose={() => setIsExtraInfoOpen(false)}
          items={extraInfo}
          onSave={(items) => setExtraInfo(items)}
        />
      </div>
    </ThemeBackground>
  );
}
