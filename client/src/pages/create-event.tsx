import { useState, useRef, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import LazyImage from "@/components/ui/lazy-image";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, MapPin, Globe, Edit3, Image, Check, Ticket, Users, Settings, PlusCircle, Trash2, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Link, useLocation } from "wouter";
import Header from "@/components/layout/header";
import { ThemeBackground } from "@/components/ThemeBackground";
import { PosterSelector } from "@/components/poster-selector";
import { ThemeSelector } from "@/components/theme-selector";
import { getRandomMinimalThemeId } from "@/components/theme-catalog";
import { ManageEventPopup } from "@/components/manage-event-popup";
import { PayoutDetailsModal, type PayoutDetails } from "@/components/payout-details-modal";
import { ExtraInfoDialog, type ExtraInfoItem } from "@/components/extra-info-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const DEFAULT_POSTERS = [
  { id: 's1', title: 'Stadium Turf', url: 'https://pub-235cf704af824b4f862d187c67946951.r2.dev/catalog/sports_poster.png', category: 'sports' },
  { id: 's2', title: 'Badminton Court', url: 'https://pub-235cf704af824b4f862d187c67946951.r2.dev/catalog/badminton_poster.png', category: 'sports' },
  { id: 's3', title: 'Table Tennis', url: 'https://pub-235cf704af824b4f862d187c67946951.r2.dev/catalog/table_tennis_poster.png', category: 'sports' },
  { id: 's4', title: 'Pickleball', url: 'https://pub-235cf704af824b4f862d187c67946951.r2.dev/catalog/pickle_poster.png', category: 'sports' },
  { id: 's5', title: 'Cricket Ground', url: 'https://pub-235cf704af824b4f862d187c67946951.r2.dev/catalog/cricket_poster.png', category: 'sports' },
  { id: 'a1', title: 'Deep Flow', url: 'https://pub-235cf704af824b4f862d187c67946951.r2.dev/catalog/abstract_poster.png', category: 'abstract' },
  { id: 'f1', title: 'Stage Neon', url: 'https://pub-235cf704af824b4f862d187c67946951.r2.dev/catalog/festival_poster.png', category: 'festival' },
  { id: 'u1', title: 'Playful Glow', url: 'https://pub-235cf704af824b4f862d187c67946951.r2.dev/catalog/fun_poster.png', category: 'fun' },
  { id: 'e1', title: 'Marble Sun', url: 'https://pub-235cf704af824b4f862d187c67946951.r2.dev/catalog/aesthetical_poster.png', category: 'aesthetical' },
  { id: 'i1', title: 'Classic Card', url: 'https://pub-235cf704af824b4f862d187c67946951.r2.dev/catalog/invitation_poster.png', category: 'invitation' },
];

const getRandomPoster = () => {
  return DEFAULT_POSTERS[Math.floor(Math.random() * DEFAULT_POSTERS.length)];
};

const createEventSchema = z.object({
  title: z.string().min(1, "Event title is required"),
  eventType: z.enum(["offline", "online"]),
  datetime: z
    .string()
    .min(1, "Date and time are required")
    .refine((val) => {
      const d = new Date(val);
      return d >= new Date();
    }, { message: "Event date and time must be in the future" }),
  endDatetime: z.string().min(1, "End date and time are required"),
  location: z.string().optional(),
  mapLink: z.string().optional(),
  description: z.string().optional(),
  maxGuests: z.number().min(1, "Must allow at least 1 guest"),
  isPrivate: z.boolean(),
  themeId: z.string().min(1, "Please select a theme"),
  groupId: z.number().optional(),
  ticketPrice: z.number().min(0, "Cost must be 0 or greater").optional(),
  posterData: z.object({
    selectedImage: z.string().min(1, "Poster image is required"),
    customTitle: z.string().optional(),
    imageId: z.string().optional(),
  }, { required_error: "Please select an event poster" }),
}).refine((data) => {
  const start = new Date(data.datetime);
  const end = new Date(data.endDatetime);
  return end > start;
}, {
  message: "End date must be after start date",
  path: ["endDatetime"],
});

type CreateEventFormData = z.infer<typeof createEventSchema>;

type FormQuestion = {
  id: string;
  label: string;
  type: "text" | "textarea" | "select";
  required: boolean;
  options?: string[];
};

export const FONT_OPTIONS = [
  { id: "font-sans", name: "Default", class: "font-sans" },
  { id: "font-outfit", name: "Modern", class: "font-['Outfit']" },
  { id: "font-playfair", name: "Elegant", class: "font-['Playfair_Display']" },
  { id: "font-space", name: "Tech", class: "font-['Space_Grotesk']" },
  { id: "font-caveat", name: "Handwritten", class: "font-['Caveat']" },
];

export default function CreateEventPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedFont, setSelectedFont] = useState(FONT_OPTIONS[0].class);
  const [selectedTheme, setSelectedTheme] = useState(() => getRandomMinimalThemeId());
  const [isEditingTitle, setIsEditingTitle] = useState(false);
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
  const [draftEventType, setDraftEventType] = useState<"offline" | "online">("offline");
  const [draftDescription, setDraftDescription] = useState("");
  const [approvalQuestionDrafts, setApprovalQuestionDrafts] = useState<FormQuestion[]>([]);

  const [isPosterSelectorOpen, setIsPosterSelectorOpen] = useState(false);
  const [selectedPoster, setSelectedPoster] = useState<any>(() => getRandomPoster());
  const [isManagePopupOpen, setIsManagePopupOpen] = useState(false);
  const [extraInfo, setExtraInfo] = useState<ExtraInfoItem[]>([]);
  const [isExtraInfoOpen, setIsExtraInfoOpen] = useState(false);

  const [rsvpMode, setRsvpMode] = useState<"rsvp" | "register">("register");
  const [showGuestCount, setShowGuestCount] = useState<boolean>(true);
  const [guestListVisibility, setGuestListVisibility] = useState<"host-only" | "attendees-only" | "everyone">("everyone");
  const [isEventClosed, setIsEventClosed] = useState<boolean>(false);
  const [entryMode, setEntryMode] = useState<"open" | "approval" | "invite_only">("open");
  const [formSchema, setFormSchema] = useState<any[]>([]);

  const [isPaidEvent, setIsPaidEvent] = useState(false);
  const [payoutDetails, setPayoutDetails] = useState<PayoutDetails | null>(null);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [ticketPrice, setTicketPrice] = useState<number>(0);

  const payoutDetailsRef = useRef<PayoutDetails | null>(null);

  const urlParams = new URLSearchParams(window.location.search);
  const groupIdFromUrl = urlParams.get("groupId");
  const initialGroupId = groupIdFromUrl ? parseInt(groupIdFromUrl, 10) : undefined;

  const { data: userCommunities = [] } = useQuery({
    queryKey: ["/api/profile/groups"],
    queryFn: async () => {
      const response = await fetch("/api/profile/groups", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch communities");
      return response.json();
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<CreateEventFormData>({
    resolver: zodResolver(createEventSchema),
    defaultValues: {
      eventType: "offline",
      isPrivate: false,
      themeId: selectedTheme,
      maxGuests: 10,
      groupId: initialGroupId,
      posterData: {
        selectedImage: selectedPoster.url,
        customTitle: selectedPoster.title,
        imageId: selectedPoster.id,
      },
    },
  });

  const startValue = watch("datetime");
  const endValue = watch("endDatetime");

  useEffect(() => {
    if (initialGroupId && userCommunities.length > 0) {
      const communityExists = userCommunities.some((c: any) => c.id === initialGroupId);
      if (communityExists) setValue("groupId", initialGroupId);
    }
  }, [initialGroupId, userCommunities, setValue]);

  useEffect(() => {
    document.body.classList.add("force-dark-page");
    return () => {
      document.body.classList.remove("force-dark-page");
    };
  }, []);



  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    for (let hour = 0; hour < 24; hour += 1) {
      for (let minute = 0; minute < 60; minute += 30) {
        slots.push(`${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
      }
    }
    return slots;
  }, []);

  const createEventMutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        ...data,
        datetime: data.datetime,
        endDatetime: data.endDatetime || null,
      };
      const res = await apiRequest("POST", "/api/events", payload);
      if (!res.ok) throw new Error((await res.json()).message || "Failed to create event");
      return res.json();
    },
    onSuccess: (ev, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      if (variables.groupId) {
        queryClient.invalidateQueries({ queryKey: [`/api/groups/${variables.groupId}/events`] });
      }
      toast({ title: "Event created", description: "Your event has been created." });
      setLocation(`/events/${ev.slug || ev.id}`);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message || "Failed to create event", variant: "destructive" }),
  });

  const onSubmit = (data: CreateEventFormData) => {
    if (isPaidEvent && (!ticketPrice || ticketPrice <= 0)) {
      toast({
        title: "Ticket price required",
        description: "Enter a ticket amount to create a paid event, or turn off paid tickets to create a free event.",
        variant: "destructive",
      });
      return;
    }

    const eventData = {
      ...data,
      rsvpMode,
      showGuestCount,
      guestListVisibility,
      isClosed: isEventClosed,
      entryMode,
      maxCapacity: data.maxGuests,
      formSchema: entryMode === "approval" ? formSchema : [],
      posterData: selectedPoster
        ? {
          selectedImage: selectedPoster.url,
          customTitle: selectedPoster.title,
          imageId: selectedPoster.id,
        }
        : null,
      settings: {
        extraInfo: extraInfo.length > 0 ? extraInfo : undefined,
        payoutDetails: payoutDetails || undefined,
        fontFamily: selectedFont,
      },
    };

    createEventMutation.mutate(eventData);
  };

  const handlePosterSelect = (poster: any) => {
    setSelectedPoster(poster);
    setValue("posterData", {
      selectedImage: poster.url,
      customTitle: poster.title,
      imageId: poster.id,
    });
    toast({ title: "Poster selected", description: `${poster.title} has been selected for your event.` });
  };

  const handlePosterUpload = async (file: File) => {
    try {
      toast({ title: "Uploading...", description: "Please wait while we upload your poster." });

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload/poster", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) throw new Error("Upload failed");

      const { url, id } = await response.json();

      const posterData = {
        id,
        title: file.name,
        url,
        category: "uploaded",
      };

      setSelectedPoster(posterData);
      setValue("posterData", {
        selectedImage: url,
        customTitle: file.name,
        imageId: id,
      });
      toast({ title: "Poster uploaded", description: "Your custom poster has been uploaded successfully." });
    } catch (error) {
      console.error("Upload error:", error);
      toast({ title: "Upload failed", description: "Could not upload poster. Please try again.", variant: "destructive" });
    }
  };

  const getDatePart = (value?: string) => (value?.split("T")[0] || "");
  const getTimePart = (value?: string) => (value?.split("T")[1]?.slice(0, 5) || "");

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

  const parseDateValue = (value?: string) => {
    if (!value) return undefined;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  };

  const formatDateDisplay = (value?: string) => {
    const parsed = parseDateValue(value);
    if (!parsed) return "Select date";
    return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const formatTimeDisplay = (value?: string) => {
    const timePart = getTimePart(value);
    if (!timePart) return "Select time";
    const [hours, minutes] = timePart.split(":").map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  };

  const toDateInputValue = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

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
    const [hours, minutes] = time.split(":").map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  };

  const openLocationDialog = () => {
    setDraftLocation(watch("location") || "");
    setDraftMapLink(watch("mapLink") || "");
    setDraftEventType(watch("eventType") || "offline");
    setIsLocationDialogOpen(true);
  };

  const openDescriptionDialog = () => {
    setDraftDescription(watch("description") || "");
    setIsDescriptionDialogOpen(true);
  };

  const saveLocationDetails = () => {
    setValue("location", draftLocation.trim(), { shouldValidate: true, shouldDirty: true });
    setValue("mapLink", draftMapLink.trim(), { shouldValidate: true, shouldDirty: true });
    setValue("eventType", draftEventType, { shouldValidate: true, shouldDirty: true });
    setIsLocationDialogOpen(false);
  };

  const saveDescriptionDetails = () => {
    setValue("description", draftDescription.trim(), { shouldValidate: true, shouldDirty: true });
    setIsDescriptionDialogOpen(false);
  };

  const openApprovalDialog = () => {
    const existingQuestions: FormQuestion[] = Array.isArray(formSchema)
      ? formSchema
        .filter((q: any) => typeof q?.label === "string")
        .map((q: any) => ({
          id: q.id || `q${Date.now()}-${Math.random().toString(16).slice(2)}`,
          label: q.label,
          type: q.type === "textarea" || q.type === "select" ? q.type : "text",
          required: Boolean(q.required),
          options: q.type === "select" ? (Array.isArray(q.options) && q.options.length > 0 ? q.options : [""]) : undefined,
        }))
      : [];

    setApprovalQuestionDrafts(existingQuestions);
    setIsApprovalDialogOpen(true);
  };

  const addApprovalQuestion = () => {
    setApprovalQuestionDrafts((prev) => [
      ...prev,
      {
        id: `q${Date.now()}-${Math.random().toString(16).slice(2)}`,
        label: "New question",
        type: "text",
        required: false,
      },
    ]);
  };

  const updateApprovalQuestion = (id: string, patch: Partial<FormQuestion>) => {
    setApprovalQuestionDrafts((prev) => prev.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  };

  const removeApprovalQuestion = (id: string) => {
    setApprovalQuestionDrafts((prev) => prev.filter((q) => q.id !== id));
  };

  const saveApprovalQuestions = () => {
    const cleaned = approvalQuestionDrafts
      .map((q) => ({
        ...q,
        label: q.label.trim(),
        options: q.type === "select"
          ? (q.options || [""]).map((opt) => opt.trim()).filter(Boolean)
          : undefined,
      }))
      .filter((q) => q.label.length > 0);

    setFormSchema(
      cleaned.map((q) => ({
        ...q,
        options: q.type === "select" ? (q.options && q.options.length > 0 ? q.options : ["Option 1"]) : undefined,
      }))
    );
    setEntryMode("approval");
    setIsApprovalDialogOpen(false);
  };

  const openCapacityDialog = () => {
    const currentMaxGuests = watch("maxGuests");
    if (typeof currentMaxGuests === "number" && currentMaxGuests > 0) {
      setIsCapacityLimitedDraft(true);
      setDraftMaxGuests(String(currentMaxGuests));
    } else {
      setIsCapacityLimitedDraft(false);
      setDraftMaxGuests("10");
    }
    setIsCapacityDialogOpen(true);
  };

  const saveCapacitySettings = () => {
    if (isCapacityLimitedDraft) {
      const parsedCapacity = Number.parseInt(draftMaxGuests, 10);
      if (!Number.isFinite(parsedCapacity) || parsedCapacity < 1) {
        toast({
          title: "Invalid capacity",
          description: "Please enter a number greater than 0.",
          variant: "destructive",
        });
        return;
      }
      setValue("maxGuests", parsedCapacity, { shouldValidate: true, shouldDirty: true });
    } else {
      setValue("maxGuests", undefined as unknown as number, { shouldValidate: true, shouldDirty: true });
    }
    setIsCapacityDialogOpen(false);
  };

  return (
    <div className="force-dark">
      <ThemeBackground themeId={selectedTheme} displayMode="dark" className="min-h-screen">
        <div className="relative z-10 min-h-screen flex flex-col">
          <Header />

        <main className="flex-1 px-4 sm:px-6 lg:px-8 pt-24 pb-12 sm:pt-28 sm:pb-16">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between gap-3 pb-4 border-b border-foreground/10">
              <Link href="/">
                <Button variant="ghost" size="sm" className="text-foreground/70 hover:text-foreground hover:bg-foreground/10 h-8 px-2">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </Link>

              <Button
                type="submit"
                form="create-event-form"
                disabled={createEventMutation.isPending || (isPaidEvent && (!ticketPrice || ticketPrice <= 0))}
                className="h-9 rounded-md bg-foreground text-background hover:bg-foreground/90 shadow-none font-medium"
              >
                {createEventMutation.isPending ? "Creating..." : "Create Event"}
              </Button>
            </div>

            <form id="create-event-form" onSubmit={handleSubmit(onSubmit)}>
              <div className="grid lg:grid-cols-6 gap-8 items-start">
                <div className="lg:col-span-4 max-w-[860px] space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      <Select
                        value={watch("groupId")?.toString() || "none"}
                        onValueChange={(value) => setValue("groupId", value !== "none" ? parseInt(value, 10) : undefined)}
                      >
                        <SelectTrigger className="h-9 min-w-[120px] sm:min-w-[140px] w-auto border-0 bg-foreground/10 hover:bg-foreground/15 backdrop-blur-xl text-foreground/90 rounded-full px-4 py-1.5 text-[12px] sm:text-[13px] font-semibold transition-all shadow-lg ring-1 ring-inset ring-white/10">
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.6)]" />
                            <span className="truncate">
                              {watch("groupId")
                                ? userCommunities.find((c: any) => c.id === watch("groupId"))?.name
                                : "Personal Calendar"}
                            </span>
                          </div>
                        </SelectTrigger>
                        <SelectContent className="border-foreground/10 bg-popover/95 backdrop-blur-xl rounded-2xl shadow-2xl">
                          <SelectItem value="none" className="rounded-xl focus:bg-foreground/5 cursor-pointer">
                            <div className="flex items-center gap-2 font-medium">
                              <span className="h-2 w-2 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.6)]" />
                              Personal Calendar
                            </div>
                          </SelectItem>
                          {userCommunities.map((community: any) => (
                            <SelectItem key={community.id} value={community.id.toString()} className="rounded-xl focus:bg-foreground/5 cursor-pointer">
                              <div className="flex items-center gap-2 font-medium">{community.name}</div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select
                        value={watch("isPrivate") ? "private" : "public"}
                        onValueChange={(value) => setValue("isPrivate", value === "private")}
                      >
                        <SelectTrigger className="h-9 min-w-[80px] sm:min-w-[100px] w-auto border-0 bg-foreground/10 hover:bg-foreground/15 backdrop-blur-xl text-foreground/90 rounded-full px-4 py-1.5 text-[12px] sm:text-[13px] font-semibold transition-all shadow-lg ring-1 ring-inset ring-white/10">
                          <div className="flex items-center gap-2">
                             <Globe className="h-3.5 w-3.5 opacity-60" />
                             <SelectValue />
                          </div>
                        </SelectTrigger>
                        <SelectContent className="border-foreground/10 bg-popover/95 backdrop-blur-xl rounded-2xl shadow-2xl">
                          <SelectItem value="public" className="rounded-xl focus:bg-foreground/5 cursor-pointer font-medium">Public</SelectItem>
                          <SelectItem value="private" className="rounded-xl focus:bg-foreground/5 cursor-pointer font-medium">Private</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select
                        value={selectedFont}
                        onValueChange={(value) => setSelectedFont(value)}
                      >
                        <SelectTrigger className="h-9 min-w-[80px] sm:min-w-[100px] w-auto border-0 bg-foreground/10 hover:bg-foreground/15 backdrop-blur-xl text-foreground/90 rounded-full px-4 py-1.5 text-[12px] sm:text-[13px] font-semibold transition-all shadow-lg ring-1 ring-inset ring-white/10">
                          <span className="truncate">
                            {FONT_OPTIONS.find(f => f.class === selectedFont)?.name || "Default"}
                          </span>
                        </SelectTrigger>
                        <SelectContent className="border-foreground/10 bg-popover/95 backdrop-blur-xl rounded-2xl shadow-2xl">
                          {FONT_OPTIONS.map(font => (
                            <SelectItem key={font.name} value={font.class} className="rounded-xl focus:bg-foreground/5 cursor-pointer font-medium">
                              {font.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {isEditingTitle ? (
                      <input
                        {...register("title")}
                        autoFocus
                        onBlur={() => setIsEditingTitle(false)}
                        onKeyDown={(e) => e.key === "Enter" && setIsEditingTitle(false)}
                        className={`text-3xl sm:text-[34px] font-medium border-none p-0 text-foreground placeholder:text-foreground/50 focus:outline-none focus:ring-0 w-full ${selectedFont}`}
                        placeholder="Untitled Event"
                      />
                    ) : (
                      <button
                        type="button"
                        className="text-left w-full"
                        onClick={() => setIsEditingTitle(true)}
                      >
                        <h1 className={`text-3xl sm:text-[34px] font-medium tracking-tight text-foreground/95 ${selectedFont}`}>{watch("title") || "Event Name"}</h1>
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

                   <div className="flex flex-col md:flex-row gap-3">
                    <div className="flex-1 space-y-2">
                      <div className="rounded-2xl border border-white/10 bg-white/[0.08] backdrop-blur-2xl overflow-hidden shadow-2xl">
                        {/* Start Date/Time Row */}
                        <div className="relative flex items-center justify-between pl-4 pr-4 py-3.5 border-b border-white/[0.06] hover:bg-white/[0.03] transition-colors">
                          <div className="absolute left-[1.44rem] top-[2.8rem] h-[calc(100%+0.9rem)] w-px bg-gradient-to-b from-foreground/45 via-foreground/30 to-foreground/20" />
                          <div className="flex items-center gap-3">
                            <div className="h-3 w-3 rounded-full border border-white/50 bg-foreground/80 shadow-[0_0_8px_rgba(255,255,255,0.25)]" />
                            <span className="text-foreground/85 text-[15px] font-semibold">Start</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Popover open={openDatePicker === "start"} onOpenChange={(open) => setOpenDatePicker(open ? "start" : null)}>
                              <PopoverTrigger asChild>
                                <button type="button" className="px-3 py-1.5 rounded-xl bg-white/[0.09] hover:bg-white/[0.14] text-[15px] text-foreground/95 font-semibold transition-all border border-white/[0.08]">
                                  {formatDateDisplay(startValue)}
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto border-foreground/10 bg-popover/95 backdrop-blur-xl p-0 text-foreground" align="end">
                                <Calendar mode="single" selected={parseDateValue(startValue)} onSelect={(date) => handleDateSelect("datetime", date)} disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))} initialFocus />
                              </PopoverContent>
                            </Popover>

                            <Popover open={openTimePicker === "start"} onOpenChange={(open) => setOpenTimePicker(open ? "start" : null)}>
                              <PopoverTrigger asChild>
                                <button type="button" className="px-3 py-1.5 rounded-xl bg-white/[0.09] hover:bg-white/[0.14] text-[15px] text-foreground/95 font-semibold transition-all border border-white/[0.08]">
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
                        <div className="relative flex items-center justify-between pl-4 pr-4 py-3.5 hover:bg-white/[0.03] transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="h-3 w-3 rounded-full border border-foreground/60 bg-transparent ring-2 ring-white/25" />
                            <span className="text-foreground/85 text-[15px] font-semibold">End</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Popover open={openDatePicker === "end"} onOpenChange={(open) => setOpenDatePicker(open ? "end" : null)}>
                              <PopoverTrigger asChild>
                                <button type="button" className="px-3 py-1.5 rounded-xl bg-white/[0.09] hover:bg-white/[0.14] text-[15px] text-foreground/95 font-semibold transition-all border border-white/[0.08]">
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
                                <button type="button" className="px-3 py-1.5 rounded-xl bg-white/[0.09] hover:bg-white/[0.14] text-[15px] text-foreground/95 font-semibold transition-all border border-white/[0.08]">
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
                      className="w-full rounded-2xl border border-white/10 bg-white/[0.08] backdrop-blur-2xl px-4 py-4 text-left transition-all hover:bg-white/[0.12] shadow-xl group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-xl bg-white/[0.06] border border-white/[0.06] text-foreground/60 transition-colors group-hover:text-foreground/90">
                          <MapPin className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-foreground/95 text-[15px] font-semibold tracking-tight">Add Event Location</p>
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
                      className="w-full rounded-2xl border border-white/10 bg-white/[0.08] backdrop-blur-2xl px-4 py-4 text-left transition-all hover:bg-white/[0.12] shadow-xl group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-xl bg-white/[0.06] border border-white/[0.06] text-foreground/60 transition-colors group-hover:text-foreground/90">
                          <Edit3 className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-foreground/95 text-[15px] font-semibold tracking-tight">Add Description</p>
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
                      <div className="flex items-center justify-between px-4 py-4 border-b border-white/[0.05] hover:bg-foreground/[0.02] transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-foreground/[0.05] border border-foreground/5 text-foreground/60">
                            <Ticket className="h-5 w-5" />
                          </div>
                          <span className="text-foreground/90 text-[15px] font-semibold">Ticket Price</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-foreground/60 text-[15px] font-medium">{isPaidEvent && ticketPrice > 0 ? `₹${ticketPrice}` : "Free"}</span>
                          <button type="button" onClick={() => setShowPayoutModal(true)} className="p-1 px-2 rounded-lg bg-foreground/[0.06] hover:bg-foreground/[0.1] text-foreground/60 hover:text-foreground transition-all">
                            <Edit3 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {isPaidEvent && payoutDetails && (
                        <div className="px-3 pb-3 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-foreground/65 text-sm">₹</span>
                            <Input
                              type="number"
                              value={ticketPrice || ""}
                              onChange={(e) => {
                                const value = parseFloat(e.target.value) || 0;
                                setTicketPrice(value);
                                setValue("ticketPrice", value);
                              }}
                              onWheel={(e) => e.currentTarget.blur()}
                              min={1}
                              placeholder="Ticket amount"
                              className="h-8 rounded-lg border border-border text-sm text-foreground placeholder:text-foreground/45 focus-visible:ring-0 focus-visible:border-foreground/20"
                            />
                          </div>
                          <p className="text-xs text-foreground/50">Payout: {payoutDetails.payoutMethod === "upi" ? "UPI" : "Bank Account"}</p>
                        </div>
                      )}

                      <div className="flex items-center justify-between px-4 py-4 border-b border-white/[0.05] hover:bg-foreground/[0.02] transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-foreground/[0.05] border border-foreground/5 text-foreground/60">
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
                            <div className="p-2 rounded-xl bg-foreground/[0.05] border border-foreground/5 text-foreground/60">
                              <Users className="h-5 w-5" />
                            </div>
                            <span className="text-foreground/90 text-[15px] font-semibold">Capacity</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-foreground/60 text-[15px] font-medium">{watch("maxGuests") || "Unlimited"}</span>
                            <button
                              type="button"
                              onClick={openCapacityDialog}
                              className="p-1 px-2 rounded-lg bg-foreground/[0.06] hover:bg-foreground/[0.1] text-foreground/60 hover:text-foreground transition-all"
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
                      className="h-9 px-4 rounded-xl border border-white/10 bg-white/[0.08] backdrop-blur-2xl text-foreground/85 hover:text-foreground hover:bg-white/[0.12] text-sm font-semibold shadow-xl transition-colors"
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
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.08] backdrop-blur-2xl text-foreground/85 hover:text-foreground hover:bg-white/[0.12] h-12 text-sm font-semibold shadow-xl transition-colors"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Settings className="w-4 h-4" />
                      Manage
                    </span>
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

        <Dialog open={isLocationDialogOpen} onOpenChange={setIsLocationDialogOpen}>
          <DialogContent className="max-w-md bg-popover border-border text-popover-foreground shadow-none p-0 overflow-hidden backdrop-blur-xl">
            <DialogHeader className="p-4 border-b border-border">
              <DialogTitle className="text-base font-medium text-foreground/90">Event Location</DialogTitle>
            </DialogHeader>
            <div className="p-4 space-y-4">
              <div className="flex p-1 bg-foreground/5 rounded-lg border border-border">
                <button
                  type="button"
                  onClick={() => setDraftEventType("offline")}
                  className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-sm font-medium rounded-md transition-all ${draftEventType === "offline"
                    ? "bg-foreground/10 text-foreground shadow-sm"
                    : "text-foreground/50 hover:text-foreground/80"
                    }`}
                >
                  <MapPin className="h-3.5 w-3.5" />
                  Offline
                </button>
                <button
                  type="button"
                  onClick={() => setDraftEventType("online")}
                  className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-sm font-medium rounded-md transition-all ${draftEventType === "online"
                    ? "bg-foreground/10 text-foreground shadow-sm"
                    : "text-foreground/50 hover:text-foreground/80"
                    }`}
                >
                  <Globe className="h-3.5 w-3.5" />
                  Online
                </button>
              </div>

              {draftEventType === "offline" ? (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="space-y-1.5">
                    <Label className="text-[13px] text-foreground/60 font-normal ml-1">Location Name</Label>
                    <Input
                      value={draftLocation}
                      onChange={(e) => setDraftLocation(e.target.value)}
                      placeholder="e.g. Central Park"
                      className="h-9 rounded-md border border-border text-foreground placeholder:text-foreground/45 focus-visible:ring-0 focus-visible:border-foreground/20"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[13px] text-foreground/60 font-normal ml-1">Map Link (Optional)</Label>
                    <Input
                      value={draftMapLink}
                      onChange={(e) => setDraftMapLink(e.target.value)}
                      placeholder="https://maps.google.com/..."
                      className="h-9 rounded-md border border-border text-foreground placeholder:text-foreground/45 focus-visible:ring-0 focus-visible:border-foreground/20"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="space-y-1.5">
                    <Label className="text-[13px] text-foreground/60 font-normal ml-1">Meeting Link</Label>
                    <Input
                      value={draftMapLink}
                      onChange={(e) => setDraftMapLink(e.target.value)}
                      placeholder="Meet, Zoom or Discord link"
                      className="h-9 rounded-md border border-border text-foreground placeholder:text-foreground/45 focus-visible:ring-0 focus-visible:border-foreground/20"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[13px] text-foreground/60 font-normal ml-1">Virtual Location Name (Optional)</Label>
                    <Input
                      value={draftLocation}
                      onChange={(e) => setDraftLocation(e.target.value)}
                      placeholder="e.g. Zoom Meeting"
                      className="h-9 rounded-md border border-border text-foreground placeholder:text-foreground/45 focus-visible:ring-0 focus-visible:border-foreground/20"
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-border flex justify-end gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsLocationDialogOpen(false)}
                className="h-9 px-4 text-foreground/60 hover:text-foreground hover:bg-foreground/5"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={saveLocationDetails}
                className="h-9 px-4 rounded-md bg-foreground text-background font-medium shadow-none hover:bg-foreground/90"
              >
                Save Changes
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isDescriptionDialogOpen} onOpenChange={setIsDescriptionDialogOpen}>
          <DialogContent className="max-w-md bg-popover border-border text-popover-foreground shadow-none p-0 overflow-hidden backdrop-blur-xl">
            <DialogHeader className="p-4 border-b border-border">
              <DialogTitle className="text-base font-medium text-foreground/90">Event Description</DialogTitle>
            </DialogHeader>
            <div className="p-4 space-y-3">
              <Textarea
                value={draftDescription}
                onChange={(e) => setDraftDescription(e.target.value)}
                placeholder="Tell people more about your event..."
                className="min-h-[140px] rounded-md border border-border text-foreground placeholder:text-foreground/45 resize-none focus-visible:ring-0 focus-visible:border-foreground/20"
              />
            </div>
            <div className="p-4 border-t border-border flex justify-end gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsDescriptionDialogOpen(false)}
                className="h-9 px-4 text-foreground/60 hover:text-foreground hover:bg-foreground/5"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={saveDescriptionDetails}
                className="h-9 px-4 rounded-md bg-foreground text-background font-medium shadow-none hover:bg-foreground/90"
              >
                Save Changes
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isApprovalDialogOpen} onOpenChange={setIsApprovalDialogOpen}>
          <DialogContent className="max-w-lg bg-[#0f1012]/95 border-white/10 text-white shadow-none p-0 overflow-hidden backdrop-blur-xl">
            <DialogHeader className="p-4 border-b border-white/10">
              <DialogTitle className="text-base font-medium text-white/90 flex items-center gap-2">
                <FileText className="h-4 w-4 text-white/65" />
                Application Form Builder
              </DialogTitle>
            </DialogHeader>
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-white/55">Leave empty for approval-only mode.</p>
                <Button
                  type="button"
                  size="sm"
                  onClick={addApprovalQuestion}
                  className="h-8 px-3 rounded-md bg-white/90 hover:bg-white text-black"
                >
                  <PlusCircle className="h-4 w-4 mr-1" />
                  Add Question
                </Button>
              </div>

              {approvalQuestionDrafts.length === 0 && (
                <p className="text-xs text-white/60">No questions yet. Add your first question.</p>
              )}

              <div className="space-y-3 max-h-[46vh] overflow-y-auto pr-1">
                {approvalQuestionDrafts.map((question) => (
                  <div key={question.id} className="rounded-md border border-white/10 bg-white/[0.03] p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        value={question.label}
                        onChange={(e) => updateApprovalQuestion(question.id, { label: e.target.value })}
                        className="h-8 border-white/15 text-white placeholder:text-white/45"
                        placeholder="Question label"
                      />
                      <button
                        type="button"
                        onClick={() => removeApprovalQuestion(question.id)}
                        className="text-white/55 hover:text-white"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Select
                        value={question.type}
                        onValueChange={(value: "text" | "textarea" | "select") => {
                          updateApprovalQuestion(question.id, {
                            type: value,
                            options: value === "select" ? (question.options || [""]) : undefined,
                          });
                        }}
                      >
                        <SelectTrigger className="h-8 bg-white/5 border-white/15 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-black/90 border-white/15 text-white">
                          <SelectItem value="text">Text</SelectItem>
                          <SelectItem value="textarea">Textarea</SelectItem>
                          <SelectItem value="select">Select</SelectItem>
                        </SelectContent>
                      </Select>

                      <label className="flex items-center justify-between rounded-md border border-white/15 px-3 py-1.5 text-sm text-white/85">
                        Required
                        <Switch
                          checked={Boolean(question.required)}
                          onCheckedChange={(checked) => updateApprovalQuestion(question.id, { required: checked })}
                          className="data-[state=checked]:bg-white/35"
                        />
                      </label>
                    </div>

                    {question.type === "select" && (
                      <div className="space-y-2">
                        {(question.options && question.options.length > 0 ? question.options : [""]).map((option, optionIndex) => (
                          <div key={`${question.id}-option-${optionIndex}`} className="flex items-center gap-2">
                            <Input
                              value={option}
                              onChange={(e) => {
                                const nextOptions = [...(question.options && question.options.length > 0 ? question.options : [""])];
                                nextOptions[optionIndex] = e.target.value;
                                updateApprovalQuestion(question.id, { options: nextOptions });
                              }}
                              className="h-8 border-white/15 text-white placeholder:text-white/45"
                              placeholder={`Option ${optionIndex + 1}`}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const nextOptions = [...(question.options && question.options.length > 0 ? question.options : [""])];
                                nextOptions.splice(optionIndex, 1);
                                updateApprovalQuestion(question.id, { options: nextOptions.length > 0 ? nextOptions : [""] });
                              }}
                              className="text-white/55 hover:text-white"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => updateApprovalQuestion(question.id, { options: [...(question.options || [""]), ""] })}
                          className="h-7 px-2 text-xs text-white/75 hover:text-white hover:bg-white/10"
                        >
                          Add Option
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 border-t border-white/10 flex justify-end gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsApprovalDialogOpen(false)}
                className="h-9 px-4 text-white/60 hover:text-white hover:bg-white/5"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={saveApprovalQuestions}
                className="h-9 px-4 rounded-md bg-white/90 hover:bg-white text-black font-medium shadow-none"
              >
                Save Changes
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isCapacityDialogOpen} onOpenChange={setIsCapacityDialogOpen}>
          <DialogContent className="max-w-md bg-[#0f1012]/95 border-white/10 text-white shadow-none p-0 overflow-hidden backdrop-blur-xl">
            <DialogHeader className="p-4 border-b border-white/10">
              <DialogTitle className="text-base font-medium text-white/90">Event Capacity</DialogTitle>
            </DialogHeader>
            <div className="p-4 space-y-4">
              <label className="flex items-center justify-between rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/85">
                Limit event capacity
                <Switch
                  checked={isCapacityLimitedDraft}
                  onCheckedChange={setIsCapacityLimitedDraft}
                  className="data-[state=checked]:bg-white/35"
                />
              </label>

              {isCapacityLimitedDraft && (
                <div className="space-y-2">
                  <Label className="text-xs text-white/60">Max Capacity</Label>
                  <Input
                    type="number"
                    value={draftMaxGuests}
                    onChange={(e) => setDraftMaxGuests(e.target.value)}
                    min={1}
                    placeholder="Enter max capacity"
                    onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                    className="h-9 rounded-md border border-white/10 bg-white/5 text-white placeholder:text-white/45 focus-visible:ring-0 focus-visible:border-white/20"
                  />
                </div>
              )}
            </div>
            <div className="p-4 border-t border-white/10 flex justify-end gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsCapacityDialogOpen(false)}
                className="h-9 px-4 text-white/60 hover:text-white hover:bg-white/5"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={saveCapacitySettings}
                className="h-9 px-4 rounded-md bg-white/90 hover:bg-white text-black font-medium shadow-none"
              >
                Save Changes
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <ManageEventPopup
          isOpen={isManagePopupOpen}
          onClose={() => setIsManagePopupOpen(false)}
          eventData={{
            maxGuests: watch("maxGuests"),
            isPublic: !watch("isPrivate"),
            rsvpMode,
            showGuestCount,
            guestListVisibility,
            isClosed: isEventClosed,
            entryMode,
            formSchema,
          }}
          onUpdate={(data) => {
            if (data.maxGuests) setValue("maxGuests", data.maxGuests);
            if (data.isPublic !== undefined) setValue("isPrivate", !data.isPublic);
            if (data.rsvpMode) setRsvpMode(data.rsvpMode);
            if (data.showGuestCount !== undefined) setShowGuestCount(data.showGuestCount);
            if (data.guestListVisibility) setGuestListVisibility(data.guestListVisibility);
            if (data.isClosed !== undefined) setIsEventClosed(data.isClosed);
            if (data.entryMode) setEntryMode(data.entryMode);
            if (data.formSchema) setFormSchema(data.formSchema);
          }}
        />

        <PayoutDetailsModal
          isOpen={showPayoutModal}
          onClose={() => {
            if (!payoutDetailsRef.current) {
              setIsPaidEvent(false);
            }
            setShowPayoutModal(false);
          }}
          onSave={(details) => {
            payoutDetailsRef.current = details;
            setPayoutDetails(details);
            setIsPaidEvent(true);
            toast({
              title: "Payout details saved",
              description: "You can now set the ticket price for your event.",
            });
          }}
          initialData={payoutDetails || undefined}
        />

        <ExtraInfoDialog
          isOpen={isExtraInfoOpen}
          onClose={() => setIsExtraInfoOpen(false)}
          items={extraInfo}
          onSave={(items) => setExtraInfo(items)}
        />
        </div>
      </ThemeBackground>
    </div>
  );
}
