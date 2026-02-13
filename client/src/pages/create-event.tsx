import { useState, useMemo, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import LazyImage from "@/components/ui/lazy-image";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, MapPin, Globe, Lock, Plus, Image, Save, Edit3, Users, Clock, Tag, Settings, Camera, X, Check, Ticket } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import Header from "@/components/layout/header";
import { SimpleBackground } from "@/components/simple-background";
import { ThemeBackground } from "@/components/ThemeBackground";
import { PosterSelector } from "@/components/poster-selector";
import { ThemeSelector } from "@/components/theme-selector";
import { ManageEventPopup } from "@/components/manage-event-popup";
import { PayoutDetailsModal, type PayoutDetails } from "@/components/payout-details-modal";
import { ExtraInfoDialog, type ExtraInfoItem } from "@/components/extra-info-dialog";

// Schema
const createEventSchema = z.object({
  title: z.string().min(1, "Event title is required"),
  eventType: z.enum(["offline", "online"]),
  datetime: z.string().min(1, "Date and time are required").refine((val) => {
    const d = new Date(val); return d >= new Date();
  }, { message: "Event date and time must be in the future" }),
  endDatetime: z.string().min(1, "End date and time are required"),
  location: z.string().optional(),
  mapLink: z.string().optional(),
  description: z.string().optional(),
  maxGuests: z.number().min(1, "Must allow at least 1 guest"),
  isPrivate: z.boolean(),
  themeId: z.string().min(1, "Please select a theme"),
  groupId: z.number().optional(),
  ticketPrice: z.number().min(0, "Cost must be 0 or greater").optional()
}).refine((data) => {
  const start = new Date(data.datetime);
  const end = new Date(data.endDatetime);
  return end > start;
}, {
  message: "End date must be after start date",
  path: ["endDatetime"],
});
type CreateEventFormData = z.infer<typeof createEventSchema>;

export default function CreateEventPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTheme, setSelectedTheme] = useState('matrix-code');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['basic']));
  const [expandedActions, setExpandedActions] = useState<Set<string>>(new Set());
  const [isPosterSelectorOpen, setIsPosterSelectorOpen] = useState(false);
  const [selectedPoster, setSelectedPoster] = useState<any>(null);
  const [isManagePopupOpen, setIsManagePopupOpen] = useState(false);
  const [extraInfo, setExtraInfo] = useState<ExtraInfoItem[]>([]);
  const [isExtraInfoOpen, setIsExtraInfoOpen] = useState(false);
  const [rsvpMode, setRsvpMode] = useState<'rsvp' | 'register'>('register'); // Track RSVP mode from ManagePopup
  const [showGuestCount, setShowGuestCount] = useState<boolean>(true); // Track Show Guest Count from ManagePopup
  const [isPaidEvent, setIsPaidEvent] = useState(false);
  const [payoutDetails, setPayoutDetails] = useState<PayoutDetails | null>(null);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [ticketPrice, setTicketPrice] = useState<number>(0);

  // Keep a synchronous reference so modal onClose (called immediately after onSave)
  // can see the just-saved value.
  const payoutDetailsRef = useRef<PayoutDetails | null>(null);
  
  // Get groupId from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const groupIdFromUrl = urlParams.get('groupId');
  const initialGroupId = groupIdFromUrl ? parseInt(groupIdFromUrl) : undefined;
  
  // Predefined style tags
  const styleTags = ['gaming', 'meetup', 'casual', 'networking', 'workshop', 'celebration', 'outdoor', 'virtual'];
  
  // Quick action options
  const quickActions = [
    { id: 'food', label: 'Add food options', icon: '🍕' },
    { id: 'dress', label: 'Set dress code', icon: '👕' },
    { id: 'parking', label: 'Add parking info', icon: '🚗' },
    { id: 'gifts', label: 'Gift guidelines', icon: '🎁' },
    { id: 'contact', label: 'Emergency contact', icon: '📞' },
    { id: 'rules', label: 'House rules', icon: '📋' }
  ];

  // Fetch user's communities
  const { data: userCommunities = [] } = useQuery({
    queryKey: ["/api/profile/groups"],
    queryFn: async () => {
      const response = await fetch("/api/profile/groups", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch communities");
      return response.json();
    },
  });

  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<CreateEventFormData>({
    resolver: zodResolver(createEventSchema),
    defaultValues: { 
      eventType: 'offline', 
      isPrivate: false, 
      themeId: selectedTheme, 
      maxGuests: 10,
      groupId: initialGroupId
    }
  });
  const eventType = watch('eventType');
  const formValues = watch();

  // Ensure groupId from URL is set after communities are loaded
  useEffect(() => {
    if (initialGroupId && userCommunities.length > 0) {
      // Verify the groupId exists in the user's communities
      const communityExists = userCommunities.some((c: any) => c.id === initialGroupId);
      if (communityExists) {
        setValue('groupId', initialGroupId);
      }
    }
  }, [initialGroupId, userCommunities, setValue]);

  const createEventMutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = { ...data, datetime: new Date(data.datetime).toISOString() };
      const res = await apiRequest('POST', '/api/events', payload);
      if (!res.ok) throw new Error((await res.json()).message || 'Failed to create event');
      return res.json();
    },
    onSuccess: (ev, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      // If event was created for a specific group, invalidate that group's events too
      if (variables.groupId) {
        queryClient.invalidateQueries({ queryKey: [`/api/groups/${variables.groupId}/events`] });
      }
      toast({ title: 'Event created', description: 'Your event has been created.' });
      // Use slug if available, otherwise fallback to ID
      setLocation(`/events/${ev.slug || ev.id}`);
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message || 'Failed to create event', variant: 'destructive' })
  });

  const onSubmit = (data: CreateEventFormData) => {
    // If paid tickets are enabled, require a positive ticket price.
    // Users can only create a free event when the paid toggle is off.
    if (isPaidEvent && (!ticketPrice || ticketPrice <= 0)) {
      toast({
        title: "Ticket price required",
        description: "Enter a ticket amount to create a paid event, or turn off paid tickets to create a free event.",
        variant: "destructive",
      });
      return;
    }

    // Include poster data and custom fields if available
    const eventData = {
      ...data,
      rsvpMode, // Include RSVP mode from ManagePopup
      showGuestCount, // Include Show Guest Count from ManagePopup
      posterData: selectedPoster
        ? {
            selectedImage: selectedPoster.url,
            customTitle: selectedPoster.title,
            imageId: selectedPoster.id, // Store Cloudflare image ID for potential deletion later
          }
        : null,
      settings: {
        extraInfo: extraInfo.length > 0 ? extraInfo : undefined,
        payoutDetails: payoutDetails || undefined,
      },
    };
    // Trigger mutation
    createEventMutation.mutate(eventData);
  };
  // Poster handlers
  const handlePosterSelect = (poster: any) => {
    setSelectedPoster(poster);
    toast({ title: 'Poster selected', description: `${poster.title} has been selected for your event.` });
  };

  const handlePosterUpload = async (file: File) => {
    try {
      // Show loading toast
      toast({ title: 'Uploading...', description: 'Please wait while we upload your poster.' });

      // Create FormData
      const formData = new FormData();
      formData.append('file', file);

      // Upload to backend (which uploads to Cloudflare)
      const response = await fetch('/api/upload/poster', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      const { url, id } = await response.json();

      // Store the Cloudflare URL and ID
      const posterData = {
        id: id,
        title: file.name,
        url: url, // Permanent Cloudflare CDN URL
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

  // UI
  return (
    <ThemeBackground themeId={selectedTheme} className="min-h-screen">
      <div className="absolute inset-0 bg-black/25" />
      <div className="relative z-10 min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 px-3 sm:px-6 lg:px-8 pt-24 pb-12 sm:pt-28 sm:pb-16">
          <div className="max-w-7xl mx-auto space-y-4 sm:space-y-8">
            {/* Modern Header with Inline Title */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 sm:pb-6 border-b border-white/10">
              <div className="flex items-center gap-4 flex-1">
                <Link href="/">
                  <Button variant="ghost" size="sm" className="text-white/70 hover:text-white hover:bg-white/10">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                </Link>
                <div className="flex items-center gap-2 text-white/50 text-sm">
                  <span>Events</span>
                  <span>/</span>
                  <span className="text-white">Create New</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* <Button variant="outline" size="sm" className="border-white/20 text-white/70 hover:bg-white/10">
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button> */}
                <Button 
                  type="submit" 
                  form="create-event-form"
                  disabled={createEventMutation.isPending || (isPaidEvent && (!ticketPrice || ticketPrice <= 0))} 
                  className="brand-gradient text-white shadow-lg"
                >
                  <Check className="h-4 w-4 mr-2" />
                  {createEventMutation.isPending ? 'Creating...' : 'Create Event'}
                </Button>
              </div>
            </div>

            <form id="create-event-form" onSubmit={handleSubmit(onSubmit)}>
              <div className="grid lg:grid-cols-6 gap-8 items-start">
                {/* Left Form - Modern Minimalist Design */}
                <div className="lg:col-span-3 space-y-6">
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
                          <Check className="h-5 w-5" />
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
                          {selectedPoster ? `${selectedPoster.title} selected` : 'Click to select poster'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Main Event Details */}
                  <div className="rounded-xl sm:rounded-2xl border border-white/15 bg-white/5 backdrop-blur-xl p-4 sm:p-8 shadow-xl space-y-4 sm:space-y-6">


                  

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
{/* Location Field */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl bg-white/5 border border-white/10 transition-colors hover:bg-white/10">
                        <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-white/70 shrink-0" />
                        <div className="flex-1">
                          <Input
                            {...register('location')}
                            placeholder="Event location (optional)"
                            className="bg-transparent border-none p-1 sm:p-2 text-white placeholder:text-white/50 focus:ring-0 shadow-none text-base sm:text-lg"
                          />
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

                    {/* Enable Paid Tickets Toggle */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 transition-colors hover:bg-white/10">
                        <div className="flex items-center gap-3">
                          <Ticket className="h-5 w-5 text-white/70" />
                          <div>
                            <p className="text-white font-medium">Enable paid tickets</p>
                            <p className="text-white/50 text-sm">Collect payments for this event</p>
                          </div>
                        </div>
                        <Switch
                          checked={isPaidEvent}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setShowPayoutModal(true);
                            } else {
                              setIsPaidEvent(false);
                              payoutDetailsRef.current = null;
                              setPayoutDetails(null);
                              setTicketPrice(0);
                              setValue('ticketPrice', 0);
                            }
                          }}
                          className="data-[state=checked]:bg-green-500"
                        />
                      </div>

                      {/* Ticket Price Section - Only visible after payout details are saved */}
                      {isPaidEvent && payoutDetails && (
                        <div className="space-y-3 p-4 rounded-xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-400/20">
                          <div className="flex items-center justify-between">
                            <Label className="text-white font-medium">Ticket Price</Label>
                            <button
                              type="button"
                              onClick={() => setShowPayoutModal(true)}
                              className="text-xs text-green-400 hover:text-green-300 transition"
                            >
                              Edit payout details
                            </button>
                          </div>
                          <div className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10">
                            <span className="text-white/70 text-lg font-medium">₹</span>
                            <Input
  type="number"
  value={ticketPrice || ''}
  onChange={(e) => {
    const value = parseFloat(e.target.value) || 0;
    setTicketPrice(value);
    setValue('ticketPrice', value);
  }}
  onWheel={(e) => e.currentTarget.blur()} // 👈 stops scroll changing value
  min={1}
  placeholder="Enter price per ticket"
  className="bg-transparent border-none p-2 text-white placeholder:text-white/50 focus:ring-0 shadow-none text-lg flex-1"
/>

                          </div>
                          {payoutDetails && (
                            <div className="text-xs text-white/60 space-y-1">
                              <p>✓ Payout method: {payoutDetails.payoutMethod === 'upi' ? 'UPI' : 'Bank Account'}</p>
                              {payoutDetails.payoutMethod === 'upi' && payoutDetails.upiId && (
                                <p>✓ UPI ID: {payoutDetails.upiId}</p>
                              )}
                              {payoutDetails.payoutMethod === 'bank' && payoutDetails.accountNumber && (
                                <p>✓ Account ending in: ****{payoutDetails.accountNumber.slice(-4)}</p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Privacy Toggle */}
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setValue('isPrivate', false)}
                        className={`p-4 rounded-xl border text-left transition ${
                          !watch('isPrivate')
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
                        onClick={() => setValue('isPrivate', true)}
                        className={`p-4 rounded-xl border text-left transition ${
                          watch('isPrivate')
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
                          value={watch('groupId')?.toString() || 'none'}
                          onValueChange={(value) => setValue('groupId', value !== 'none' ? parseInt(value) : undefined)}
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
                        {watch('groupId') && (
                          <p className="text-xs text-white/60">This event will appear in the selected community's events list</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Description Box */}
                  <div className="rounded-xl sm:rounded-2xl border border-white/15 bg-white/5 backdrop-blur-xl p-4 sm:p-8 shadow-xl">
                    <Textarea
                      {...register('description')}
                      placeholder="Tell people more about your event..."
                      className="bg-transparent border-none p-2 text-white placeholder:text-white/50 focus:ring-0 shadow-none text-base sm:text-lg min-h-[100px] sm:min-h-[120px] resize-none"
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

                {/* Middle Column - Poster & Theme (Desktop Only) */}
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
                          {selectedPoster ? `${selectedPoster.title} selected` : 'Click to select poster'}
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
          eventData={{
            maxGuests: watch('maxGuests'),
            isPublic: !watch('isPrivate'),
            rsvpMode: rsvpMode,
            showGuestCount: showGuestCount,
          }}
          onUpdate={(data) => {
            
            // Update form values with management settings
            if (data.maxGuests) setValue('maxGuests', data.maxGuests);
            if (data.isPublic !== undefined) setValue('isPrivate', !data.isPublic);
            if (data.rsvpMode) {
              setRsvpMode(data.rsvpMode);
            }
            if (data.showGuestCount !== undefined) {
              setShowGuestCount(data.showGuestCount);
            }
          }}
        />

        <PayoutDetailsModal
          isOpen={showPayoutModal}
          onClose={() => {
            // If user closes without saving any payout details, revert enable.
            // Use ref because modal calls onSave then onClose synchronously.
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
              description: "You can now set the ticket price for your event."
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
  );
}
