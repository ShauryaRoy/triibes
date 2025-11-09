import { useState } from "react";
import { X, Users, Settings, Lock, DollarSign, MessageSquare, UserPlus, CheckCircle, XCircle, Eye, EyeOff, CreditCard, Bell, Shield, Crown, Sparkles, Globe, Loader2 } from "lucide-react";
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
  eventId?: number;
  eventData?: {
    maxGuests?: number;
    isPublic?: boolean;
    rsvpEnabled?: boolean;
    requireApproval?: boolean;
    allowPlusOnes?: boolean;
    maxPlusOnes?: number;
    showGuestList?: boolean;
    showGuestCount?: boolean;
    ticketingEnabled?: boolean;
    ticketPrice?: number;
    costSplitEnabled?: boolean;
    contributionLink?: string;
  };
  onUpdate?: (data: any) => void;
}

type TabType = 'guests' | 'rsvp' | 'privacy' | 'cohosts' | 'payments' | 'communication' | 'discover';

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

export function ManageEventPopup({ isOpen, onClose, eventId, eventData, onUpdate }: ManageEventPopupProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('guests');
  
  // State for different sections
  const [guestSettings, setGuestSettings] = useState({
    requireApproval: eventData?.requireApproval ?? false,
    allowPlusOnes: eventData?.allowPlusOnes ?? true,
    maxPlusOnes: eventData?.maxPlusOnes ?? 1,
  });

  const [rsvpSettings, setRsvpSettings] = useState({
    rsvpEnabled: eventData?.rsvpEnabled ?? true,
    maxGuests: eventData?.maxGuests ?? 50,
    requireApproval: eventData?.requireApproval ?? false,
  });

  const [privacySettings, setPrivacySettings] = useState({
    isPublic: eventData?.isPublic ?? true,
    showGuestList: eventData?.showGuestList ?? true,
    showGuestCount: eventData?.showGuestCount ?? true,
  });

  const [paymentSettings, setPaymentSettings] = useState({
    ticketingEnabled: eventData?.ticketingEnabled ?? false,
    ticketPrice: eventData?.ticketPrice ?? 0,
    costSplitEnabled: eventData?.costSplitEnabled ?? false,
    contributionLink: eventData?.contributionLink ?? '',
  });

  const [messageContent, setMessageContent] = useState('');
  const [coHostEmail, setCoHostEmail] = useState('');

  if (!isOpen) return null;

  // Check if we have a valid eventId for discover tab
  const hasValidEventId = eventId && eventId !== 0 && !isNaN(eventId);

  const tabs = [
    { id: 'guests' as TabType, label: 'Guest List', icon: Users, color: 'text-blue-400' },
    { id: 'rsvp' as TabType, label: 'RSVP', icon: CheckCircle, color: 'text-green-400' },
    { id: 'privacy' as TabType, label: 'Privacy', icon: Lock, color: 'text-purple-400' },
    ...(hasValidEventId ? [{ id: 'discover' as TabType, label: 'Discover Page', icon: Sparkles, color: 'text-pink-400' }] : []),
    { id: 'cohosts' as TabType, label: 'Co-Hosts', icon: Crown, color: 'text-yellow-400' },
    { id: 'payments' as TabType, label: 'Payments', icon: DollarSign, color: 'text-emerald-400' },
    { id: 'communication' as TabType, label: 'Messages', icon: MessageSquare, color: 'text-cyan-400' },
  ];

  const handleSave = () => {
    const updatedData = {
      ...guestSettings,
      ...rsvpSettings,
      ...privacySettings,
      ...paymentSettings,
    };

    if (onUpdate) {
      onUpdate(updatedData);
    }

    toast({
      title: "Settings updated",
      description: "Your event management settings have been saved.",
    });
  };

  const handleSendMessage = () => {
    if (!messageContent.trim()) {
      toast({
        title: "Message required",
        description: "Please enter a message to send to guests.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Message sent",
      description: `Your message has been sent to all ${rsvpSettings.maxGuests} guests.`,
    });
    setMessageContent('');
  };

  const handleAddCoHost = () => {
    if (!coHostEmail.trim()) {
      toast({
        title: "Email required",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Co-host invited",
      description: `Invitation sent to ${coHostEmail}`,
    });
    setCoHostEmail('');
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'guests':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-400" />
                Guest List Control
              </h3>
              <p className="text-sm text-white/60 mb-6">
                Manage who can attend and view guest information.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex-1">
                  <Label className="text-white font-medium flex items-center gap-2">
                    <Shield className="h-4 w-4 text-blue-400" />
                    Require Approval
                  </Label>
                  <p className="text-xs text-white/50 mt-1">Manually approve each guest before they can attend</p>
                </div>
                <Switch
                  checked={guestSettings.requireApproval}
                  onCheckedChange={(checked) =>
                    setGuestSettings({ ...guestSettings, requireApproval: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex-1">
                  <Label className="text-white font-medium flex items-center gap-2">
                    <UserPlus className="h-4 w-4 text-blue-400" />
                    Allow +1s
                  </Label>
                  <p className="text-xs text-white/50 mt-1">Let guests bring additional people</p>
                </div>
                <Switch
                  checked={guestSettings.allowPlusOnes}
                  onCheckedChange={(checked) =>
                    setGuestSettings({ ...guestSettings, allowPlusOnes: checked })
                  }
                />
              </div>

              {guestSettings.allowPlusOnes && (
                <div className="ml-6 space-y-2 p-4 rounded-xl bg-white/5 border border-white/10">
                  <Label className="text-white/80 text-sm">Max +1s per guest</Label>
                  <Input
                    type="number"
                    min={1}
                    max={5}
                    value={guestSettings.maxPlusOnes}
                    onChange={(e) =>
                      setGuestSettings({ ...guestSettings, maxPlusOnes: parseInt(e.target.value) || 1 })
                    }
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>
              )}
            </div>

            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-white">Current Guest Status</p>
                  <p className="text-xs text-white/60 mt-1">
                    {rsvpSettings.maxGuests} max guests • {guestSettings.requireApproval ? 'Approval required' : 'Open RSVP'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'rsvp':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-400" />
                RSVP Settings
              </h3>
              <p className="text-sm text-white/60 mb-6">
                Control how guests can RSVP to your event.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex-1">
                  <Label className="text-white font-medium">Enable RSVP</Label>
                  <p className="text-xs text-white/50 mt-1">Allow guests to RSVP to this event</p>
                </div>
                <Switch
                  checked={rsvpSettings.rsvpEnabled}
                  onCheckedChange={(checked) =>
                    setRsvpSettings({ ...rsvpSettings, rsvpEnabled: checked })
                  }
                />
              </div>

              {rsvpSettings.rsvpEnabled && (
                <>
                  <div className="space-y-2 p-4 rounded-xl bg-white/5 border border-white/10">
                    <Label className="text-white font-medium">Maximum Capacity</Label>
                    <Input
                      type="number"
                      min={1}
                      max={10000}
                      value={rsvpSettings.maxGuests}
                      onChange={(e) =>
                        setRsvpSettings({ ...rsvpSettings, maxGuests: parseInt(e.target.value) || 50 })
                      }
                      className="bg-white/10 border-white/20 text-white"
                    />
                    <p className="text-xs text-white/50">Maximum number of guests who can RSVP</p>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex-1">
                      <Label className="text-white font-medium">Require Approval</Label>
                      <p className="text-xs text-white/50 mt-1">Manually approve RSVPs before confirming</p>
                    </div>
                    <Switch
                      checked={rsvpSettings.requireApproval}
                      onCheckedChange={(checked) =>
                        setRsvpSettings({ ...rsvpSettings, requireApproval: checked })
                      }
                    />
                  </div>
                </>
              )}
            </div>

            <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-white">RSVP Status</p>
                  <p className="text-xs text-white/60 mt-1">
                    {rsvpSettings.rsvpEnabled ? `Open for ${rsvpSettings.maxGuests} guests` : 'RSVPs disabled'}
                  </p>
                </div>
              </div>
            </div>
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
                Control event visibility and guest information display.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex-1">
                  <Label className="text-white font-medium flex items-center gap-2">
                    {privacySettings.isPublic ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    Public Event
                  </Label>
                  <p className="text-xs text-white/50 mt-1">
                    {privacySettings.isPublic ? 'Anyone can discover this event' : 'Only invited guests can see this'}
                  </p>
                </div>
                <Switch
                  checked={privacySettings.isPublic}
                  onCheckedChange={(checked) =>
                    setPrivacySettings({ ...privacySettings, isPublic: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex-1">
                  <Label className="text-white font-medium">Show Guest List</Label>
                  <p className="text-xs text-white/50 mt-1">Display names of attending guests</p>
                </div>
                <Switch
                  checked={privacySettings.showGuestList}
                  onCheckedChange={(checked) =>
                    setPrivacySettings({ ...privacySettings, showGuestList: checked })
                  }
                />
              </div>

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
            </div>

            <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
              <div className="flex items-start gap-3">
                <Lock className="h-5 w-5 text-purple-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-white">Privacy Level</p>
                  <p className="text-xs text-white/60 mt-1">
                    {privacySettings.isPublic ? 'Public event with' : 'Private event -'} 
                    {privacySettings.showGuestList ? ' guest list visible' : ' guest list hidden'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'discover':
        return (
          <DiscoverTabContent eventId={eventId} />
        );

      case 'cohosts':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Crown className="h-5 w-5 text-yellow-400" />
                Co-Host Management
              </h3>
              <p className="text-sm text-white/60 mb-6">
                Add co-hosts who can help manage this event.
              </p>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <Label className="text-white mb-2 block">Invite Co-Host</Label>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="email@example.com"
                    value={coHostEmail}
                    onChange={(e) => setCoHostEmail(e.target.value)}
                    className="bg-white/10 border-white/20 text-white flex-1"
                  />
                  <Button
                    onClick={handleAddCoHost}
                    className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white hover:brightness-110"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Invite
                  </Button>
                </div>
                <p className="text-xs text-white/50 mt-2">Co-hosts can edit event details and manage guests</p>
              </div>

              <div className="space-y-2">
                <Label className="text-white/80">Current Co-Hosts</Label>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
                  <p className="text-sm text-white/50">No co-hosts added yet</p>
                  <p className="text-xs text-white/40 mt-1">Invite someone to help you manage this event</p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <p className="text-xs text-yellow-200/80 flex items-start gap-2">
                  <Crown className="h-4 w-4 shrink-0 mt-0.5" />
                  Co-hosts have full management permissions including editing, canceling, and managing guests
                </p>
              </div>
            </div>
          </div>
        );

      case 'payments':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-emerald-400" />
                Payment Options
              </h3>
              <p className="text-sm text-white/60 mb-6">
                Enable ticketing, cost splitting, or collect contributions.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex-1">
                  <Label className="text-white font-medium flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-emerald-400" />
                    Enable Ticketing
                  </Label>
                  <p className="text-xs text-white/50 mt-1">Charge guests for tickets to this event</p>
                </div>
                <Switch
                  checked={paymentSettings.ticketingEnabled}
                  onCheckedChange={(checked) =>
                    setPaymentSettings({ ...paymentSettings, ticketingEnabled: checked })
                  }
                />
              </div>

              {paymentSettings.ticketingEnabled && (
                <div className="ml-6 space-y-2 p-4 rounded-xl bg-white/5 border border-white/10">
                  <Label className="text-white/80">Ticket Price</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50">$</span>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={paymentSettings.ticketPrice}
                      onChange={(e) =>
                        setPaymentSettings({ ...paymentSettings, ticketPrice: parseFloat(e.target.value) || 0 })
                      }
                      className="bg-white/10 border-white/20 text-white pl-8"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex-1">
                  <Label className="text-white font-medium">Enable Cost Split</Label>
                  <p className="text-xs text-white/50 mt-1">Allow guests to split event costs</p>
                </div>
                <Switch
                  checked={paymentSettings.costSplitEnabled}
                  onCheckedChange={(checked) =>
                    setPaymentSettings({ ...paymentSettings, costSplitEnabled: checked })
                  }
                />
              </div>

              <div className="space-y-2 p-4 rounded-xl bg-white/5 border border-white/10">
                <Label className="text-white">Contribution Link (Optional)</Label>
                <Input
                  type="url"
                  placeholder="https://venmo.com/your-handle"
                  value={paymentSettings.contributionLink}
                  onChange={(e) =>
                    setPaymentSettings({ ...paymentSettings, contributionLink: e.target.value })
                  }
                  className="bg-white/10 border-white/20 text-white"
                />
                <p className="text-xs text-white/50">Venmo, PayPal, or any payment link</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <div className="flex items-start gap-3">
                <DollarSign className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-white">Payment Status</p>
                  <p className="text-xs text-white/60 mt-1">
                    {paymentSettings.ticketingEnabled 
                      ? `Ticketing enabled at $${paymentSettings.ticketPrice}` 
                      : 'Free event'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'communication':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-cyan-400" />
                Communication Tools
              </h3>
              <p className="text-sm text-white/60 mb-6">
                Send updates, reminders, or broadcast messages to guests.
              </p>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <Label className="text-white mb-2 block">Message Type</Label>
                <Select defaultValue="update">
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-white/20">
                    <SelectItem value="update" className="text-white hover:bg-white/10">
                      📢 Event Update
                    </SelectItem>
                    <SelectItem value="reminder" className="text-white hover:bg-white/10">
                      ⏰ Reminder
                    </SelectItem>
                    <SelectItem value="announcement" className="text-white hover:bg-white/10">
                      📣 Announcement
                    </SelectItem>
                    <SelectItem value="change" className="text-white hover:bg-white/10">
                      ⚠️ Important Change
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 p-4 rounded-xl bg-white/5 border border-white/10">
                <Label className="text-white">Message Content</Label>
                <Textarea
                  placeholder="Type your message to all guests..."
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50 min-h-[120px]"
                />
                <p className="text-xs text-white/50">This will be sent to all {rsvpSettings.maxGuests} guests</p>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleSendMessage}
                  className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:brightness-110"
                >
                  <Bell className="h-4 w-4 mr-2" />
                  Send to All Guests
                </Button>
              </div>

              <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                <p className="text-xs text-cyan-200/80 flex items-start gap-2">
                  <Bell className="h-4 w-4 shrink-0 mt-0.5" />
                  Messages will be sent via email and push notifications to all confirmed guests
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-white/80">Quick Actions</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10 justify-start"
                >
                  <Bell className="h-4 w-4 mr-2" />
                  Send Reminder
                </Button>
                <Button
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10 justify-start"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Follow Up
                </Button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Popup Container */}
      <div className="relative w-full max-w-4xl max-h-[85vh] rounded-2xl border border-white/20 bg-gradient-to-br from-gray-900 via-gray-900 to-black shadow-2xl overflow-hidden">
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
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white/70 hover:text-white hover:bg-white/10"
            >
              <X className="h-5 w-5" />
            </Button>
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
        <ScrollArea className="h-[calc(85vh-240px)]">
          <div className="p-6">
            {renderTabContent()}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="sticky bottom-0 border-t border-white/10 bg-gray-900/95 backdrop-blur-xl p-6">
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 border-white/20 text-white hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                handleSave();
                onClose();
              }}
              className="flex-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 text-white shadow-lg hover:brightness-110"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
