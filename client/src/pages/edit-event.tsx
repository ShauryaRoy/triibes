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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, MapPin, Globe, Lock, Plus, Palette, Image, Clock, Users, Edit3, X, Check, Settings, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import Header from "@/components/layout/header";
import { SimpleBackground } from "@/components/simple-background";
import { PosterSelector } from "@/components/poster-selector";
import { ManageEventPopup } from "@/components/manage-event-popup";
import { useAuth } from "@/hooks/useAuth";

// Schema
const editEventSchema = z.object({
  title: z.string().min(1, "Event title is required"),
  eventType: z.enum(["offline", "online"]),
  datetime: z.string().min(1, "Date and time are required"),
  location: z.string().optional(),
  mapLink: z.string().optional(),
  description: z.string().optional(),
  maxGuests: z.number().min(1, "Must allow at least 1 guest"),
  isPublic: z.boolean(),
  themeId: z.string().min(1, "Please select a theme"),
  communityId: z.number().optional(),
  posterData: z.any().optional()
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
  const [isManagePopupOpen, setIsManagePopupOpen] = useState(false);
  const [customFields, setCustomFields] = useState<Record<string, string>>({});

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

  // Fetch user's communities
  const { data: userCommunities = [] } = useQuery({
    queryKey: ["/api/profile/groups"],
    queryFn: async () => {
      const response = await fetch("/api/profile/groups", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch communities");
      return response.json();
    },
  });

  const { register, handleSubmit, formState: { errors }, watch, setValue, reset } = useForm<EditEventFormData>({
    resolver: zodResolver(editEventSchema),
    defaultValues: { 
      eventType: 'offline', 
      isPublic: true, 
      themeId: selectedTheme, 
      maxGuests: 10 
    }
  });

  const eventType = watch('eventType');
  const formValues = watch();

  // Populate form when event data loads
  useEffect(() => {
    if (event) {
      console.log('🔧 POPULATING FORM WITH EVENT DATA:', event);
      console.log('🔧 event.isPublic value:', event.isPublic);
      console.log('🔧 event.isPublic type:', typeof event.isPublic);
      
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

      const eventDateTime = new Date(event.datetime);
      const formattedDateTime = eventDateTime.toISOString().slice(0, 16);
      
      // Ensure isPublic is always a boolean
      const isPublicValue = event?.isPublic ?? true;
      
      reset({
        title: event.title,
        eventType: event.eventType,
        datetime: formattedDateTime,
        location: event.location || "",
        mapLink: event.mapLink || "",
        description: event.description || "",
        maxGuests: event.maxGuests,
        isPublic: isPublicValue,
        themeId: event.themeId,
        communityId: event.communityId || undefined,
      });
      
      setSelectedTheme(event.themeId || 'matrix-code');
      
      // Handle posterData - normalize the format
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
      
      // Handle custom fields
      const settings = typeof event.settings === 'string' 
        ? JSON.parse(event.settings) 
        : event.settings;
      
      if (settings?.customFields) {
        setCustomFields(settings.customFields);
        // Expand actions that have values
        const fieldsWithValues = Object.keys(settings.customFields).filter(key => settings.customFields[key]);
        setExpandedActions(new Set(fieldsWithValues));
      }
    }
  }, [event, reset, user, toast, setLocation]);

  const updateEventMutation = useMutation({
    mutationFn: async (data: EditEventFormData & { posterData?: any }) => {
      const payload = { 
        ...data, 
        datetime: new Date(data.datetime).toISOString(), 
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
    // Include poster data and custom fields if available
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
        customFields: Object.keys(customFields).length > 0 ? customFields : (existingSettings?.customFields || undefined),
      },
    };
    console.log('📤 Submitting event data:', eventData);
    updateEventMutation.mutate(eventData);
  };

  // Poster handlers
  const handlePosterSelect = (poster: any) => {
    setSelectedPoster(poster);
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
      <SimpleBackground className="min-h-screen">
        <div className="absolute inset-0 bg-black/25" />
        <div className="relative z-10 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Please log in</h2>
            <p className="text-white/70">You need to be logged in to edit events.</p>
          </div>
        </div>
      </SimpleBackground>
    );
  }

  if (eventLoading) {
    return (
      <SimpleBackground className="min-h-screen">
        <div className="absolute inset-0 bg-black/25" />
        <div className="relative z-10 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-white mx-auto mb-4" />
            <p className="text-white/70">Loading event...</p>
          </div>
        </div>
      </SimpleBackground>
    );
  }

  if (eventError || !event) {
    return (
      <SimpleBackground className="min-h-screen">
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
      </SimpleBackground>
    );
  }

  return (
    <SimpleBackground className="min-h-screen">
      <div className="absolute inset-0 bg-black/25" />
      <div className="relative z-10 min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 px-4 sm:px-6 lg:px-8 pt-28 pb-16">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Modern Header with Inline Title */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
              <div className="flex items-center gap-4 flex-1">
                <Link href="/profile">
                  <Button variant="ghost" size="sm" className="text-white/70 hover:text-white hover:bg-white/10">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                </Link>
                <div className="flex items-center gap-2 text-white/50 text-sm">
                  <span>Events</span>
                  <span>/</span>
                  <span className="text-white">Edit Event</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="border-white/20 text-white/70 hover:bg-white/10" onClick={() => setLocation('/profile')}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
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
              <div className="grid lg:grid-cols-6 gap-8 items-start">
                {/* Left Form - Modern Minimalist Design */}
                <div className="lg:col-span-3 space-y-6">
                  {/* Large Editable Event Title */}
                  <div className="rounded-2xl border border-white/15 bg-white/5 backdrop-blur-xl p-8 shadow-xl">
                    {isEditingTitle ? (
                      <div className="flex items-center gap-3">
                        <Input
                          {...register('title')}
                          autoFocus
                          onBlur={() => setIsEditingTitle(false)}
                          onKeyDown={(e) => e.key === 'Enter' && setIsEditingTitle(false)}
                          className="text-4xl font-light bg-transparent border-none p-0 text-white placeholder:text-white/50 focus:ring-0 shadow-none"
                          placeholder="Untitled Event"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setIsEditingTitle(false)}
                          className="text-white/70 hover:text-white shrink-0"
                        >
                          <Check className="h-5 w-5" />
                        </Button>
                      </div>
                    ) : (
                      <div
                        className="cursor-pointer group flex items-center gap-3"
                        onClick={() => setIsEditingTitle(true)}
                      >
                        <h1 className="text-4xl font-light text-white">
                          {watch('title') || 'Untitled Event'}
                        </h1>
                        <Edit3 className="h-5 w-5 text-white/30 group-hover:text-white/70 transition shrink-0" />
                      </div>
                    )}
                    {errors.title && <p className="text-sm text-red-300 mt-2">{errors.title.message}</p>}
                  </div>

                  {/* Main Event Details */}
                  <div className="rounded-2xl border border-white/15 bg-white/5 backdrop-blur-xl p-8 shadow-xl space-y-6">
                    {/* Date Field */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10 transition-colors hover:bg-white/10">
                        <Clock className="h-5 w-5 text-white/70 shrink-0" />
                        <div className="flex-1">
                          <Input
                            type="datetime-local"
                            min={new Date().toISOString().slice(0, 16)}
                            {...register('datetime')}
                            placeholder="Set a date..."
                            className="bg-transparent border-none p-2 text-white placeholder:text-white/50 focus:ring-0 shadow-none text-lg"
                          />
                        </div>
                      </div>
                      {errors.datetime && <p className="text-sm text-red-300">{errors.datetime.message}</p>}
                    </div>

                    {/* Location Field */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10 transition-colors hover:bg-white/10">
                        <MapPin className="h-5 w-5 text-white/70 shrink-0" />
                        <div className="flex-1">
                          <Input
                            {...register('location')}
                            placeholder="Location"
                            className="bg-transparent border-none p-2 text-white placeholder:text-white/50 focus:ring-0 shadow-none text-lg"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Map Link Field */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 p-4 rounded-xl bg-white/5 transition-colors hover:bg-white/10">
                        <MapPin className="h-5 w-5 text-white/70 shrink-0" />
                        <div className="flex-1">
                          <Input
                            {...register('mapLink')}
                            placeholder="Map link (optional)"
                            className="bg-transparent border-none p-2 text-white placeholder:text-white/50 focus:ring-0 shadow-none text-lg"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Spots Field */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10 transition-colors hover:bg-white/10">
                        <Users className="h-5 w-5 text-white/70 shrink-0" />
                        <div className="flex-1">
                          <Input
                            type="number"
                            {...register('maxGuests', { valueAsNumber: true })}
                            min={1}
                            placeholder="Spots"
                            className="bg-transparent border-none p-2 text-white placeholder:text-white/50 focus:ring-0 shadow-none text-lg"
                          />
                        </div>
                      </div>
                      {errors.maxGuests && <p className="text-sm text-red-300">{errors.maxGuests.message}</p>}
                    </div>

                    {/* Privacy Toggle */}
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setValue('isPublic', true)}
                        className={`p-4 rounded-xl border text-left transition ${
                          watch('isPublic')
                            ? 'border-green-400/60 bg-green-400/10 text-white'
                            : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Globe className="h-4 w-4" />
                          Public Event
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setValue('isPublic', false)}
                        className={`p-4 rounded-xl border text-left transition ${
                          !watch('isPublic')
                            ? 'border-purple-400/60 bg-purple-400/10 text-white'
                            : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Lock className="h-4 w-4" />
                          Private Event
                        </div>
                      </button>
                    </div>

                    {/* Community/Group Selection */}
                    {userCommunities && userCommunities.length > 0 && (
                      <div className="space-y-2 pt-2">
                        <Label className="text-white/80 text-sm flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Community (Optional)
                        </Label>
                        <Select
                          value={watch('communityId')?.toString() || 'none'}
                          onValueChange={(value) => setValue('communityId', value !== 'none' ? parseInt(value) : undefined)}
                        >
                          <SelectTrigger className="bg-white/10 border-white/20 text-white">
                            <SelectValue placeholder="Select a community or leave blank for standalone event" />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-900 border-white/20">
                            <SelectItem value="none" className="text-white hover:bg-white/10">
                              No community (Standalone event)
                            </SelectItem>
                            {userCommunities.map((community: any) => (
                              <SelectItem
                                key={community.id}
                                value={community.id.toString()}
                                className="text-white hover:bg-white/10"
                              >
                                {community.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {watch('communityId') && (
                          <p className="text-xs text-white/60">This event will appear in the selected community's events list</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Description Box */}
                  <div className="rounded-2xl border border-white/15 bg-white/5 backdrop-blur-xl p-8 shadow-xl">
                    <Textarea
                      {...register('description')}
                      placeholder="Tell people more about your event..."
                      className="bg-transparent border-none p-2 text-white placeholder:text-white/50 focus:ring-0 shadow-none text-lg min-h-[120px] resize-none"
                    />
                  </div>

                  {/* Additional Information Pills */}
                  <div className="rounded-2xl border border-white/15 bg-white/5 backdrop-blur-xl p-6 shadow-xl">
                    <div className="space-y-4">
                      <h3 className="text-white font-medium">Add to your event</h3>
                      {/* Pill Buttons */}
                      <div className="flex flex-wrap gap-2">
                        {[
                          { id: 'cost', label: 'Cost per person', icon: '💰' },
                          { id: 'link', label: 'Link', icon: '🔗' },
                          { id: 'playlist', label: 'Playlist', icon: '🎵' },
                          { id: 'dress-code', label: 'Dress code', icon: '👕' },
                          { id: 'parking', label: 'Parking', icon: '🚗' },
                          { id: 'food', label: 'Food & drinks', icon: '🍕' },
                          { id: 'gifts', label: 'Gifts', icon: '🎁' }
                        ].map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              const newExpanded = new Set(expandedActions);
                              if (newExpanded.has(item.id)) {
                                newExpanded.delete(item.id);
                              } else {
                                newExpanded.add(item.id);
                              }
                              setExpandedActions(newExpanded);
                            }}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition ${
                              expandedActions.has(item.id)
                                ? 'bg-white/20 text-white border border-white/30'
                                : 'bg-white/10 text-white/70 hover:bg-white/15 border border-white/10'
                            }`}
                          >
                            <span className="text-base">{item.icon}</span>
                            {expandedActions.has(item.id) ? '−' : '+'} {item.label}
                          </button>
                        ))}
                      </div>
                      {/* Show Less / New Section */}
                      <div className="flex items-center gap-3 pt-2">
                        {expandedActions.size > 0 && (
                          <button
                            type="button"
                            onClick={() => setExpandedActions(new Set())}
                            className="text-white/60 hover:text-white text-sm transition"
                          >
                            Show less
                          </button>
                        )}
                        <button type="button" className="flex items-center gap-2 text-white/60 hover:text-white text-sm transition">
                          <Plus className="h-4 w-4" />
                          New section
                        </button>
                      </div>
                      {/* Expanded Action Fields */}
                      {Array.from(expandedActions).map((actionId) => (
                        <div key={actionId} className="p-4 rounded-xl bg-white/5 border border-white/10">
                          <Input
                            value={customFields[actionId] || ''}
                            onChange={(e) => setCustomFields(prev => ({ ...prev, [actionId]: e.target.value }))}
                            placeholder={actionId === 'cost' ? 'Enter cost per person (e.g. $25, Free)' : `Add ${actionId.replace('-', ' ')}...`}
                            className="bg-transparent border-none p-2 text-white placeholder:text-white/50 focus:ring-0 shadow-none"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Middle Column - Poster */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="rounded-2xl border border-white/15 bg-white/5 backdrop-blur-xl p-6 shadow-xl">
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
                </div>

                {/* Right Side Panel - Theme & Effects */}
                <div className="lg:col-span-1 space-y-4">
                  <div className="sticky top-32 space-y-4">
                    <div className="rounded-xl border border-white/15 bg-white/5 backdrop-blur-xl p-4 shadow-xl relative">
                      <button
                        type="button"
                        onClick={() => {
                          const newExpanded = new Set(expandedSections);
                          if (newExpanded.has('theme-panel')) newExpanded.delete('theme-panel');
                          else newExpanded.add('theme-panel');
                          setExpandedSections(newExpanded);
                        }}
                        className="w-full flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-white/10 transition group"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 text-white group-hover:scale-110 transition-transform">
                          <Palette className="h-5 w-5" />
                        </div>
                        <span className="text-white text-sm font-medium">Theme</span>
                        <span className="text-white/50 text-xs text-center">Background & Colors</span>
                      </button>
                      {expandedSections.has('theme-panel') && (
                        <div className="absolute right-full top-0 mr-4 w-72 rounded-xl border border-white/15 bg-black/80 backdrop-blur-xl p-4 shadow-2xl z-50">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-white font-medium">Choose Theme</h4>
                            <button
                              type="button"
                              onClick={() => {
                                const newExpanded = new Set(expandedSections);
                                newExpanded.delete('theme-panel');
                                setExpandedSections(newExpanded);
                              }}
                              className="text-white/50 hover:text-white"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            {[
                              { id: 'matrix-code', name: 'Matrix', gradient: 'from-green-600 to-emerald-400' },
                              { id: 'warp-speed', name: 'Warp', gradient: 'from-purple-600 to-cyan-600' },
                              { id: 'electric-storm', name: 'Storm', gradient: 'from-blue-600 via-cyan-600 to-slate-800' },
                              { id: 'fire-storm', name: 'Fire', gradient: 'from-orange-600 via-red-600 to-yellow-500' },
                            ].map((theme) => (
                              <button
                                key={theme.id}
                                type="button"
                                onClick={() => {
                                  setSelectedTheme(theme.id);
                                  setValue('themeId', theme.id);
                                  const newExpanded = new Set(expandedSections);
                                  newExpanded.delete('theme-panel');
                                  setExpandedSections(newExpanded);
                                }}
                                className={`group flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-white/10 transition ${
                                  selectedTheme === theme.id ? 'ring-2 ring-cyan-400' : ''
                                }`}
                              >
                                <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${theme.gradient} group-hover:scale-110 transition-transform`} />
                                <span className="text-white text-xs font-medium">{theme.name}</span>
                                {selectedTheme === theme.id && <Check className="h-3 w-3 text-cyan-400" />}
                              </button>
                            ))}
                          </div>
                          <div className="mt-4 p-3 rounded-lg bg-white/5 border border-white/10">
                            <p className="text-white/70 text-xs text-center">
                              Current: <span className="text-cyan-400 font-medium">
                                {[
                                  { id: 'matrix-code', name: 'Matrix' },
                                  { id: 'warp-speed', name: 'Warp' },
                                  { id: 'electric-storm', name: 'Storm' },
                                  { id: 'fire-storm', name: 'Fire' },
                                ].find((t) => t.id === selectedTheme)?.name || 'Matrix'}
                              </span>
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Manage Button */}
                    <div className="rounded-xl border border-white/15 bg-white/5 backdrop-blur-xl p-4 shadow-xl">
                      <button
                        type="button"
                        onClick={() => setIsManagePopupOpen(true)}
                        className="w-full flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-white/10 transition group"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white group-hover:scale-110 transition-transform">
                          <Settings className="h-5 w-5" />
                        </div>
                        <span className="text-white text-sm font-medium">Manage</span>
                        <span className="text-white/50 text-xs text-center">Guest List, RSVP & More</span>
                      </button>
                    </div>
                  </div>
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
          eventData={{
            maxGuests: watch('maxGuests'),
            isPublic: watch('isPublic'),
            guestListVisibility: event?.guestListVisibility || 'everyone',
          }}
          onUpdate={(data) => {
            // Update form values with management settings
            if (data.maxGuests) setValue('maxGuests', data.maxGuests);
            if (data.isPublic !== undefined) setValue('isPublic', data.isPublic);
            // guestListVisibility is saved directly via the manage popup
          }}
        />
      </div>
    </SimpleBackground>
  );
}
