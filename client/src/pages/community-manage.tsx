import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Users, 
  Calendar, 
  Settings, 
  ArrowLeft, 
  Globe, 
  Lock, 
  Mail, 
  Send, 
  Plus,
  Edit,
  Trash2,
  MapPin,
  Clock,
  UserX,
  Palette,
  Eye,
  Archive,
  Link as LinkIcon,
  Instagram,
  Youtube,
  Linkedin,
  MessageSquare,
  Sparkles,
  CheckCircle,
  XCircle,
  Loader2
} from "lucide-react";
import { Link } from "wouter";
import Header from "@/components/layout/header";
import MobileNav from "@/components/layout/mobile-nav";
import { SimpleBackground } from "@/components/simple-background";
import EventCard from "@/components/event-card";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

function GroupDiscoverTab({ groupId }: { groupId?: number }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [requestMessage, setRequestMessage] = useState('');

  const { data: groupDetails, isLoading } = useQuery<{
    discoverStatus?: string;
    discoverRequestedAt?: string;
    discoverReviewedAt?: string;
    discoverReviewNote?: string;
    isPublic?: boolean;
  }>({
    queryKey: [`/api/groups/${groupId}`],
    enabled: !!groupId,
  });

  const discoverStatus = groupDetails?.discoverStatus || 'none';

  const requestDiscoverMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/groups/${groupId}/request-discover`, {
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
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupId}`] });
      toast({ title: "Request Submitted", description: "Your discover listing request has been submitted for review." });
      setRequestMessage('');
    },
    onError: (error: Error) => {
      toast({ title: "Request Failed", description: error.message, variant: "destructive" });
    },
  });

  const getStatusBadge = () => {
    switch (discoverStatus) {
      case 'none': return <span className="px-2 py-1 rounded-full bg-slate-500/20 text-slate-400 text-xs font-medium">Not Requested</span>;
      case 'requested': return <span className="px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-medium">Pending Review</span>;
      case 'approved': return <span className="px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-medium">Approved</span>;
      case 'rejected': return <span className="px-2 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-medium">Rejected</span>;
      default: return null;
    }
  };

  if (isLoading) {
    return (
      <TabsContent value="discover" className="mt-4 sm:mt-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 text-slate-400 animate-spin" />
        </div>
      </TabsContent>
    );
  }

  return (
    <TabsContent value="discover" className="mt-4 sm:mt-6 space-y-4 sm:space-y-6">
      <div>
        <h3 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2 mb-1">
          <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-400" />
          Discover Page Visibility
        </h3>
        <p className="text-sm text-slate-400">
          Request to feature this group in the public discover section on the groups page.
        </p>
      </div>

      {groupDetails && !groupDetails.isPublic && (
        <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-yellow-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-white">Public Group Required</p>
              <p className="text-xs text-slate-400 mt-1">Only public groups can be listed in discover. Change your group visibility to public in Settings first.</p>
            </div>
          </div>
        </div>
      )}

      {(!groupDetails || groupDetails.isPublic) && (
        <>
          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-white font-medium">Current Status</Label>
              {getStatusBadge()}
            </div>
            <p className="text-xs text-slate-400">
              {discoverStatus === 'none' && 'This group is not visible on the discover page.'}
              {discoverStatus === 'requested' && 'Your request is pending admin review.'}
              {discoverStatus === 'approved' && 'This group is visible on the discover page!'}
              {discoverStatus === 'rejected' && 'Your request was not approved.'}
            </p>
          </div>

          {discoverStatus === 'none' && (
            <div className="space-y-4">
              <div>
                <Label className="text-white mb-2 block text-sm">Request Message (Optional)</Label>
                <Textarea
                  placeholder="Tell us why this group should be featured on the discover page..."
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                  rows={4}
                  className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-400"
                />
                <p className="text-xs text-slate-400 mt-2">Provide context to help admins review your request.</p>
              </div>
              <Button
                onClick={() => requestDiscoverMutation.mutate()}
                disabled={requestDiscoverMutation.isPending}
                className="w-full bg-slate-700 hover:bg-slate-600 text-white"
              >
                {requestDiscoverMutation.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting...</>
                ) : (
                  <><Sparkles className="mr-2 h-4 w-4" />Request Discover Listing</>
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
                  <p className="text-xs text-slate-400 mt-1">Your request is under review. You'll be notified when an admin makes a decision.</p>
                  {groupDetails?.discoverRequestedAt && (
                    <p className="text-xs text-slate-500 mt-2">Requested on {new Date(groupDetails.discoverRequestedAt).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Kolkata' })}</p>
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
                  <p className="text-sm font-medium text-white">Group Featured!</p>
                  <p className="text-xs text-slate-400 mt-1">This group is now visible on the discover page. Anyone can find and join it.</p>
                  {groupDetails?.discoverReviewedAt && (
                    <p className="text-xs text-slate-500 mt-2">Approved on {new Date(groupDetails.discoverReviewedAt).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Kolkata' })}</p>
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
                    <p className="text-xs text-slate-400 mt-1">Your request to feature this group was not approved.</p>
                    {groupDetails?.discoverReviewNote && (
                      <p className="text-xs text-slate-300 mt-2 italic">"{groupDetails.discoverReviewNote}"</p>
                    )}
                    {groupDetails?.discoverReviewedAt && (
                      <p className="text-xs text-slate-500 mt-2">Reviewed on {new Date(groupDetails.discoverReviewedAt).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Kolkata' })}</p>
                    )}
                  </div>
                </div>
              </div>
              <Button
                onClick={() => requestDiscoverMutation.mutate()}
                disabled={requestDiscoverMutation.isPending}
                variant="outline"
                className="w-full border-slate-600 text-slate-200 hover:bg-slate-700"
              >
                Request Again
              </Button>
            </div>
          )}

          <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/30">
            <div className="flex items-start gap-3">
              <Globe className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-white">About the Discover Section</p>
                <p className="text-xs text-slate-400 mt-1">The discover section showcases curated public groups. Requests are reviewed by admins to ensure quality and relevance.</p>
              </div>
            </div>
          </div>
        </>
      )}
    </TabsContent>
  );
}

export default function CommunityManage() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("events");
  const [activeSettingsTab, setActiveSettingsTab] = useState("display");
  const [discoverRequestMessage, setDiscoverRequestMessage] = useState("");
  const [isCreatingNewsletter, setIsCreatingNewsletter] = useState(false);
  const [newsletterForm, setNewsletterForm] = useState({
    subject: "",
    content: ""
  });
  const [communitySettings, setCommunitySettings] = useState({
    name: "",
    description: "",
    themeColor: "#3b82f6",
    socialLinks: {
      instagram: "",
      youtube: "",
      linkedin: "",
      twitter: "",
      website: ""
    },
    options: {
      eventVisibility: "public",
      showGuestList: true,
      collectFeedback: true,
      status: "active"
    }
  });
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [avatarImageUrl, setAvatarImageUrl] = useState<string | null>(null);

  const { data: community, isLoading } = useQuery({
    queryKey: [`/api/groups/${id}`],
    queryFn: async () => {
      const response = await fetch(`/api/groups/${id}`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch group");
      return response.json();
    },
    enabled: !!id,
  });

  // Initialize community settings when community data loads
  useEffect(() => {
    if (community) {
      setCommunitySettings(prev => ({
        ...prev,
        name: community.name || "",
        description: community.description || "",
        // Load existing settings from community data or use defaults
        themeColor: community.settings?.themeColor || "#3b82f6",
        socialLinks: community.settings?.socialLinks || {
          instagram: "",
          youtube: "",
          linkedin: "",
          twitter: "",
          website: ""
        },
        options: community.settings?.options || {
          eventVisibility: "public",
          showGuestList: true,
          collectFeedback: true,
          status: "active"
        }
      }));
      
      // Initialize image URLs
      setCoverImageUrl(community.coverImageUrl || null);
      setAvatarImageUrl(community.imageUrl || null);
    }
  }, [community]);

  const { data: members } = useQuery({
    queryKey: [`/api/groups/${id}/members`],
    queryFn: async () => {
      const response = await fetch(`/api/groups/${id}/members`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch members");
      return response.json();
    },
    enabled: !!id,
  });

  const { data: events } = useQuery({
    queryKey: [`/api/groups/${id}/events`],
    queryFn: async () => {
      const response = await fetch(`/api/groups/${id}/events`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch events");
      return response.json();
    },
    enabled: !!id,
  });

  // Mock newsletter data - in a real app, this would come from an API
  const newsletters = [
    {
      id: 1,
      subject: "Welcome to our Community!",
      content: "Thank you for joining our amazing community...",
      sentAt: "2024-01-15T10:00:00Z",
      recipients: 45
    },
    {
      id: 2,
      subject: "Upcoming Events This Month",
      content: "We have some exciting events coming up...",
      sentAt: "2024-01-10T14:30:00Z",
      recipients: 42
    }
  ];

  const removeMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/groups/${id}/members/${userId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to remove member");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${id}/members`] });
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${id}`] });
      toast({ title: "Member removed", description: "Member has been removed from the community." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMemberRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const response = await fetch(`/api/groups/${id}/members/${userId}/role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ role }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update role");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${id}/members`] });
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${id}`] });
      toast({ title: "Role updated", description: "Member role has been updated successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const sendNewsletterMutation = useMutation({
    mutationFn: async (data: { subject: string; content: string }) => {
      // Mock API call - replace with actual endpoint
      const response = await fetch(`/api/groups/${id}/newsletter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to send newsletter");
      return response.json();
    },
    onSuccess: () => {
      setIsCreatingNewsletter(false);
      setNewsletterForm({ subject: "", content: "" });
      toast({ title: "Newsletter sent!", description: "Your newsletter has been sent to all members." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateCommunityMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/groups/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update community");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${id}`] });
      toast({ title: "Settings saved!", description: "Community settings have been updated." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Image upload handlers
  const handleCoverImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Upload failed');
      }
      
      const data = await res.json();
      setCoverImageUrl(data.url);
      toast({ title: 'Cover uploaded', description: 'Cover image updated successfully.' });
    } catch (error) {
      console.error('Cover upload error:', error);
      toast({ title: 'Upload failed', description: `Could not upload cover image: ${error instanceof Error ? error.message : 'Unknown error'}`, variant: 'destructive' });
    }
  };

  const handleAvatarImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Upload failed');
      }
      
      const data = await res.json();
      setAvatarImageUrl(data.url);
      toast({ title: 'Logo uploaded', description: 'Logo updated successfully.' });
    } catch (error) {
      console.error('Logo upload error:', error);
      toast({ title: 'Upload failed', description: `Could not upload logo: ${error instanceof Error ? error.message : 'Unknown error'}`, variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <SimpleBackground className="min-h-screen">
        <div className="absolute inset-0 bg-black/25" />
        <div className="relative z-10">
          <Header />
          <main className="flex-1 px-4 sm:px-6 lg:px-8 pt-28 pb-16">
            <div className="max-w-7xl mx-auto">
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent mx-auto"></div>
                <p className="text-white/60 text-sm mt-4">Loading community...</p>
              </div>
            </div>
          </main>
        </div>
      </SimpleBackground>
    );
  }

  if (!community) {
    return (
      <SimpleBackground className="min-h-screen">
        <div className="absolute inset-0 bg-black/25" />
        <div className="relative z-10">
          <Header />
          <main className="flex-1 px-4 sm:px-6 lg:px-8 pt-28 pb-16">
            <div className="max-w-7xl mx-auto text-center py-16">
              <h1 className="text-2xl font-bold text-white mb-4">Group not found</h1>
              <Button asChild variant="outline" className="border-white/30 text-white hover:bg-white/20">
                <Link href="/groups">Back to Communities</Link>
              </Button>
            </div>
          </main>
        </div>
      </SimpleBackground>
    );
  }

  // Check if user is owner
  const userMembership = members?.find((m: any) => m.userId === user?.id);
  const isOwner = userMembership?.role === 'owner';

  if (!isOwner) {
    return (
      <SimpleBackground className="min-h-screen">
        <div className="absolute inset-0 bg-black/25" />
        <div className="relative z-10">
          <Header />
          <main className="flex-1 px-4 sm:px-6 lg:px-8 pt-28 pb-16">
            <div className="max-w-7xl mx-auto text-center py-16">
              <h1 className="text-2xl font-bold text-white mb-4">Access Denied</h1>
              <p className="text-white/70 mb-6">Only group owners can access settings.</p>
              <Button asChild variant="outline" className="border-white/30 text-white hover:bg-white/20">
                <Link href={`/groups/${id}`}>Back to Group</Link>
              </Button>
            </div>
          </main>
        </div>
      </SimpleBackground>
    );
  }

  const sortedEvents = events?.sort((a: any, b: any) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime()) || [];

  return (
    <SimpleBackground className="min-h-screen">
      <div className="absolute inset-0 bg-black/10" />
      <div className="relative z-10">
        <Header />
        <main className="flex-1 px-3 sm:px-4 md:px-6 lg:px-8 pt-20 md:pt-24 pb-20 md:pb-16">
          <div className="max-w-7xl mx-auto space-y-5 sm:space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
              <Button asChild variant="ghost" size="sm" className="text-slate-200 hover:bg-slate-800 h-8 sm:h-9 px-2 sm:px-3">
                <Link href={`/groups/${id}`}>
                  <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                  <span className="text-xs sm:text-sm">Back</span>
                </Link>
              </Button>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2 sm:gap-3">
                  <Settings className="h-6 w-6 sm:h-8 sm:w-8" />
                  Manage {community.name}
                </h1>
                <p className="text-slate-300 text-xs sm:text-sm mt-1 flex flex-wrap items-center gap-2">
                  {community.isPublic ? (
                    <><Globe className="h-4 w-4" /> Public Community</>
                  ) : (
                    <><Lock className="h-4 w-4" /> Private Community</>
                  )}
                  <span className="ml-1 sm:ml-2">•</span>
                  <span>{community.memberCount} members</span>
                </p>
              </div>
            </div>

            {/* Management Tabs */}
            <Card className="bg-slate-800/50 border-slate-700/50 shadow-sm overflow-hidden">
              <CardContent className="p-4 sm:p-6">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <div className="w-full overflow-x-auto scrollbar-hide [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    <TabsList className="inline-flex flex-nowrap gap-2 bg-slate-800/70 border border-slate-700/50 rounded-lg p-2 min-w-full w-auto touch-pan-x">
                      <TabsTrigger 
                        value="events" 
                        className="text-slate-200 data-[state=active]:bg-slate-700 data-[state=active]:text-white text-xs sm:text-sm px-3 sm:px-4 py-2 shrink-0 whitespace-nowrap"
                      >
                        <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                        Events Timeline
                      </TabsTrigger>
                      <TabsTrigger 
                        value="members" 
                        className="text-slate-200 data-[state=active]:bg-slate-700 data-[state=active]:text-white text-xs sm:text-sm px-3 sm:px-4 py-2 shrink-0 whitespace-nowrap"
                      >
                        <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                        Members ({members?.length || 0})
                      </TabsTrigger>
                      <TabsTrigger 
                        value="newsletter" 
                        className="text-slate-200 data-[state=active]:bg-slate-700 data-[state=active]:text-white text-xs sm:text-sm px-3 sm:px-4 py-2 shrink-0 whitespace-nowrap"
                      >
                        <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                        Newsletter
                      </TabsTrigger>
                      <TabsTrigger 
                        value="settings" 
                        className="text-slate-200 data-[state=active]:bg-slate-700 data-[state=active]:text-white text-xs sm:text-sm px-3 sm:px-4 py-2 shrink-0 whitespace-nowrap"
                      >
                        <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                        Settings
                      </TabsTrigger>
                      <TabsTrigger 
                        value="discover" 
                        className="text-slate-200 data-[state=active]:bg-slate-700 data-[state=active]:text-white text-xs sm:text-sm px-3 sm:px-4 py-2 shrink-0 whitespace-nowrap"
                      >
                        <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                        Discover
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  {/* Events Timeline Tab */}
                  <TabsContent value="events" className="mt-4 sm:mt-6 space-y-4 sm:space-y-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                      <h3 className="text-base sm:text-lg font-semibold text-white">Events Timeline</h3>
                      <Button asChild className="bg-slate-700 hover:bg-slate-600 text-white h-9 sm:h-10 text-xs sm:text-sm px-3 sm:px-4">
                        <Link href="/create-event">
                          <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                          Create Event
                        </Link>
                      </Button>
                    </div>
                    
                    {sortedEvents.length > 0 ? (
                      <div className="space-y-4">
                        {sortedEvents.map((event: any) => (
                          <Card key={event.id} className="bg-slate-700/30 border-slate-600/30">
                            <CardHeader className="p-4 sm:p-6">
                              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                                <div>
                                  <CardTitle className="text-white text-sm sm:text-base">{event.title}</CardTitle>
                                  <CardDescription className="text-slate-300 text-xs sm:text-sm flex flex-wrap items-center gap-2 sm:gap-4 mt-2">
                                    <span className="flex items-center gap-1">
                                      <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                      {new Date(event.datetime).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Kolkata' })}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                      {new Date(event.datetime).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })}
                                    </span>
                                    {event.location && (
                                      <span className="flex items-center gap-1 truncate">
                                        <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                        <span className="truncate">{event.location}</span>
                                      </span>
                                    )}
                                  </CardDescription>
                                </div>
                                <Badge variant={new Date(event.datetime) > new Date() ? "default" : "secondary"} className="text-[10px] sm:text-xs">
                                  {new Date(event.datetime) > new Date() ? "Upcoming" : "Past"}
                                </Badge>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <p className="text-slate-200 text-xs sm:text-sm mb-3">{event.description}</p>
                              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                                <span className="text-slate-300 text-xs sm:text-sm">
                                  {event.attendees?.length || 0} attendees
                                </span>
                                <div className="flex gap-2">
                                  <Button asChild size="sm" variant="outline" className="border-slate-600 text-slate-200 hover:bg-slate-700 h-8 text-xs sm:text-sm">
                                    <Link href={`/events/${event.slug || event.id}`}>View</Link>
                                  </Button>
                                  <Button size="sm" variant="outline" className="border-slate-600 text-slate-200 hover:bg-slate-700 h-8 w-8 p-0">
                                    <Edit className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-10 sm:py-16">
                        <Calendar className="h-12 w-12 sm:h-16 sm:w-16 text-slate-500 mx-auto mb-3 sm:mb-4" />
                        <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">No events yet</h3>
                        <p className="text-slate-300 text-sm sm:text-base mb-4 sm:mb-6">Create your first community event to get started.</p>
                        <Button asChild className="bg-slate-700 hover:bg-slate-600 text-white h-9 sm:h-10 text-xs sm:text-sm px-3 sm:px-4">
                          <Link href="/create-event">
                            <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                            Create First Event
                          </Link>
                        </Button>
                      </div>
                    )}
                  </TabsContent>

                  {/* Members Tab */}
                  <TabsContent value="members" className="mt-4 sm:mt-6 space-y-4 sm:space-y-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3">
                      <h3 className="text-base sm:text-lg font-semibold text-white">Community Members</h3>
                      <Badge className="bg-slate-700 text-white text-xs sm:text-sm">
                        {members?.length || 0} total members
                      </Badge>
                    </div>
                    
                    {members && members.length > 0 ? (
                      <div className="grid gap-4">
                        {members.map((member: any) => (
                          <Card key={member.id} className="bg-slate-700/30 border-slate-600/30">
                            <CardContent className="p-3 sm:p-4">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                  <Avatar className="h-10 w-10 flex-shrink-0">
                                    <AvatarImage src={member.user?.avatar} />
                                    <AvatarFallback className="bg-slate-600 text-white">
                                      {member.user?.firstName?.[0]}{member.user?.lastName?.[0]}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="min-w-0 flex-1">
                                    <h4 className="text-white font-medium text-sm sm:text-base truncate">
                                      {member.user?.firstName} {member.user?.lastName}
                                    </h4>
                                    <p className="text-slate-300 text-xs sm:text-sm truncate">{member.user?.email}</p>
                                    <p className="text-slate-400 text-xs mt-0.5 sm:hidden">
                                      Joined {new Date(member.joinedAt).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Kolkata' })}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between sm:justify-end gap-2 flex-wrap sm:flex-nowrap">
                                  <div className="flex items-center gap-2">
                                    {member.userId !== user?.id && (
                                      <Select
                                        value={member.role}
                                        onValueChange={(newRole) => updateMemberRoleMutation.mutate({ userId: member.userId, role: newRole })}
                                        disabled={updateMemberRoleMutation.isPending}
                                      >
                                        <SelectTrigger className={`w-28 sm:w-32 text-xs sm:text-sm h-8 sm:h-10 ${
                                          member.role === 'owner' ? 'bg-yellow-600/20 border-yellow-600 text-yellow-300' : 
                                          member.role === 'host' ? 'bg-blue-600/20 border-blue-600 text-blue-300' : 
                                          'bg-slate-600/20 border-slate-600 text-slate-300'
                                        }`}>
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="member">Member</SelectItem>
                                          <SelectItem value="host">Host</SelectItem>
                                          <SelectItem value="owner">Owner</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    )}
                                    {member.userId === user?.id && (
                                      <Badge 
                                        variant={member.role === 'owner' ? "default" : "secondary"}
                                        className={`text-xs sm:text-sm ${member.role === 'owner' ? 'bg-yellow-600' : member.role === 'host' ? 'bg-blue-600' : ''}`}
                                      >
                                        {member.role} (You)
                                      </Badge>
                                    )}
                                  </div>
                                  <span className="text-slate-300 text-xs sm:text-sm hidden sm:inline">
                                    Joined {new Date(member.joinedAt).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Kolkata' })}
                                  </span>
                                  {member.role !== 'owner' && member.userId !== user?.id && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="border-red-400/30 text-red-300 hover:bg-red-400/20 h-8 w-8 p-0 sm:h-9 sm:w-9"
                                      onClick={() => removeMemberMutation.mutate(member.userId)}
                                      disabled={removeMemberMutation.isPending}
                                    >
                                      <UserX className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-10 sm:py-16">
                        <Users className="h-12 w-12 sm:h-16 sm:w-16 text-slate-500 mx-auto mb-3 sm:mb-4" />
                        <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">No members yet</h3>
                        <p className="text-slate-300 text-sm sm:text-base">Members will appear here as they join your community.</p>
                      </div>
                    )}
                  </TabsContent>

                  {/* Newsletter Tab */}
                  <TabsContent value="newsletter" className="mt-4 sm:mt-6 space-y-4 sm:space-y-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                      <h3 className="text-base sm:text-lg font-semibold text-white">Newsletter Management</h3>
                      <Dialog open={isCreatingNewsletter} onOpenChange={setIsCreatingNewsletter}>
                        <DialogTrigger asChild>
                          <Button className="bg-slate-700 hover:bg-slate-600 text-white h-9 sm:h-10 text-xs sm:text-sm px-3 sm:px-4">
                            <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                            Send Newsletter
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-slate-900/95 border-slate-700/50 text-white max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Send Newsletter</DialogTitle>
                            <DialogDescription className="text-slate-300">
                              Send a newsletter to all {community.memberCount} community members.
                            </DialogDescription>
                          </DialogHeader>
                          <form onSubmit={(e) => {
                            e.preventDefault();
                            sendNewsletterMutation.mutate(newsletterForm);
                          }} className="space-y-4">
                            <div>
                              <Label htmlFor="newsletter-subject">Subject</Label>
                              <Input
                                id="newsletter-subject"
                                value={newsletterForm.subject}
                                onChange={(e) => setNewsletterForm(prev => ({ ...prev, subject: e.target.value }))}
                                placeholder="Enter newsletter subject"
                                className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-400"
                                required
                              />
                            </div>
                            <div>
                              <Label htmlFor="newsletter-content">Content</Label>
                              <Textarea
                                id="newsletter-content"
                                value={newsletterForm.content}
                                onChange={(e) => setNewsletterForm(prev => ({ ...prev, content: e.target.value }))}
                                placeholder="Write your newsletter content here..."
                                className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-400 min-h-[200px]"
                                rows={8}
                                required
                              />
                            </div>
                            <DialogFooter>
                              <Button 
                                type="button" 
                                variant="outline" 
                                onClick={() => setIsCreatingNewsletter(false)}
                                className="border-slate-600 text-white bg-slate-800 hover:bg-slate-700"
                              >
                                Cancel
                              </Button>
                              <Button 
                                type="submit" 
                                disabled={sendNewsletterMutation.isPending || !newsletterForm.subject.trim() || !newsletterForm.content.trim()}
                                className="bg-slate-700 hover:bg-slate-600 text-white"
                              >
                                {sendNewsletterMutation.isPending ? "Sending..." : "Send Newsletter"}
                              </Button>
                            </DialogFooter>
                          </form>
                        </DialogContent>
                      </Dialog>
                    </div>
                    
                    {newsletters.length > 0 ? (
                      <div className="space-y-4">
                        {newsletters.map((newsletter) => (
                          <Card key={newsletter.id} className="bg-slate-700/30 border-slate-600/30">
                            <CardHeader>
                              <div className="flex justify-between items-start">
                                <div>
                                  <CardTitle className="text-white">{newsletter.subject}</CardTitle>
                                  <CardDescription className="text-slate-300 mt-2">
                                    Sent to {newsletter.recipients} members on{" "}
                                    {new Date(newsletter.sentAt).toLocaleDateString()} at{" "}
                                    {new Date(newsletter.sentAt).toLocaleTimeString()}
                                  </CardDescription>
                                </div>
                                <div className="flex gap-2">
                                  <Button size="sm" variant="outline" className="border-slate-600 text-slate-200 hover:bg-slate-700">
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button size="sm" variant="outline" className="border-red-400/30 text-red-300 hover:bg-red-400/20">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <p className="text-slate-200 text-sm line-clamp-3">{newsletter.content}</p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-10 sm:py-16">
                        <Mail className="h-12 w-12 sm:h-16 sm:w-16 text-slate-500 mx-auto mb-3 sm:mb-4" />
                        <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">No newsletters sent</h3>
                        <p className="text-slate-300 text-sm sm:text-base mb-4 sm:mb-6">Start engaging with your community by sending newsletters.</p>
                        <Button 
                          onClick={() => setIsCreatingNewsletter(true)}
                          className="bg-slate-700 hover:bg-slate-600 text-white h-9 sm:h-10 text-xs sm:text-sm px-3 sm:px-4"
                        >
                          <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                          Send First Newsletter
                        </Button>
                      </div>
                    )}
                  </TabsContent>

                  {/* Settings Tab */}
                  <TabsContent value="settings" className="mt-4 sm:mt-6">
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
                      {/* Settings Navigation Sidebar */}
                      <div className="lg:col-span-1">
                        <Card className="bg-slate-800/50 border-slate-700/50">
                          <CardContent className="p-3 sm:p-4">
                            <nav className="space-y-2">
                              <button
                                onClick={() => setActiveSettingsTab("display")}
                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                                  activeSettingsTab === "display" 
                                    ? "bg-slate-700 text-white" 
                                    : "text-slate-300 hover:text-white hover:bg-slate-700"
                                }`}
                              >
                                <Palette className="h-4 w-4" />
                                Display
                              </button>
                              <button
                                onClick={() => setActiveSettingsTab("options")}
                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                                  activeSettingsTab === "options" 
                                    ? "bg-slate-700 text-white" 
                                    : "text-slate-300 hover:text-white hover:bg-slate-700"
                                }`}
                              >
                                <Eye className="h-4 w-4" />
                                Options
                              </button>
                            </nav>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Settings Content */}
                      <div className="lg:col-span-3">
                        {/* Display Settings */}
                        {activeSettingsTab === "display" && (
                          <Card className="bg-slate-800/50 border-slate-700/50">
                            <CardHeader>
                              <CardTitle className="text-white flex items-center gap-2">
                                <Palette className="h-5 w-5" />
                                Display Settings
                              </CardTitle>
                              <CardDescription className="text-slate-300">
                                Customize your community's appearance and social links
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                              {/* Cover Image Upload */}
                              <div>
                                <Label className="text-white font-medium mb-4 flex items-center gap-2">
                                  Cover Image
                                </Label>
                                <div className="relative rounded-xl overflow-hidden border border-slate-600 bg-slate-800">
                                  <div 
                                    className="h-32 bg-cover bg-center bg-slate-700 flex items-center justify-center"
                                    style={coverImageUrl ? { backgroundImage: `url(${coverImageUrl})` } : {}}
                                  >
                                    {!coverImageUrl && (
                                      <span className="text-slate-400 text-sm">No cover image</span>
                                    )}
                                    <div className="absolute top-3 right-3">
                                      <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleCoverImageUpload}
                                        className="hidden"
                                        id="cover-upload-manage"
                                      />
                                      <label htmlFor="cover-upload-manage">
                                        <Button variant="secondary" size="sm" className="bg-slate-600 hover:bg-slate-500 text-white" asChild>
                                          <span>Change Cover</span>
                                        </Button>
                                      </label>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Avatar Image Upload */}
                              <div>
                                <Label className="text-white font-medium mb-4 flex items-center gap-2">
                                  Community Logo
                                </Label>
                                <div className="flex items-center gap-4">
                                  <div 
                                    className="h-20 w-20 rounded-xl border border-slate-600 bg-slate-700 overflow-hidden flex items-center justify-center"
                                    style={avatarImageUrl ? { backgroundImage: `url(${avatarImageUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : {}}
                                  >
                                    {!avatarImageUrl && (
                                      <span className="text-slate-400 text-xs">Logo</span>
                                    )}
                                  </div>
                                  <div>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      onChange={handleAvatarImageUpload}
                                      className="hidden"
                                      id="avatar-upload-manage"
                                    />
                                    <label htmlFor="avatar-upload-manage">
                                      <Button variant="outline" size="sm" className="border-slate-600 text-white bg-slate-700 hover:bg-slate-600" asChild>
                                        <span>Change Logo</span>
                                      </Button>
                                    </label>
                                  </div>
                                </div>
                              </div>

                              {/* Basic Info */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <Label htmlFor="community-name">Community Name</Label>
                                  <Input
                                    id="community-name"
                                    value={communitySettings.name}
                                    onChange={(e) => setCommunitySettings(prev => ({ ...prev, name: e.target.value }))}
                                    className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-400"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="theme-color">Theme Color</Label>
                                  <div className="flex gap-2">
                                    <Input
                                      id="theme-color"
                                      type="color"
                                      value={communitySettings.themeColor}
                                      onChange={(e) => setCommunitySettings(prev => ({ ...prev, themeColor: e.target.value }))}
                                      className="w-16 h-10 border-slate-600 bg-slate-800"
                                    />
                                    <Input
                                      value={communitySettings.themeColor}
                                      onChange={(e) => setCommunitySettings(prev => ({ ...prev, themeColor: e.target.value }))}
                                      className="flex-1 bg-slate-800 border-slate-600 text-white placeholder:text-slate-400"
                                      placeholder="#3b82f6"
                                    />
                                  </div>
                                </div>
                              </div>

                              <div>
                                <Label htmlFor="community-description">Description</Label>
                                <Textarea
                                  id="community-description"
                                  value={communitySettings.description}
                                  onChange={(e) => setCommunitySettings(prev => ({ ...prev, description: e.target.value }))}
                                  className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-400"
                                  rows={3}
                                />
                              </div>

                              {/* Social Links */}
                              <div>
                                <h4 className="text-white font-medium mb-4 flex items-center gap-2">
                                  <LinkIcon className="h-4 w-4" />
                                  Social Links
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <Label htmlFor="instagram" className="flex items-center gap-2">
                                      <Instagram className="h-4 w-4" />
                                      Instagram
                                    </Label>
                                    <Input
                                      id="instagram"
                                      value={communitySettings.socialLinks.instagram}
                                      onChange={(e) => setCommunitySettings(prev => ({ 
                                        ...prev, 
                                        socialLinks: { ...prev.socialLinks, instagram: e.target.value }
                                      }))}
                                      className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-400"
                                      placeholder="https://instagram.com/username"
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor="youtube" className="flex items-center gap-2">
                                      <Youtube className="h-4 w-4" />
                                      YouTube
                                    </Label>
                                    <Input
                                      id="youtube"
                                      value={communitySettings.socialLinks.youtube}
                                      onChange={(e) => setCommunitySettings(prev => ({ 
                                        ...prev, 
                                        socialLinks: { ...prev.socialLinks, youtube: e.target.value }
                                      }))}
                                      className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-400"
                                      placeholder="https://youtube.com/channel/..."
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor="linkedin" className="flex items-center gap-2">
                                      <Linkedin className="h-4 w-4" />
                                      LinkedIn
                                    </Label>
                                    <Input
                                      id="linkedin"
                                      value={communitySettings.socialLinks.linkedin}
                                      onChange={(e) => setCommunitySettings(prev => ({ 
                                        ...prev, 
                                        socialLinks: { ...prev.socialLinks, linkedin: e.target.value }
                                      }))}
                                      className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-400"
                                      placeholder="https://linkedin.com/company/..."
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor="twitter" className="flex items-center gap-2">
                                      <MessageSquare className="h-4 w-4" />
                                      Twitter/X
                                    </Label>
                                    <Input
                                      id="twitter"
                                      value={communitySettings.socialLinks.twitter}
                                      onChange={(e) => setCommunitySettings(prev => ({ 
                                        ...prev, 
                                        socialLinks: { ...prev.socialLinks, twitter: e.target.value }
                                      }))}
                                      className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-400"
                                      placeholder="https://x.com/username"
                                    />
                                  </div>
                                  <div className="md:col-span-2">
                                    <Label htmlFor="website" className="flex items-center gap-2">
                                      <Globe className="h-4 w-4" />
                                      Website
                                    </Label>
                                    <Input
                                      id="website"
                                      value={communitySettings.socialLinks.website}
                                      onChange={(e) => setCommunitySettings(prev => ({ 
                                        ...prev, 
                                        socialLinks: { ...prev.socialLinks, website: e.target.value }
                                      }))}
                                      className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-400"
                                      placeholder="https://yourwebsite.com"
                                    />
                                  </div>
                                </div>
                              </div>

                              <div className="flex justify-end pt-4">
                                <Button 
                                  onClick={() => updateCommunityMutation.mutate({
                                    name: communitySettings.name,
                                    description: communitySettings.description,
                                    imageUrl: avatarImageUrl,
                                    coverImageUrl: coverImageUrl,
                                    settings: {
                                      themeColor: communitySettings.themeColor,
                                      socialLinks: communitySettings.socialLinks
                                    }
                                  })}
                                  disabled={updateCommunityMutation.isPending}
                                  className="bg-slate-700 hover:bg-slate-600 text-white"
                                >
                                  {updateCommunityMutation.isPending ? "Saving..." : "Save Changes"}
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {/* Options Settings */}
                        {activeSettingsTab === "options" && (
                          <Card className="bg-slate-800/50 border-slate-700/50">
                            <CardHeader>
                              <CardTitle className="text-white flex items-center gap-2">
                                <Eye className="h-5 w-5" />
                                Community Options
                              </CardTitle>
                              <CardDescription className="text-slate-300">
                                Configure community behavior and visibility settings
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                              {/* Event Visibility */}
                              <div>
                                <Label htmlFor="event-visibility">Event Visibility</Label>
                                <Select 
                                  value={communitySettings.options.eventVisibility} 
                                  onValueChange={(value) => setCommunitySettings(prev => ({ 
                                    ...prev, 
                                    options: { ...prev.options, eventVisibility: value }
                                  }))}
                                >
                                  <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="bg-slate-900 border-slate-700/50">
                                    <SelectItem value="public" className="text-white hover:bg-slate-800">Public - Anyone can see events</SelectItem>
                                    <SelectItem value="members" className="text-white hover:bg-slate-800">Members Only - Only community members can see events</SelectItem>
                                    <SelectItem value="private" className="text-white hover:bg-slate-800">Private - Only admins can see events</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Community Status */}
                              <div>
                                <Label htmlFor="community-status">Community Status</Label>
                                <Select 
                                  value={communitySettings.options.status} 
                                  onValueChange={(value) => setCommunitySettings(prev => ({ 
                                    ...prev, 
                                    options: { ...prev.options, status: value }
                                  }))}
                                >
                                  <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="bg-slate-900 border-slate-700/50">
                                    <SelectItem value="active" className="text-white hover:bg-slate-800">
                                      <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                                        Active
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="coming-soon" className="text-white hover:bg-slate-800">
                                      <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                                        Coming Soon
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="archived" className="text-white hover:bg-slate-800">
                                      <div className="flex items-center gap-2">
                                        <Archive className="h-4 w-4" />
                                        Archived
                                      </div>
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Toggle Options */}
                              <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-slate-800/70 rounded-lg">
                                  <div>
                                    <h4 className="text-white font-medium">Public Guest List</h4>
                                    <p className="text-slate-300 text-sm">Show guest list on event pages</p>
                                  </div>
                                  <Switch
                                    checked={communitySettings.options.showGuestList}
                                    onCheckedChange={(checked) => setCommunitySettings(prev => ({ 
                                      ...prev, 
                                      options: { ...prev.options, showGuestList: checked }
                                    }))}
                                  />
                                </div>

                                <div className="flex items-center justify-between p-4 bg-slate-800/70 rounded-lg">
                                  <div>
                                    <h4 className="text-white font-medium">Collect Feedback</h4>
                                    <p className="text-slate-300 text-sm">Email guests after events to collect feedback</p>
                                  </div>
                                  <Switch
                                    checked={communitySettings.options.collectFeedback}
                                    onCheckedChange={(checked) => setCommunitySettings(prev => ({ 
                                      ...prev, 
                                      options: { ...prev.options, collectFeedback: checked }
                                    }))}
                                  />
                                </div>
                              </div>

                              <div className="flex justify-end pt-4">
                                <Button 
                                  onClick={() => updateCommunityMutation.mutate({
                                    settings: {
                                      themeColor: communitySettings.themeColor,
                                      socialLinks: communitySettings.socialLinks,
                                      options: communitySettings.options
                                    }
                                  })}
                                  disabled={updateCommunityMutation.isPending}
                                  className="bg-slate-700 hover:bg-slate-600 text-white"
                                >
                                  {updateCommunityMutation.isPending ? "Saving..." : "Save Options"}
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  {/* Discover Tab */}
                  <GroupDiscoverTab groupId={community?.id} />

                </Tabs>
              </CardContent>
            </Card>
          </div>
        </main>
        <MobileNav />
      </div>
    </SimpleBackground>
  );
}
