import { useState, useEffect, useMemo } from "react";
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
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, MapPin, Globe, Image, Users, Edit3, Check, Settings, Loader2, LayoutDashboard, FileText, PlusCircle, Trash2, Ticket } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import Header from "@/components/layout/header";
import { ThemeBackground } from "@/components/ThemeBackground";
import { PosterSelector } from "@/components/poster-selector";
import { ThemeSelector } from "@/components/theme-selector";
import { getRandomMinimalThemeId } from "@/components/theme-catalog";
import { ManageEventPopup } from "@/components/manage-event-popup";
import { useAuth } from "@/hooks/useAuth";
import { ExtraInfoDialog, type ExtraInfoItem } from "@/components/extra-info-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { DisplayMode } from "@/hooks/useDisplayMode";
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
  const [selectedTheme, setSelectedTheme] = useState(() => getRandomMinimalThemeId());
  const [displayMode, setDisplayMode] = useState<DisplayMode>('dark');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isPosterSelectorOpen, setIsPosterSelectorOpen] = useState(false);
  const [selectedPoster, setSelectedPoster] = useState<any>(null);
  const [hasPosterChanged, setHasPosterChanged] = useState(false);
  const [hasThemeChanged, setHasThemeChanged] = useState(false);
  const [isManagePopupOpen, setIsManagePopupOpen] = useState(false);
  const [extraInfo, setExtraInfo] = useState<ExtraInfoItem[]>([]);
  const [isExtraInfoOpen, setIsExtraInfoOpen] = useState(false);

  // Dialog states
  const [isLocationDialogOpen, setIsLocationDialogOpen] = useState(false);
  const [isDescriptionDialogOpen, setIsDescriptionDialogOpen] = useState(false);
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
  const [isCapacityDialogOpen, setIsCapacityDialogOpen] = useState(false);
  const [isCapacityLimitedDraft, setIsCapacityLimitedDraft] = useState(true);
  const [draftMaxGuests, setDraftMaxGuests] = useState<string>("10");
  const [openDatePicker, setOpenDatePicker] = useState<"start" | "end" | null>(null);
  const [openTimePicker, setOpenTimePicker] = useState<"start" | "end" | null>(null);
  const [draftLocation, setDraftLocation] = useState("");
  const [draftMapLink, setDraftMapLink] = useState("");
  const [draftDescription, setDraftDescription] = useState("");

  type FormQuestion = { id: string; label: string; type: "text" | "textarea" | "select"; required: boolean; options?: string[]; };
  const [approvalQuestionDrafts, setApprovalQuestionDrafts] = useState<FormQuestion[]>([]);
  const [entryMode, setEntryMode] = useState<"open" | "approval" | "invite_only">("open");
  const [formSchema, setFormSchema] = useState<any[]>([]);

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

        const raw = value.trim();
        if (!raw) return new Date(value);

        // If timezone info exists, parse as absolute instant.
        if (raw.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(raw)) {
          return new Date(raw);
        }

        // For timezone-less strings, keep wall-clock components.
        // This avoids implicit UTC conversion that causes +5:30 drift in IST.
        const normalized = raw.replace(' ', 'T');
        const [datePart, timePartRaw = '00:00:00'] = normalized.split('T');
        const [year, month, day] = datePart.split('-').map(Number);
        const [hours = 0, minutes = 0, seconds = 0] = timePartRaw.split(':').map((n) => parseInt(n, 10) || 0);
        return new Date(year, (month || 1) - 1, day || 1, hours, minutes, seconds);
      };

      const toInputDateTime = (value: any): string => {
        if (value === null || value === undefined || value === '') return '';

        if (typeof value === 'string') {
          const raw = value.trim();
          const normalized = raw.replace(' ', 'T');
          // If timezone-less, return wall-clock directly (no timezone conversion).
          if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(normalized) &&
              !normalized.endsWith('Z') &&
              !/[+-]\d{2}:\d{2}$/.test(normalized)) {
            return normalized.slice(0, 16);
          }
        }

        const dt = parseServerDateTime(value);
        return toIstDateTimeInput(dt);
      };

      const toIstDateTimeInput = (dt: Date) => {
        const parts = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Asia/Kolkata',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }).formatToParts(dt);

        const get = (type: string) => parts.find((p) => p.type === type)?.value || '';
        return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
      };

      console.log('[TZ][Edit] Raw event datetimes from API:', {
        eventId: event.id,
        datetime: event.datetime,
        endDatetime: event.endDatetime,
      });

      // Convert backend datetime to datetime-local wall-clock value.
      const formattedDateTime = toInputDateTime(event.datetime);

      // Ensure end datetime exists for editing; default to +1 hour if missing
      const eventDateTime = parseServerDateTime(event.datetime);
      const fallbackEnd = new Date(eventDateTime.getTime() + 60 * 60 * 1000);
      const endDateTime = event.endDatetime ? parseServerDateTime(event.endDatetime) : fallbackEnd;
      const formattedEndDateTime = event.endDatetime ? toInputDateTime(event.endDatetime) : toIstDateTimeInput(fallbackEnd);

      console.log('[TZ][Edit] Parsed + formatted for datetime-local:', {
        eventId: event.id,
        parsedStartIso: eventDateTime.toISOString(),
        parsedEndIso: endDateTime.toISOString(),
        formattedDateTime,
        formattedEndDateTime,
      });
      
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

      if (settings?.displayMode === 'light' || settings?.displayMode === 'dark') {
        setDisplayMode(settings.displayMode);
      } else if (settings?.displayMode === 'auto') {
        setDisplayMode('dark');
      } else {
        setDisplayMode('dark');
      }
    }
  }, [event, reset, user, toast, setLocation, hasPosterChanged, hasThemeChanged, selectedTheme]);

  useEffect(() => {
    document.body.classList.add("force-dark-page");
    return () => {
      document.body.classList.remove("force-dark-page");
    };
  }, []);

  const updateEventMutation = useMutation({
    mutationFn: async (data: EditEventFormData & { posterData?: any }) => {
      const payload = { 
        ...data, 
        // Send datetime-local strings as-is; backend normalizes timezone consistently.
        datetime: data.datetime,
        endDatetime: data.endDatetime,
        posterData: data.posterData 
      };

      console.log('[TZ][Edit] Submitting payload:', {
        eventId,
        datetime: payload.datetime,
        endDatetime: payload.endDatetime,
      });
      
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
        displayMode,
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

  // â”€â”€ Date/time helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    for (let h = 0; h < 24; h++) for (let m = 0; m < 60; m += 30)
      slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    return slots;
  }, []);

  const getDatePart = (v?: string) => v?.split("T")[0] || "";
  const getTimePart = (v?: string) => v?.split("T")[1]?.slice(0, 5) || "";

  const updateDateTime = (field: "datetime" | "endDatetime", part: "date" | "time", value: string) => {
    const fallback = new Date().toISOString().slice(0, 16);
    const current = watch(field) || fallback;
    const [currentDate, currentTimeRaw] = current.split("T");
    const currentTime = (currentTimeRaw || "00:00").slice(0, 5);
    const nextDate = part === "date" ? value : currentDate;
    const nextTime = part === "time" ? value : currentTime;
    if (!nextDate || !nextTime) return;
    setValue(field, `${nextDate}T${nextTime}`, { shouldValidate: true });
  };

  const parseDateValue = (v?: string) => { if (!v) return undefined; const p = new Date(v); return isNaN(p.getTime()) ? undefined : p; };

  const formatDateDisplay = (v?: string) => {
    const p = parseDateValue(v);
    return p ? p.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Select date";
  };

  const formatTimeDisplay = (v?: string) => {
    const t = getTimePart(v);
    if (!t) return "Select time";
    const [h, m] = t.split(":").map(Number);
    const d = new Date(); d.setHours(h, m, 0, 0);
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  };

  const toDateInputValue = (date: Date) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;

  const handleDateSelect = (field: "datetime" | "endDatetime", date?: Date) => {
    if (!date) return;
    updateDateTime(field, "date", toDateInputValue(date));
    setOpenDatePicker(null);
  };

  const handleTimeSelect = (field: "datetime" | "endDatetime", time: string) => {
    updateDateTime(field, "time", time);
    setOpenTimePicker(null);
  };

  const formatTimeSlotLabel = (time: string) => {
    const [h, m] = time.split(":").map(Number);
    const d = new Date(); d.setHours(h, m, 0, 0);
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  };

  // â”€â”€ Dialog handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const openLocationDialog = () => { setDraftLocation(watch("location") || ""); setDraftMapLink(watch("mapLink") || ""); setIsLocationDialogOpen(true); };
  const saveLocationDetails = () => { setValue("location", draftLocation.trim(), { shouldValidate: true, shouldDirty: true }); setValue("mapLink", draftMapLink.trim(), { shouldValidate: true, shouldDirty: true }); setIsLocationDialogOpen(false); };

  const openDescriptionDialog = () => { setDraftDescription(watch("description") || ""); setIsDescriptionDialogOpen(true); };
  const saveDescriptionDetails = () => { setValue("description", draftDescription.trim(), { shouldValidate: true, shouldDirty: true }); setIsDescriptionDialogOpen(false); };

  const openApprovalDialog = () => {
    const existing: FormQuestion[] = Array.isArray(formSchema)
      ? formSchema.filter((q: any) => typeof q?.label === "string").map((q: any) => ({ id: q.id || `q${Date.now()}`, label: q.label, type: q.type === "textarea" || q.type === "select" ? q.type : "text", required: Boolean(q.required), options: q.type === "select" ? (Array.isArray(q.options) && q.options.length > 0 ? q.options : [""]) : undefined }))
      : [];
    setApprovalQuestionDrafts(existing);
    setIsApprovalDialogOpen(true);
  };

  const addApprovalQuestion = () => setApprovalQuestionDrafts(prev => [...prev, { id: `q${Date.now()}-${Math.random().toString(16).slice(2)}`, label: "New question", type: "text", required: false }]);
  const updateApprovalQuestion = (id: string, patch: Partial<FormQuestion>) => setApprovalQuestionDrafts(prev => prev.map(q => q.id === id ? { ...q, ...patch } : q));
  const removeApprovalQuestion = (id: string) => setApprovalQuestionDrafts(prev => prev.filter(q => q.id !== id));

  const saveApprovalQuestions = () => {
    const cleaned = approvalQuestionDrafts.map(q => ({ ...q, label: q.label.trim(), options: q.type === "select" ? (q.options || [""]).map(o => o.trim()).filter(Boolean) : undefined })).filter(q => q.label.length > 0);
    setFormSchema(cleaned.map(q => ({ ...q, options: q.type === "select" ? (q.options && q.options.length > 0 ? q.options : ["Option 1"]) : undefined })));
    setEntryMode("approval");
    setIsApprovalDialogOpen(false);
  };

  const openCapacityDialog = () => {
    const cur = watch("maxGuests");
    if (typeof cur === "number" && cur > 0) { setIsCapacityLimitedDraft(true); setDraftMaxGuests(String(cur)); }
    else { setIsCapacityLimitedDraft(false); setDraftMaxGuests("10"); }
    setIsCapacityDialogOpen(true);
  };

  const saveCapacitySettings = () => {
    if (isCapacityLimitedDraft) {
      const parsed = parseInt(draftMaxGuests, 10);
      if (!isFinite(parsed) || parsed < 1) { toast({ title: "Invalid capacity", description: "Enter a number greater than 0.", variant: "destructive" }); return; }
      setValue("maxGuests", parsed, { shouldValidate: true, shouldDirty: true });
    } else setValue("maxGuests", undefined as unknown as number, { shouldValidate: true, shouldDirty: true });
    setIsCapacityDialogOpen(false);
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

  const startValue = watch("datetime");
  const endValue = watch("endDatetime");

  return (
    <div className="force-dark">
    <ThemeBackground themeId={selectedTheme} displayMode="dark" className="min-h-screen">
      <div className="relative z-10 min-h-screen flex flex-col">
        <Header />

        <main className="flex-1 px-4 sm:px-6 lg:px-8 pt-24 pb-12 sm:pt-28 sm:pb-16">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between gap-3 pb-4 border-b border-white/10">
              <Button variant="ghost" size="sm" className="text-white/70 hover:text-white hover:bg-white/10 h-8 px-2" onClick={() => window.history.back()}>
                <ArrowLeft className="h-4 w-4 mr-2" />Back
              </Button>
              <Button type="submit" form="edit-event-form" disabled={updateEventMutation.isPending} className="h-9 rounded-md bg-white/90 hover:bg-white text-black shadow-none">
                {updateEventMutation.isPending ? "Updating..." : "Update Event"}
              </Button>
            </div>

            <form id="edit-event-form" onSubmit={handleSubmit(onSubmit)}>
              <div className="grid lg:grid-cols-6 gap-8 items-start">
                <div className="lg:col-span-4 max-w-[860px] space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      {/* Community Pill - Read Only */}
                      <div className="h-9 min-w-[140px] w-auto bg-foreground/10 backdrop-blur-xl text-foreground/90 rounded-full px-4 py-1.5 text-[13px] font-semibold flex items-center gap-2 shadow-lg ring-1 ring-inset ring-white/10 opacity-80 cursor-default">
                        <span className="h-2 w-2 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.6)]" />
                        <span className="truncate">
                          {event?.group?.name || "Personal Calendar"}
                        </span>
                      </div>

                      {/* Visibility Pill - Read Only */}
                      <div className="h-9 min-w-[100px] w-auto bg-foreground/10 backdrop-blur-xl text-foreground/90 rounded-full px-4 py-1.5 text-[13px] font-semibold flex items-center gap-2 shadow-lg ring-1 ring-inset ring-white/10 opacity-80 cursor-default">
                        <Globe className="h-3.5 w-3.5 opacity-60" />
                        <span>{event?.isPrivate ? "Private" : "Public"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {isEditingTitle ? (
                      <input
                        {...register("title")}
                        autoFocus
                        onBlur={() => setIsEditingTitle(false)}
                        onKeyDown={(e) => e.key === "Enter" && setIsEditingTitle(false)}
                        className="text-3xl sm:text-[34px] font-medium border-none p-0 bg-transparent text-foreground placeholder:text-foreground/50 focus:outline-none focus:ring-0 w-full"
                        placeholder="Untitled Event"
                      />
                    ) : (
                      <button
                        type="button"
                        className="text-left w-full"
                        onClick={() => setIsEditingTitle(true)}
                      >
                        <h1 className="text-3xl sm:text-[34px] font-medium tracking-tight text-foreground/95">{watch("title") || "Event Name"}</h1>
                      </button>
                    )}
                    {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
                  </div>

                  {/* KEEP: poster block right after title on mobile */}
                  <div className="lg:hidden">
                    <div className="max-w-xs mx-auto">
                      <button
                        type="button"
                        onClick={() => setIsPosterSelectorOpen(true)}
                        className="w-full aspect-square rounded-lg relative overflow-hidden transition-all hover:scale-[1.02] cursor-pointer group"
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
                          <div className="bg-background/20 backdrop-blur-sm rounded-full p-2">
                            <Image className="h-5 w-5 text-foreground" />
                          </div>
                        </div>
                      </button>
                      <div className="text-center mt-2">
                        <p className="text-xs text-foreground/60 flex items-center justify-center gap-1">
                          <Check className="h-3 w-3 text-foreground/55" />
                          {selectedPoster ? `${selectedPoster.title} selected` : "Click to select poster"}
                        </p>
                      </div>
                    </div>
                  </div>

                   <div className="flex flex-col lg:flex-row gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="rounded-2xl border border-white/10 bg-white/[0.08] backdrop-blur-2xl overflow-hidden shadow-2xl">
                        {/* Start Date/Time Row */}
                        <div className="flex items-center justify-between px-4 py-4 border-b border-foreground/5 hover:bg-foreground/[0.02] transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="h-2 w-2 rounded-full bg-foreground/40" />
                            <span className="text-foreground/80 text-[15px] font-medium">Start</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Popover open={openDatePicker === "start"} onOpenChange={(open) => setOpenDatePicker(open ? "start" : null)}>
                              <PopoverTrigger asChild>
                                <button type="button" className="px-3 py-2 rounded-xl bg-white/[0.09] hover:bg-white/[0.14] text-[15px] text-foreground/90 font-medium transition-all backdrop-blur-md border border-white/[0.08]">
                                  {formatDateDisplay(startValue)}
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto border-foreground/10 bg-popover/95 backdrop-blur-xl p-0 text-foreground" align="end">
                                <Calendar mode="single" selected={parseDateValue(startValue)} onSelect={(date) => handleDateSelect("datetime", date)} disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))} initialFocus />
                              </PopoverContent>
                            </Popover>

                            <Popover open={openTimePicker === "start"} onOpenChange={(open) => setOpenTimePicker(open ? "start" : null)}>
                              <PopoverTrigger asChild>
                                <button type="button" className="px-3 py-2 rounded-xl bg-white/[0.09] hover:bg-white/[0.14] text-[15px] text-foreground/90 font-medium transition-all backdrop-blur-md border border-white/[0.08]">
                                  {formatTimeDisplay(startValue)}
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[170px] border-foreground/10 bg-popover/95 backdrop-blur-xl p-1 text-foreground" align="end">
                                <div className="max-h-56 overflow-y-auto pr-1">
                                  {timeSlots.map((slot) => (
                                    <button key={`start-${slot}`} type="button" onClick={() => handleTimeSelect("datetime", slot)}
                                      className={`w-full rounded-lg px-2 py-2 text-left text-sm transition-colors ${getTimePart(startValue) === slot ? "bg-foreground/10 text-foreground font-semibold" : "text-foreground/70 hover:bg-foreground/5 hover:text-foreground"}`}>
                                      {formatTimeSlotLabel(slot)}
                                    </button>
                                  ))}
                                </div>
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>

                        {/* End Date/Time Row */}
                        <div className="flex items-center justify-between px-4 py-4 hover:bg-foreground/[0.02] transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="h-2 w-2 rounded-full border border-foreground/40 bg-transparent" />
                            <span className="text-foreground/80 text-[15px] font-medium">End</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Popover open={openDatePicker === "end"} onOpenChange={(open) => setOpenDatePicker(open ? "end" : null)}>
                              <PopoverTrigger asChild>
                                <button type="button" className="px-3 py-2 rounded-xl bg-white/[0.09] hover:bg-white/[0.14] text-[15px] text-foreground/90 font-medium transition-all backdrop-blur-md border border-white/[0.08]">
                                  {formatDateDisplay(endValue)}
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto border-foreground/10 bg-popover/95 backdrop-blur-xl p-0 text-foreground" align="end">
                                <Calendar mode="single" selected={parseDateValue(endValue)} onSelect={(date) => handleDateSelect("endDatetime", date)}
                                  disabled={(date) => { const minDate = getDatePart(startValue) || new Date().toISOString().slice(0, 10); return date < new Date(`${minDate}T00:00:00`); }} initialFocus />
                              </PopoverContent>
                            </Popover>

                            <Popover open={openTimePicker === "end"} onOpenChange={(open) => setOpenTimePicker(open ? "end" : null)}>
                              <PopoverTrigger asChild>
                                <button type="button" className="px-3 py-2 rounded-xl bg-white/[0.09] hover:bg-white/[0.14] text-[15px] text-foreground/90 font-medium transition-all backdrop-blur-md border border-white/[0.08]">
                                  {formatTimeDisplay(endValue)}
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[170px] border-foreground/10 bg-popover/95 backdrop-blur-xl p-1 text-foreground" align="end">
                                <div className="max-h-56 overflow-y-auto pr-1">
                                  {timeSlots.map((slot) => (
                                    <button key={`end-${slot}`} type="button" onClick={() => handleTimeSelect("endDatetime", slot)}
                                      className={`w-full rounded-lg px-2 py-2 text-left text-sm transition-colors ${getTimePart(endValue) === slot ? "bg-foreground/10 text-foreground font-semibold" : "text-foreground/70 hover:bg-foreground/5 hover:text-foreground"}`}>
                                      {formatTimeSlotLabel(slot)}
                                    </button>
                                  ))}
                                </div>
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>
                      </div>

                      {(errors.datetime || errors.endDatetime) && (
                        <div className="flex flex-col gap-1 px-1">
                          {errors.datetime && <p className="text-xs text-destructive/90">{errors.datetime.message}</p>}
                          {errors.endDatetime && <p className="text-xs text-destructive/90">{errors.endDatetime.message}</p>}
                        </div>
                      )}
                    </div>

                  </div>

                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={openLocationDialog}
                      className="w-full rounded-2xl border border-white/10 bg-white/[0.08] backdrop-blur-2xl px-4 py-4 text-left transition-all hover:bg-white/[0.12] hover:shadow-2xl shadow-xl group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-xl bg-white/[0.06] border border-white/[0.06] text-foreground/60 transition-colors group-hover:text-foreground/90">
                          <MapPin className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-foreground/95 text-lg font-semibold tracking-tight">Add Event Location</p>
                          <p className="text-[13px] text-foreground/50 font-medium">
                            {watch("location")?.trim() || watch("mapLink")?.trim()
                              ? (watch("location")?.trim() || "Location added")
                              : "Offline location or virtual link"}
                          </p>
                        </div>
                      </div>
                    </button>
                  </div>

                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={openDescriptionDialog}
                      className="w-full rounded-2xl border border-white/10 bg-white/[0.08] backdrop-blur-2xl px-4 py-4 text-left transition-all hover:bg-white/[0.12] hover:shadow-2xl shadow-xl group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-xl bg-white/[0.06] border border-white/[0.06] text-foreground/60 transition-colors group-hover:text-foreground/90">
                          <Edit3 className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-foreground/95 text-lg font-semibold tracking-tight">Add Description</p>
                          <p className="text-[13px] text-foreground/50 font-medium">
                            {watch("description")?.trim()
                              ? `${watch("description")!.trim().slice(0, 56)}${watch("description")!.trim().length > 56 ? "..." : ""}`
                              : "Optional details for attendees"}
                          </p>
                        </div>
                      </div>
                    </button>
                  </div>

                  <div>
                    <p className="text-foreground/75 text-lg font-medium mb-2">Event Options</p>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.08] backdrop-blur-2xl overflow-hidden shadow-xl">
                      <div className="flex items-center justify-between px-4 py-4 border-b border-foreground/5 hover:bg-foreground/[0.02] transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-white/[0.06] border border-white/[0.06] text-foreground/60">
                            <FileText className="h-5 w-5" />
                          </div>
                          <span className="text-foreground/90 text-[15px] font-semibold">Require Approval</span>
                        </div>
                        <div className="flex items-center gap-3">
                           {entryMode === "approval" && (
                            <button
                               type="button"
                               onClick={openApprovalDialog}
                               className="text-xs font-bold uppercase tracking-wider text-foreground/50 hover:text-foreground"
                             >
                               Questions
                             </button>
                           )}
                           <Switch
                            checked={entryMode === "approval"}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setEntryMode("approval");
                                openApprovalDialog();
                              } else {
                                setEntryMode("open");
                              }
                            }}
                            className="data-[state=checked]:bg-foreground/40 border-foreground/10"
                          />
                        </div>
                      </div>

                      <div className="px-4 py-4 hover:bg-foreground/[0.02] transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-white/[0.06] border border-white/[0.06] text-foreground/60">
                              <Users className="h-5 w-5" />
                            </div>
                            <span className="text-foreground/90 text-[15px] font-semibold">Capacity</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-foreground/60 text-[15px] font-medium">{watch("maxGuests") || "Unlimited"}</span>
                            <button
                              type="button"
                              onClick={openCapacityDialog}
                              className="p-1 px-2 rounded-lg bg-white/[0.09] hover:bg-white/[0.14] text-foreground/60 hover:text-foreground transition-all"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsExtraInfoOpen(true)}
                      className="h-9 px-3 rounded-lg bg-foreground/[0.08] backdrop-blur-md text-foreground/75 hover:text-foreground hover:bg-foreground/[0.12] text-sm border border-border shadow-sm"
                    >
                      Extra Info {extraInfo.length > 0 ? `(${extraInfo.length})` : ""}
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsManagePopupOpen(true)}
                      className="h-9 px-3 rounded-lg bg-foreground/[0.08] backdrop-blur-md text-foreground/75 hover:text-foreground hover:bg-foreground/[0.12] text-sm border border-border shadow-sm"
                    >
                      Manage
                    </button>
                  </div>

                  <div className="lg:hidden">
                    <ThemeSelector
                      selectedTheme={selectedTheme}
                      onThemeChange={(themeId) => {
                        setSelectedTheme(themeId);
                        setValue("themeId", themeId);
                      }}
                       selectedDisplayMode="dark"
                    />
                  </div>
                </div>

                {/* KEEP: poster section in desktop right column */}
                <div className="hidden lg:block lg:col-span-2 space-y-4 sm:space-y-6">
                  <div className="mx-auto max-w-sm">
                    <button
                      type="button"
                      onClick={() => setIsPosterSelectorOpen(true)}
                      className="w-full aspect-square rounded-xl relative overflow-hidden transition-all hover:scale-[1.02] cursor-pointer group"
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
                        <div className="bg-background/20 backdrop-blur-sm rounded-full p-3">
                          <Image className="h-6 w-6 text-foreground" />
                        </div>
                      </div>
                    </button>
                    <div className="text-center mt-3">
                      <p className="text-xs text-foreground/60 flex items-center justify-center gap-1">
                        <Check className="h-3 w-3 text-foreground/55" />
                        {selectedPoster ? `${selectedPoster.title} selected` : "Click to select poster"}
                      </p>
                    </div>
                  </div>

                  <ThemeSelector
                    selectedTheme={selectedTheme}
                    onThemeChange={(themeId) => {
                      setSelectedTheme(themeId);
                      setValue("themeId", themeId);
                    }}
                     selectedDisplayMode="dark"
                  />

                  <button
                    type="button"
                    onClick={() => setIsManagePopupOpen(true)}
                    className="w-full rounded-lg bg-foreground/[0.08] backdrop-blur-md text-foreground/75 hover:text-foreground hover:bg-foreground/[0.12] h-10 text-sm font-medium border border-border shadow-sm"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Settings className="w-4 h-4" />
                      Manage Settings
                    </span>
                  </button>

                  <Link href={`/events/${event?.slug || event?.id || eventId}/dashboard`}>
                    <button type="button" className="w-full rounded-xl border border-cyan-300/30 bg-cyan-500/10 p-3 text-left hover:bg-cyan-500/20 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-cyan-500/20 text-cyan-200">
                          <LayoutDashboard className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-cyan-100 font-semibold text-sm">Event Dashboard</p>
                          <p className="text-cyan-100/70 text-xs">Open full-page control center</p>
                        </div>
                      </div>
                    </button>
                  </Link>
                </div>
              </div>
            </form>
          </div>
        </main>

        <PosterSelector isOpen={isPosterSelectorOpen} onClose={() => setIsPosterSelectorOpen(false)} onSelect={handlePosterSelect} onUpload={handlePosterUpload} />

        {/* Location Dialog */}
        <Dialog open={isLocationDialogOpen} onOpenChange={setIsLocationDialogOpen}>
          <DialogContent className="max-w-md bg-popover/95 backdrop-blur-xl border-foreground/10 text-foreground shadow-2xl rounded-3xl p-6">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold tracking-tight text-foreground/90">Event Location</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-foreground/50 ml-1">Physical Location</Label>
                <input
                  value={draftLocation}
                  onChange={(e) => setDraftLocation(e.target.value)}
                  placeholder="e.g. 123 Main St, New York"
                  className="w-full h-12 bg-foreground/5 border border-foreground/10 rounded-2xl px-4 text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-foreground/20 transition-all"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-foreground/50 ml-1">Virtual Link / Map URL</Label>
                <input
                  value={draftMapLink}
                  onChange={(e) => setDraftMapLink(e.target.value)}
                  placeholder="https://..."
                  className="w-full h-12 bg-foreground/5 border border-foreground/10 rounded-2xl px-4 text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-foreground/20 transition-all"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="ghost" onClick={() => setIsLocationDialogOpen(false)} className="rounded-full px-6 text-foreground/60 hover:text-foreground hover:bg-foreground/5">Cancel</Button>
                <Button type="button" onClick={saveLocationDetails} className="rounded-full px-8 bg-foreground text-background hover:bg-foreground/90 font-bold">Save Changes</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Description Dialog */}
        <Dialog open={isDescriptionDialogOpen} onOpenChange={setIsDescriptionDialogOpen}>
          <DialogContent className="max-w-2xl bg-popover/95 backdrop-blur-xl border-foreground/10 text-foreground shadow-2xl rounded-3xl p-6">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold tracking-tight text-foreground/90">Event Description</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <textarea
                value={draftDescription}
                onChange={(e) => setDraftDescription(e.target.value)}
                placeholder="Tell people more about your event..."
                className="w-full min-h-[300px] bg-foreground/5 border border-foreground/10 rounded-2xl p-4 text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-foreground/20 transition-all resize-none"
              />
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="ghost" onClick={() => setIsDescriptionDialogOpen(false)} className="rounded-full px-6 text-foreground/60 hover:text-foreground hover:bg-foreground/5">Cancel</Button>
                <Button type="button" onClick={saveDescriptionDetails} className="rounded-full px-8 bg-foreground text-background hover:bg-foreground/90 font-bold">Save Description</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Approval Questions Dialog */}
        <Dialog open={isApprovalDialogOpen} onOpenChange={setIsApprovalDialogOpen}>
          <DialogContent className="max-w-lg bg-popover/95 backdrop-blur-xl border-foreground/10 text-foreground shadow-2xl rounded-3xl p-6">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold tracking-tight text-foreground/90 flex items-center gap-2">
                <FileText className="h-5 w-5 opacity-60" /> Approval Questions
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="flex items-center justify-between px-1">
                <p className="text-[13px] text-foreground/50 font-medium">Add questions for applicants to answer.</p>
                <Button type="button" size="sm" onClick={addApprovalQuestion} className="rounded-full bg-foreground/10 hover:bg-foreground/20 text-foreground border-0 h-8 px-4 font-bold text-xs">
                  <PlusCircle className="h-3.5 w-3.5 mr-1.5" /> ADD
                </Button>
              </div>

              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {approvalQuestionDrafts.length === 0 && (
                  <div className="py-12 text-center border-2 border-dashed border-foreground/5 rounded-2xl">
                    <p className="text-sm text-foreground/30 font-medium">No questions added yet.</p>
                  </div>
                )}
                {approvalQuestionDrafts.map((question) => (
                  <div key={question.id} className="rounded-2xl border border-foreground/5 bg-foreground/[0.03] p-4 space-y-4 relative group">
                    <div className="flex items-center gap-3">
                      <input
                        value={question.label}
                        onChange={(e) => updateApprovalQuestion(question.id, { label: e.target.value })}
                        className="flex-1 bg-transparent border-0 border-b border-foreground/10 p-0 h-8 text-[15px] font-semibold text-foreground placeholder:text-foreground/20 focus:outline-none focus:border-foreground/40 transition-colors"
                        placeholder="Type your question..."
                      />
                      <button type="button" onClick={() => removeApprovalQuestion(question.id)} className="p-2 rounded-full hover:bg-destructive/10 text-foreground/30 hover:text-destructive transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <Select value={question.type} onValueChange={(v: "text" | "textarea" | "select") => updateApprovalQuestion(question.id, { type: v, options: v === "select" ? (question.options || [""]) : undefined })}>
                        <SelectTrigger className="h-10 bg-foreground/5 border-foreground/5 rounded-xl text-sm font-medium">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-popover/95 backdrop-blur-xl border-foreground/10 rounded-2xl shadow-2xl">
                          <SelectItem value="text" className="rounded-xl">Short Text</SelectItem>
                          <SelectItem value="textarea" className="rounded-xl">Long Text</SelectItem>
                          <SelectItem value="select" className="rounded-xl">Multiple Choice</SelectItem>
                        </SelectContent>
                      </Select>

                      <div className="flex items-center justify-between rounded-xl bg-foreground/5 px-4 h-10 border border-foreground/5">
                        <span className="text-xs font-bold uppercase tracking-wider text-foreground/40">Required</span>
                        <Switch checked={Boolean(question.required)} onCheckedChange={(c) => updateApprovalQuestion(question.id, { required: c })} className="data-[state=checked]:bg-foreground/40" />
                      </div>
                    </div>

                    {question.type === "select" && (
                      <div className="space-y-2 pt-2">
                        {(question.options && question.options.length > 0 ? question.options : [""]).map((opt, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                             <div className="h-1.5 w-1.5 rounded-full bg-foreground/20" />
                            <input
                              value={opt}
                              onChange={(e) => {
                                const next = [...(question.options || [""])];
                                next[idx] = e.target.value;
                                updateApprovalQuestion(question.id, { options: next });
                              }}
                              className="flex-1 bg-transparent border-0 border-b border-foreground/5 p-0 h-7 text-[13px] text-foreground/70 placeholder:text-foreground/20 focus:outline-none focus:border-foreground/20 transition-colors"
                              placeholder={`Option ${idx + 1}`}
                            />
                            <button type="button" onClick={() => {
                              const next = [...(question.options || [""])];
                              next.splice(idx, 1);
                              updateApprovalQuestion(question.id, { options: next.length > 0 ? next : [""] });
                            }} className="p-1 rounded-full hover:bg-destructive/10 text-foreground/20 hover:text-destructive transition-colors">
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                        <button type="button" onClick={() => updateApprovalQuestion(question.id, { options: [...(question.options || [""]), ""] })} className="text-[11px] font-bold uppercase tracking-widest text-foreground/30 hover:text-foreground/60 px-1 py-1 transition-colors">
                          + Add Option
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="ghost" onClick={() => setIsApprovalDialogOpen(false)} className="rounded-full px-6 text-foreground/60 hover:text-foreground hover:bg-foreground/5">Cancel</Button>
                <Button type="button" onClick={saveApprovalQuestions} className="rounded-full px-8 bg-foreground text-background hover:bg-foreground/90 font-bold">Apply Form</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Capacity Dialog */}
        <Dialog open={isCapacityDialogOpen} onOpenChange={setIsCapacityDialogOpen}>
          <DialogContent className="max-w-sm bg-popover/95 backdrop-blur-xl border-foreground/10 text-foreground shadow-2xl rounded-3xl p-6">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold tracking-tight text-foreground/90">Event Capacity</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 mt-6">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-foreground/5 border border-foreground/5">
                <div className="space-y-0.5">
                  <p className="text-sm font-bold text-foreground/90">Limit Capacity</p>
                  <p className="text-[11px] text-foreground/40 font-medium uppercase tracking-wider">Turn on to set a guest limit</p>
                </div>
                <Switch checked={isCapacityLimitedDraft} onCheckedChange={setIsCapacityLimitedDraft} className="data-[state=checked]:bg-foreground/40" />
              </div>

              {isCapacityLimitedDraft && (
                <div className="space-y-2 px-1">
                  <Label className="text-xs font-bold uppercase tracking-wider text-foreground/50 ml-1">Maximum Guests</Label>
                  <input
                    type="number"
                    value={draftMaxGuests}
                    onChange={(e) => setDraftMaxGuests(e.target.value)}
                    min={1}
                    placeholder="Enter limit..."
                    className="w-full h-12 bg-foreground/5 border border-foreground/10 rounded-2xl px-4 text-xl font-bold text-foreground placeholder:text-foreground/20 focus:outline-none focus:ring-2 focus:ring-foreground/20 transition-all text-center"
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="ghost" onClick={() => setIsCapacityDialogOpen(false)} className="rounded-full px-6 text-foreground/60 hover:text-foreground hover:bg-foreground/5">Cancel</Button>
                <Button type="button" onClick={saveCapacitySettings} className="rounded-full px-8 bg-foreground text-background hover:bg-foreground/90 font-bold">Save</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

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
            entryMode: event?.entryMode || 'open',
            formSchema: event?.formSchema || [],
          }}
          onUpdate={(data) => {
            if (data.maxGuests) setValue('maxGuests', data.maxGuests);
          }}
          lockImmutableFields
        />

        <ExtraInfoDialog isOpen={isExtraInfoOpen} onClose={() => setIsExtraInfoOpen(false)} items={extraInfo} onSave={(items) => setExtraInfo(items)} />
      </div>
    </ThemeBackground>
    </div>
  );
}



