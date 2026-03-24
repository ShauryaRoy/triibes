import { useState, useEffect } from "react";
import { X, Users, Settings, Lock, CheckCircle, XCircle, Eye, EyeOff, Bell, Shield, Sparkles, Globe, Loader2, UserPlus, FileText, PlusCircle, Trash2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

interface ManageEventPopupProps {
  isOpen: boolean;
  onClose: () => void;
  embedded?: boolean;
  eventId?: number;
  eventSlug?: string; // Add slug for proper query invalidation
  // When true, hides/disables fields that must not change after creation
  // (e.g. public/private, payments, price, currency, community).
  lockImmutableFields?: boolean;
  eventData?: {
    maxGuests?: number;
    isPublic?: boolean;
    isClosed?: boolean;
    rsvpEnabled?: boolean;
    requireApproval?: boolean;
    allowPlusOnes?: boolean;
    maxPlusOnes?: number;
    ticketingEnabled?: boolean;
    ticketPrice?: number;
    costSplitEnabled?: boolean;
    contributionLink?: string;
    guestListVisibility?: 'host-only' | 'attendees-only' | 'everyone';
    rsvpMode?: 'rsvp' | 'register';
    showGuestCount?: boolean;
    entryMode?: 'open' | 'approval' | 'invite_only';
    formSchema?: Array<{
      id: string;
      label: string;
      type: 'text' | 'textarea' | 'select';
      required?: boolean;
      options?: string[];
    }> | null;
  };
  onUpdate?: (data: any) => void;
}

type TabType = 'rsvp' | 'guests' | 'privacy' | 'discover' | 'settings' | 'applications';
type EntryMode = 'open' | 'approval' | 'invite_only';
type FormQuestion = {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'select';
  required?: boolean;
  options?: string[];
};

function DiscoverTabContent({ eventId }: { eventId?: number }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [requestMessage, setRequestMessage] = useState('');

  // If no eventId or invalid eventId, show message
  if (!eventId || eventId === 0 || isNaN(eventId)) {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-pink-400" />
            Discover Page Visibility
          </h3>
          <p className="text-sm text-white/60 mb-6">
            Request to feature this event on the public discover page.
          </p>
        </div>
        <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-yellow-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-white">Create Event First</p>
              <p className="text-xs text-white/60 mt-1">
                You need to create the event before requesting discover page access.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Query to fetch current discover status
  const { data: eventDetails, isLoading } = useQuery<{
    discoverStatus?: string;
    discoverRequestedAt?: string;
    discoverReviewedAt?: string;
    discoverReviewNote?: string;
  }>({
    queryKey: [`/api/events/${eventId}`],
    enabled: !!eventId,
  });

  const discoverStatus = eventDetails?.discoverStatus || 'none';

  // Mutation to request discover access
  const requestDiscoverMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/events/${eventId}/request-discover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message: requestMessage }),
      });
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to request discover access');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}`] });
      toast({
        title: "Request Submitted",
        description: "Your discover page request has been submitted for review.",
      });
      setRequestMessage('');
    },
    onError: (error: Error) => {
      toast({
        title: "Request Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = () => {
    switch (discoverStatus) {
      case 'none':
        return <span className="px-2 py-1 rounded-full bg-gray-500/20 text-gray-400 text-xs font-medium">Not Requested</span>;
      case 'requested':
        return <span className="px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-medium">Pending Review</span>;
      case 'approved':
        return <span className="px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-medium">Approved</span>;
      case 'rejected':
        return <span className="px-2 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-medium">Rejected</span>;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 text-pink-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-pink-400" />
          Discover Page Visibility
        </h3>
        <p className="text-sm text-white/60 mb-6">
          Request to feature this event on the public discover page.
        </p>
      </div>

      <div className="p-4 rounded-xl bg-white/5 border border-white/10">
        <div className="flex items-center justify-between mb-2">
          <Label className="text-white font-medium">Current Status</Label>
          {getStatusBadge()}
        </div>
        <p className="text-xs text-white/50">
          {discoverStatus === 'none' && 'This event is not visible on the discover page.'}
          {discoverStatus === 'requested' && 'Your request is pending admin review.'}
          {discoverStatus === 'approved' && 'This event is visible on the discover page!'}
          {discoverStatus === 'rejected' && 'Your request was not approved.'}
        </p>
      </div>

      {discoverStatus === 'none' && (
        <div className="space-y-4">
          <div>
            <Label className="text-white mb-2 block">Request Message (Optional)</Label>
            <Textarea
              placeholder="Tell us why this event should be featured on the discover page..."
              value={requestMessage}
              onChange={(e) => setRequestMessage(e.target.value)}
              rows={4}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
            />
            <p className="text-xs text-white/50 mt-2">
              Provide context to help admins review your request.
            </p>
          </div>
          <Button
            onClick={() => requestDiscoverMutation.mutate()}
            disabled={requestDiscoverMutation.isPending}
            className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
          >
            {requestDiscoverMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Request Discover Access
              </>
            )}
          </Button>
        </div>
      )}

      {discoverStatus === 'requested' && (
        <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
          <div className="flex items-start gap-3">
            <Loader2 className="h-5 w-5 text-yellow-400 shrink-0 mt-0.5 animate-spin" />
            <div>
              <p className="text-sm font-medium text-white">Request Pending</p>
              <p className="text-xs text-white/60 mt-1">
                Your request is under review. You'll be notified when an admin makes a decision.
              </p>
              {eventDetails?.discoverRequestedAt && (
                <p className="text-xs text-white/40 mt-2">
                  Requested on {new Date(eventDetails.discoverRequestedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {discoverStatus === 'approved' && (
        <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-white">Event Featured!</p>
              <p className="text-xs text-white/60 mt-1">
                This event is now visible on the discover page. Anyone can find and join it.
              </p>
              {eventDetails?.discoverReviewedAt && (
                <p className="text-xs text-white/40 mt-2">
                  Approved on {new Date(eventDetails.discoverReviewedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {discoverStatus === 'rejected' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
            <div className="flex items-start gap-3">
              <XCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-white">Request Declined</p>
                <p className="text-xs text-white/60 mt-1">
                  Your request to feature this event was not approved.
                </p>
                {eventDetails?.discoverReviewNote && (
                  <p className="text-xs text-white/70 mt-2 italic">
                    "{eventDetails.discoverReviewNote}"
                  </p>
                )}
                {eventDetails?.discoverReviewedAt && (
                  <p className="text-xs text-white/40 mt-2">
                    Reviewed on {new Date(eventDetails.discoverReviewedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          </div>
          <Button
            onClick={() => requestDiscoverMutation.mutate()}
            disabled={requestDiscoverMutation.isPending}
            variant="outline"
            className="w-full border-pink-500/30 text-pink-400 hover:bg-pink-500/10"
          >
            Request Again
          </Button>
        </div>
      )}

      <div className="p-4 rounded-xl bg-pink-500/10 border border-pink-500/20">
        <div className="flex items-start gap-3">
          <Globe className="h-5 w-5 text-pink-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-white">About Discover Page</p>
            <p className="text-xs text-white/60 mt-1">
              The discover page showcases curated public events. Requests are reviewed by admins to ensure quality and relevance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ManageEventPopup({ isOpen, onClose, embedded = false, eventId, eventSlug, eventData, onUpdate, lockImmutableFields }: ManageEventPopupProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('rsvp');
  
  // State for different sections
  const [guestSettings, setGuestSettings] = useState({
    allowPlusOnes: eventData?.allowPlusOnes ?? true,
    maxPlusOnes: eventData?.maxPlusOnes ?? 1,
    rsvpMode: eventData?.rsvpMode ?? 'register',
  });

  const [privacySettings, setPrivacySettings] = useState({
    isPublic: eventData?.isPublic ?? true,
    guestListVisibility: (eventData as any)?.guestListVisibility ?? 'everyone',
    showGuestCount: eventData?.showGuestCount ?? true,
  });

  const [eventSettings, setEventSettings] = useState({
    isClosed: eventData?.isClosed ?? false,
  });

  const [approvalSettings, setApprovalSettings] = useState<{
    entryMode: EntryMode;
    formSchema: FormQuestion[];
  }>({
    entryMode: eventData?.entryMode ?? 'open',
    formSchema: eventData?.formSchema ?? [],
  });

  const [expandedApplicationId, setExpandedApplicationId] = useState<number | null>(null);

  const { data: applications = [] } = useQuery<any[]>({
    queryKey: [`/api/events/${eventId}/applications`],
    enabled: !!eventId && approvalSettings.entryMode === 'approval',
    queryFn: async () => {
      const response = await fetch(`/api/events/${eventId}/applications`, { credentials: 'include' });
      if (!response.ok) {
        throw new Error('Failed to fetch applications');
      }
      return response.json();
    },
  });

  const applicationReviewMutation = useMutation({
    mutationFn: async ({ applicationId, action }: { applicationId: number; action: 'approve' | 'reject' }) => {
      const response = await fetch(`/api/events/${eventId}/applications/${applicationId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error?.message || 'Failed to update application');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/applications`] });
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}`] });
    },
    onError: (error: any) => {
      toast({
        title: 'Application update failed',
        description: error?.message || 'Please try again.',
        variant: 'destructive',
      });
    },
  });

  const isApplicationFormLocked = applications.length > 0;

  // Sync state with eventData when it changes (e.g., after fetching from server)
  useEffect(() => {
    if (eventData) {
      setGuestSettings({
        allowPlusOnes: eventData.allowPlusOnes ?? true,
        maxPlusOnes: eventData.maxPlusOnes ?? 1,
        rsvpMode: eventData.rsvpMode ?? 'register',
      });
      setPrivacySettings({
        isPublic: eventData.isPublic ?? true,
        guestListVisibility: eventData.guestListVisibility ?? 'everyone',
        showGuestCount: eventData.showGuestCount ?? true,
      });
      setEventSettings({
        isClosed: eventData.isClosed ?? false,
      });
      setApprovalSettings({
        entryMode: eventData.entryMode ?? 'open',
        formSchema: eventData.formSchema ?? [],
      });
    }
  }, [eventData?.rsvpMode, eventData?.isPublic, eventData?.guestListVisibility, eventData?.isClosed, eventData?.showGuestCount, eventData?.entryMode, eventData?.formSchema]);

  if (!embedded && !isOpen) return null;

  // Check if we have a valid eventId for discover tab
  const hasValidEventId = eventId && eventId !== 0 && !isNaN(eventId);

  const tabs = [
    { id: 'rsvp' as TabType, label: 'RSVP', icon: UserPlus, color: 'text-cyan-400' },
    { id: 'privacy' as TabType, label: 'Privacy', icon: Lock, color: 'text-purple-400' },
    { id: 'settings' as TabType, label: 'Setting', icon: Settings, color: 'text-emerald-400' },
    ...(hasValidEventId ? [{ id: 'discover' as TabType, label: 'Discover Page', icon: Sparkles, color: 'text-pink-400' }] : []),
    ...(hasValidEventId && approvalSettings.entryMode === 'approval' ? [{ id: 'applications' as TabType, label: 'Applications', icon: FileText, color: 'text-amber-300' }] : []),
  ];

  const addQuestion = () => {
    setApprovalSettings((prev) => ({
      ...prev,
      formSchema: [
        ...prev.formSchema,
        {
          id: `q${Date.now()}`,
          label: 'New question',
          type: 'text',
          required: false,
        },
      ],
    }));
  };

  const updateQuestion = (id: string, patch: Partial<FormQuestion>) => {
    setApprovalSettings((prev) => ({
      ...prev,
      formSchema: prev.formSchema.map((q) => (q.id === id ? { ...q, ...patch } : q)),
    }));
  };

  const deleteQuestion = (id: string) => {
    setApprovalSettings((prev) => ({
      ...prev,
      formSchema: prev.formSchema.filter((q) => q.id !== id),
    }));
  };

  const handleSave = async () => {
    const updatedData = {
      ...guestSettings,
      ...privacySettings,
      ...eventSettings,
      ...approvalSettings,
    };

    // If we have an eventId, save settings to the database
    if (eventId && eventId !== 0 && !isNaN(eventId)) {
      try {
        const response = await fetch(`/api/events/${eventId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            guestListVisibility: privacySettings.guestListVisibility,
            rsvpMode: guestSettings.rsvpMode,
            isClosed: eventSettings.isClosed,
            showGuestCount: privacySettings.showGuestCount,
            entryMode: approvalSettings.entryMode,
            formSchema: approvalSettings.entryMode === 'approval' ? approvalSettings.formSchema : [],
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to update event settings');
        }

        // Invalidate event queries to refresh the data (both by ID and slug)
        queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}`] });
        if (eventSlug) {
          queryClient.invalidateQueries({ queryKey: [`/api/events/${eventSlug}`] });
        }
        
        toast({
          title: "Settings saved",
          description: "Your event management settings have been updated.",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to save settings. Please try again.",
          variant: "destructive",
        });
        return;
      }
    }

    // Call onUpdate callback for local state management
    if (onUpdate && (!eventId || eventId === 0 || isNaN(eventId))) {
      onUpdate(updatedData);
    }

    // Show success message if not already shown
    if (!eventId || eventId === 0 || isNaN(eventId)) {
      toast({
        title: "Settings updated",
        description: "Your event management settings have been saved.",
      });
    }
  };





  const renderTabContent = () => {
    switch (activeTab) {
      case 'rsvp':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-cyan-400" />
                RSVP Settings
              </h3>
              <p className="text-sm text-white/60 mb-6">
                Choose how guests respond to your event.
              </p>
            </div>

            {/* RSVP Mode Toggle */}
            <div className="space-y-2 p-4 rounded-xl bg-white/5 border border-white/10">
              <Label className="text-white font-medium flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-cyan-400" />
                Response Mode
              </Label>
              <p className="text-xs text-white/50 mb-3">Choose how guests can respond to your event</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setGuestSettings({ ...guestSettings, rsvpMode: 'rsvp' });
                  }}
                  className={`p-4 rounded-xl border text-left transition ${
                    guestSettings.rsvpMode === 'rsvp'
                      ? 'border-cyan-400/60 bg-cyan-400/10 text-white'
                      : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-2 text-sm font-medium mb-1">
                    <CheckCircle className="h-4 w-4" />
                    RSVP Mode
                  </div>
                  <p className="text-xs text-white/60">Going / Maybe / Can't Go</p>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setGuestSettings({ ...guestSettings, rsvpMode: 'register' });
                  }}
                  className={`p-4 rounded-xl border text-left transition ${
                    guestSettings.rsvpMode === 'register'
                      ? 'border-green-400/60 bg-green-400/10 text-white'
                      : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-2 text-sm font-medium mb-1">
                    <UserPlus className="h-4 w-4" />
                    Register Mode
                  </div>
                  <p className="text-xs text-white/60">Single Register button</p>
                </button>
              </div>
            </div>

            <div className="space-y-2 p-4 rounded-xl bg-white/5 border border-white/10">
              <Label className="text-white font-medium flex items-center gap-2">
                <FileText className="h-4 w-4 text-amber-300" />
                Entry Mode
              </Label>
              <Select
                value={approvalSettings.entryMode}
                onValueChange={(value: EntryMode) =>
                  setApprovalSettings((prev) => ({ ...prev, entryMode: value }))
                }
              >
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue placeholder="Select entry mode" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-white/20">
                  <SelectItem value="open" className="text-white hover:bg-white/10">Open</SelectItem>
                  <SelectItem value="approval" className="text-white hover:bg-white/10">Approval Based</SelectItem>
                  <SelectItem value="invite_only" className="text-white hover:bg-white/10">Invite Only</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-white/60">
                Open allows direct join, approval requires application review, invite only allows join via invite code.
              </p>
            </div>

            {approvalSettings.entryMode === 'approval' && (
              <div className="space-y-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-white font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4 text-amber-300" />
                    Application Form Builder
                  </Label>
                  <Button type="button" size="sm" onClick={addQuestion} disabled={isApplicationFormLocked} className="bg-amber-500 hover:bg-amber-600 text-black disabled:opacity-60">
                    <PlusCircle className="h-4 w-4 mr-1" /> Add Question
                  </Button>
                </div>

                {isApplicationFormLocked && (
                  <div className="rounded-md border border-amber-400/30 bg-amber-500/10 p-2">
                    <p className="text-xs text-amber-200">
                      Form is locked because at least one user has already applied.
                    </p>
                  </div>
                )}

                {approvalSettings.formSchema.length === 0 && (
                  <p className="text-xs text-white/70">No questions yet. Add your first question.</p>
                )}

                <div className="space-y-3">
                  {approvalSettings.formSchema.map((question) => (
                    <div key={question.id} className="rounded-lg border border-white/20 bg-white/5 p-3 space-y-3">
                      <div className="flex items-center gap-2">
                        <Input
                          value={question.label}
                          onChange={(e) => updateQuestion(question.id, { label: e.target.value })}
                          disabled={isApplicationFormLocked}
                          className="bg-white/10 border-white/20 text-white"
                          placeholder="Question label"
                        />
                        <Button type="button" size="icon" variant="outline" onClick={() => deleteQuestion(question.id)} disabled={isApplicationFormLocked} className="border-red-400/50 text-red-300 hover:bg-red-500/20 disabled:opacity-60">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <Select
                          value={question.type}
                          onValueChange={(value: 'text' | 'textarea' | 'select') => {
                            if (isApplicationFormLocked) return;
                            updateQuestion(question.id, { type: value, options: value === 'select' ? (question.options || ['']) : undefined });
                          }}
                        >
                          <SelectTrigger className="bg-white/10 border-white/20 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-900 border-white/20">
                            <SelectItem value="text" className="text-white hover:bg-white/10">Text</SelectItem>
                            <SelectItem value="textarea" className="text-white hover:bg-white/10">Textarea</SelectItem>
                            <SelectItem value="select" className="text-white hover:bg-white/10">Select</SelectItem>
                          </SelectContent>
                        </Select>

                        <label className="flex items-center justify-between rounded-md border border-white/20 px-3 py-2 text-sm text-white">
                          Required
                          <Switch
                            checked={Boolean(question.required)}
                            disabled={isApplicationFormLocked}
                            onCheckedChange={(checked) => updateQuestion(question.id, { required: checked })}
                          />
                        </label>
                      </div>

                      {question.type === 'select' && (
                        <div className="space-y-2">
                          {((question.options && question.options.length > 0) ? question.options : ['']).map((option, optionIndex) => (
                            <div key={`${question.id}-option-${optionIndex}`} className="flex items-center gap-2">
                              <Input
                                value={option}
                                onChange={(e) => {
                                  const nextOptions = [...((question.options && question.options.length > 0) ? question.options : [''])];
                                  nextOptions[optionIndex] = e.target.value;
                                  updateQuestion(question.id, { options: nextOptions });
                                }}
                                disabled={isApplicationFormLocked}
                                className="bg-white/10 border-white/20 text-white"
                                placeholder={`Option ${optionIndex + 1}`}
                              />
                              <Button
                                type="button"
                                size="icon"
                                variant="outline"
                                disabled={isApplicationFormLocked || (((question.options && question.options.length > 0) ? question.options : ['']).length <= 1)}
                                onClick={() => {
                                  const nextOptions = [...((question.options && question.options.length > 0) ? question.options : [''])];
                                  nextOptions.splice(optionIndex, 1);
                                  updateQuestion(question.id, { options: nextOptions.length > 0 ? nextOptions : [''] });
                                }}
                                className="border-red-400/40 text-red-300 hover:bg-red-500/20 disabled:opacity-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}

                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={isApplicationFormLocked}
                            onClick={() => {
                              const nextOptions = [...((question.options && question.options.length > 0) ? question.options : [''])];
                              nextOptions.push('');
                              updateQuestion(question.id, { options: nextOptions });
                            }}
                            className="border-white/20 text-white hover:bg-white/10"
                          >
                            <PlusCircle className="h-4 w-4 mr-1" />
                            Add Option
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
              <div className="flex items-start gap-3">
                {guestSettings.rsvpMode === 'rsvp' ? (
                  <CheckCircle className="h-5 w-5 text-cyan-400 shrink-0 mt-0.5" />
                ) : (
                  <UserPlus className="h-5 w-5 text-green-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="text-sm font-medium text-white">
                    {guestSettings.rsvpMode === 'rsvp' ? 'RSVP Mode Active' : 'Register Mode Active'}
                  </p>
                  <p className="text-xs text-white/60 mt-1">
                    {guestSettings.rsvpMode === 'rsvp'
                      ? 'Guests can choose Going, Maybe, or Can\'t Go. All responses will be shown in the guest list.'
                      : 'Guests can only register to attend. The guest list will only show registered attendees.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'settings':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Settings className="h-5 w-5 text-emerald-400" />
                Setting
              </h3>
              <p className="text-sm text-white/60 mb-6">
                Manually control whether new people can join this event.
              </p>
            </div>

            {!hasValidEventId ? (
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <p className="text-sm text-white/70">
                  Settings are available after the event is created.
                </p>
              </div>
            ) : (
              <div className="space-y-3 p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <Label className="text-white font-medium">Close event</Label>
                    <p className="text-xs text-white/50 mt-1">
                      When enabled, no one can join. Attempts to register will show “Event is closed by the host”.
                    </p>
                  </div>
                  <Switch
                    checked={eventSettings.isClosed}
                    onCheckedChange={(checked) => setEventSettings({ isClosed: checked })}
                    className="data-[state=checked]:bg-emerald-500"
                  />
                </div>
              </div>
            )}
          </div>
        );

      case 'privacy':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Lock className="h-5 w-5 text-purple-400" />
                Privacy Settings
              </h3>
              <p className="text-sm text-white/60 mb-6">
                Control guest list visibility and guest count display.
              </p>
            </div>

            {/* Guest List Visibility */}
            <div className="space-y-2 p-4 rounded-xl bg-white/5 border border-white/10">
              <Label className="text-white font-medium flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-400" />
                Who can see the guest list?
              </Label>
              <p className="text-xs text-white/50 mb-3">Choose who can view the list of attendees</p>
              <Select
                value={privacySettings.guestListVisibility}
                onValueChange={(value: 'host-only' | 'attendees-only' | 'everyone') =>
                  setPrivacySettings((prev) => ({ ...prev, guestListVisibility: value }))
                }
              >
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue placeholder="Select visibility" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-white/20">
                  <SelectItem value="host-only" className="text-white hover:bg-white/10">Host Only</SelectItem>
                  <SelectItem value="attendees-only" className="text-white hover:bg-white/10">Attendees Only</SelectItem>
                  <SelectItem value="everyone" className="text-white hover:bg-white/10">Everyone</SelectItem>
                </SelectContent>
              </Select>

              <p className="text-xs text-white/60 mt-2">
                {privacySettings.guestListVisibility === 'host-only'
                  ? 'Only you can see the guest list.'
                  : privacySettings.guestListVisibility === 'attendees-only'
                    ? 'Only people who are going can see the guest list.'
                    : 'Anyone can see who is attending.'}
              </p>
            </div>

            {/* Show Guest Count Toggle */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="flex-1">
                <Label className="text-white font-medium">Show Guest Count</Label>
                <p className="text-xs text-white/50 mt-1">Display total number of attendees</p>
              </div>
              <Switch
                checked={privacySettings.showGuestCount}
                onCheckedChange={(checked) =>
                  setPrivacySettings({ ...privacySettings, showGuestCount: checked })
                }
              />
            </div>

            {/* <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-white">Guest List Setting</p>
                  <p className="text-xs text-white/60 mt-1">  
                    {privacySettings.guestListVisibility === 'host-only'
                      ? 'Only you can see the guest list'
                      : privacySettings.guestListVisibility === 'attendees-only'
                      ? 'Only confirmed guests can see the list'
                      : 'Everyone can see the guest list'}
                  </p>
                </div>
              </div>
            </div> */}
          </div>
        );



      case 'discover':
        return (
          <DiscoverTabContent eventId={eventId} />
        );

      case 'applications':
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                <FileText className="h-5 w-5 text-amber-300" />
                Applications
              </h3>
              <p className="text-sm text-white/60">
                Review pending applications and approve or reject attendees.
              </p>
            </div>

            {applications.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
                No applications yet.
              </div>
            ) : (
              <div className="space-y-3">
                {applications.map((application: any) => {
                  const isExpanded = expandedApplicationId === application.id;
                  return (
                    <div key={application.id} className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
                      <button
                        type="button"
                        className="w-full flex items-center justify-between gap-3 p-4 text-left"
                        onClick={() => setExpandedApplicationId(isExpanded ? null : application.id)}
                      >
                        <div>
                          <p className="text-sm font-medium text-white">
                            {application.user?.firstName || 'User'} {application.user?.lastName || ''}
                          </p>
                          <p className="text-xs text-white/60">Status: {application.status}</p>
                        </div>
                        <ChevronDown className={`h-4 w-4 text-white/70 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </button>

                      {isExpanded && (
                        <div className="px-4 pb-4 space-y-3 border-t border-white/10">
                          <div className="space-y-2 pt-3">
                            {Object.entries(application.responses || {}).length === 0 && (
                              <p className="text-xs text-white/60">No responses submitted.</p>
                            )}
                            {Object.entries(application.responses || {}).map(([key, value]) => {
                              const q = approvalSettings.formSchema.find((item) => item.id === key);
                              return (
                                <div key={key} className="rounded-md bg-black/20 border border-white/10 p-2">
                                  <p className="text-xs text-white/60">{q?.label || key}</p>
                                  <p className="text-sm text-white break-words">{String(value ?? '')}</p>
                                </div>
                              );
                            })}
                          </div>

                          <div className="flex gap-2">
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => applicationReviewMutation.mutate({ applicationId: application.id, action: 'approve' })}
                              disabled={applicationReviewMutation.isPending || application.status === 'approved'}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              Approve
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => applicationReviewMutation.mutate({ applicationId: application.id, action: 'reject' })}
                              disabled={applicationReviewMutation.isPending || application.status === 'rejected'}
                              className="border-red-400/50 text-red-300 hover:bg-red-500/20"
                            >
                              Reject
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={embedded ? "relative w-full" : "fixed inset-0 z-50 flex items-center justify-center p-4"}>
      {!embedded && (
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      <div className={`relative w-full border border-white/20 bg-gradient-to-br from-gray-900 via-gray-900 to-black shadow-2xl overflow-hidden ${embedded ? 'rounded-3xl' : 'max-w-4xl max-h-[85vh] rounded-2xl'}`}>
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-white/10 bg-gray-900/95 backdrop-blur-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <Settings className="h-6 w-6 text-cyan-400" />
                Manage Event
              </h2>
              <p className="text-sm text-white/60 mt-1">
                Control all aspects of your event from one place
              </p>
            </div>
            {!embedded && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-white/70 hover:text-white hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </Button>
            )}
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2 mt-6 overflow-x-auto pb-2 scrollbar-hide">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-white/15 text-white shadow-lg'
                      : 'text-white/60 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${activeTab === tab.id ? tab.color : ''}`} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <ScrollArea className={embedded ? "h-[calc(100vh-360px)] min-h-[420px]" : "h-[calc(85vh-240px)]"}>
          <div className="p-6">
            {renderTabContent()}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="sticky bottom-0 border-t border-white/10 bg-gray-900/95 backdrop-blur-xl p-6">
          <div className="flex gap-3">
            {!embedded && (
              <Button
                variant="outline"
                onClick={onClose}
                className="flex-1 border-white/20 text-white hover:bg-white/10"
              >
                Cancel
              </Button>
            )}
            <Button
              onClick={() => {
                handleSave();
                if (!embedded) {
                  onClose();
                }
              }}
              className={`${embedded ? 'w-full' : 'flex-1'} bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 text-white shadow-lg hover:brightness-110`}
            >
              <Shield className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
