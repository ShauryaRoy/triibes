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
  const [activeTab, setActiveTab] = useState("members");

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

  const { data: newsletters = [] } = useQuery<any[]>({
    queryKey: [`/api/groups/${community?.id}/newsletters`],
    queryFn: async () => {
      if (!community?.id) return [];
      const res = await fetch(`/api/groups/${community.id}/newsletters`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!community?.id,
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
      const response = await fetch(`/api/groups/${community?.id}/newsletter`, {
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
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${community?.id}/newsletters`] });
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

  return (
    <SimpleBackground className="min-h-screen">
      <div className="absolute inset-0 bg-black/10" />
      <div className="relative z-10">
        <Header />
        <main className="flex-1 px-3 sm:px-4 md:px-6 lg:px-8 pt-20 md:pt-24 pb-24 md:pb-16">
          <div className="max-w-4xl mx-auto space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3">
              <Button asChild variant="ghost" size="sm" className="text-slate-400 hover:text-white hover:bg-slate-800 h-8 w-8 p-0 shrink-0">
                <Link href={`/groups/${id}`}>
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              <div className="min-w-0 flex-1">
                <h1 className="text-base sm:text-xl font-semibold text-white truncate">{community.name}</h1>
                <p className="text-slate-500 text-xs flex items-center gap-1.5 mt-0.5">
                  {community.isPublic ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                  <span>{community.isPublic ? 'Public' : 'Private'}</span>
                  <span>·</span>
                  <span>{community.memberCount} members</span>
                </p>
              </div>
            </div>

            {/* Management Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="w-full flex items-center justify-center mb-8">
                <TabsList className="bg-slate-100 dark:bg-slate-800/80 p-1 rounded-full inline-flex h-11 border border-slate-200 dark:border-slate-700">
                      <TabsTrigger 
                        value="members" 
                        className="rounded-full px-6 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm transition-all"
                      >
                        <Users className="h-3.5 w-3.5 mr-2" />
                        Members
                      </TabsTrigger>
                      <TabsTrigger 
                        value="newsletter" 
                        className="rounded-full px-6 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm transition-all"
                      >
                        <Mail className="h-3.5 w-3.5 mr-2" />
                        Newsletter
                      </TabsTrigger>
                      <TabsTrigger 
                        value="settings" 
                        className="rounded-full px-6 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm transition-all"
                      >
                        <Settings className="h-3.5 w-3.5 mr-2" />
                        Settings
                      </TabsTrigger>
                      <TabsTrigger 
                        value="discover" 
                        className="rounded-full px-6 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm transition-all"
                      >
                        <Sparkles className="h-3.5 w-3.5 mr-2" />
                        Discover
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  {/* Members Tab */}
                  <TabsContent value="members" className="mt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-slate-400 text-xs">{members?.length || 0} members</p>
                    </div>
                    
                    {members && members.length > 0 ? (
                      <div className="space-y-2">
                        {members.map((member: any) => (
                          <div key={member.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700/40">
                            <Avatar className="h-9 w-9 shrink-0">
                              <AvatarImage src={member.user?.avatar} />
                              <AvatarFallback className="bg-slate-700 text-white text-xs">
                                {member.user?.firstName?.[0]}{member.user?.lastName?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <p className="text-white text-sm font-medium truncate">
                                {member.user?.firstName} {member.user?.lastName}
                                {member.userId === user?.id && <span className="text-slate-500 text-xs ml-1">(you)</span>}
                              </p>
                              <p className="text-slate-500 text-xs truncate">{member.user?.email}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {member.userId !== user?.id ? (
                                <Select
                                  value={member.role}
                                  onValueChange={(newRole) => updateMemberRoleMutation.mutate({ userId: member.userId, role: newRole })}
                                  disabled={updateMemberRoleMutation.isPending}
                                >
                                  <SelectTrigger className={`w-24 text-xs h-7 border-0 ${
                                    member.role === 'owner' ? 'bg-yellow-600/20 text-yellow-300' : 
                                    member.role === 'host' ? 'bg-blue-600/20 text-blue-300' : 
                                    'bg-slate-700/60 text-slate-300'
                                  }`}>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="member">Member</SelectItem>
                                    <SelectItem value="host">Host</SelectItem>
                                    <SelectItem value="owner">Owner</SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : (
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                  member.role === 'owner' ? 'bg-yellow-600/20 text-yellow-400' :
                                  member.role === 'host' ? 'bg-blue-600/20 text-blue-400' :
                                  'bg-slate-700 text-slate-400'
                                }`}>{member.role}</span>
                              )}
                              {member.role !== 'owner' && member.userId !== user?.id && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-slate-600 hover:text-red-400 h-7 w-7 p-0"
                                  onClick={() => removeMemberMutation.mutate(member.userId)}
                                  disabled={removeMemberMutation.isPending}
                                >
                                  <UserX className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Users className="h-10 w-10 text-slate-600 mx-auto mb-3" />
                        <p className="text-slate-400 text-sm">No members yet</p>
                        <p className="text-slate-600 text-xs mt-1">Members will appear here as they join.</p>
                      </div>
                    )}
                  </TabsContent>

                  {/* Newsletter Tab */}
                  <TabsContent value="newsletter" className="mt-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-slate-400 text-xs">{newsletters.length} sent</p>
                      <Dialog open={isCreatingNewsletter} onOpenChange={setIsCreatingNewsletter}>
                        <DialogTrigger asChild>
                          <Button className="bg-slate-700 hover:bg-slate-600 text-white h-8 text-xs px-3">
                            <Send className="h-3.5 w-3.5 mr-1.5" />
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
                      <div className="space-y-3">
                        {newsletters.map((nl: any) => (
                          <Card key={nl.id} className="bg-slate-700/30 border-slate-600/30">
                            <CardHeader className="pb-2">
                              <div className="flex justify-between items-start gap-2">
                                <CardTitle className="text-white text-base">{nl.subject}</CardTitle>
                                <span className="text-xs text-slate-400 whitespace-nowrap shrink-0">
                                  {new Date(nl.sentAt).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Kolkata' })}
                                </span>
                              </div>
                              <CardDescription className="text-slate-400 text-xs">
                                Sent to {nl.recipientCount} member{nl.recipientCount !== 1 ? 's' : ''}
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-0">
                              <p className="text-slate-300 text-sm line-clamp-2">{nl.content}</p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Mail className="h-10 w-10 text-slate-600 mx-auto mb-3" />
                        <p className="text-slate-400 text-sm">No newsletters sent yet</p>
                        <p className="text-slate-600 text-xs mt-1 mb-4">Reach all members with a single message.</p>
                        <Button 
                          onClick={() => setIsCreatingNewsletter(true)}
                          className="bg-slate-700 hover:bg-slate-600 text-white h-8 text-xs px-4"
                        >
                          <Send className="h-3.5 w-3.5 mr-1.5" />
                          Compose
                        </Button>
                      </div>
                    )}
                  </TabsContent>

                  {/* Settings Tab */}
                  <TabsContent value="settings" className="mt-4">
                    <div className="space-y-5">
                      {/* Cover Image */}
                      <div className="space-y-2">
                        <Label className="text-slate-400 text-xs">Cover Image</Label>
                        <div className="relative rounded-xl overflow-hidden border border-slate-700/50 bg-slate-800/50">
                          <div 
                            className="h-28 bg-cover bg-center bg-slate-800 flex items-center justify-center"
                            style={coverImageUrl ? { backgroundImage: `url(${coverImageUrl})` } : {}}
                          >
                            {!coverImageUrl && <span className="text-slate-600 text-xs">No cover image</span>}
                          </div>
                          <div className="absolute top-2 right-2">
                            <input type="file" accept="image/*" onChange={handleCoverImageUpload} className="hidden" id="cover-upload-manage" />
                            <label htmlFor="cover-upload-manage">
                              <Button variant="secondary" size="sm" className="bg-slate-900/70 hover:bg-slate-900 text-white text-xs h-7" asChild>
                                <span>Change</span>
                              </Button>
                            </label>
                          </div>
                        </div>
                      </div>

                      {/* Logo */}
                      <div className="flex items-center gap-4">
                        <div 
                          className="h-16 w-16 rounded-xl border border-slate-700/50 bg-slate-800/50 overflow-hidden flex items-center justify-center shrink-0"
                          style={avatarImageUrl ? { backgroundImage: `url(${avatarImageUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : {}}
                        >
                          {!avatarImageUrl && <span className="text-slate-600 text-xs">Logo</span>}
                        </div>
                        <div>
                          <p className="text-slate-400 text-xs mb-1.5">Community Logo</p>
                          <input type="file" accept="image/*" onChange={handleAvatarImageUpload} className="hidden" id="avatar-upload-manage" />
                          <label htmlFor="avatar-upload-manage">
                            <Button variant="outline" size="sm" className="border-slate-700 text-slate-300 bg-slate-800/50 hover:bg-slate-700 text-xs h-7" asChild>
                              <span>Change Logo</span>
                            </Button>
                          </label>
                        </div>
                      </div>

                      {/* Name & Description */}
                      <div className="space-y-3">
                        <div>
                          <Label className="text-slate-400 text-xs mb-1.5 block">Community Name</Label>
                          <Input
                            value={communitySettings.name}
                            onChange={(e) => setCommunitySettings(prev => ({ ...prev, name: e.target.value }))}
                            className="bg-slate-800/50 border-slate-700/50 text-white placeholder:text-slate-600 h-9 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-slate-400 text-xs mb-1.5 block">Description</Label>
                          <Textarea
                            value={communitySettings.description}
                            onChange={(e) => setCommunitySettings(prev => ({ ...prev, description: e.target.value }))}
                            className="bg-slate-800/50 border-slate-700/50 text-white placeholder:text-slate-600 text-sm resize-none"
                            rows={3}
                          />
                        </div>
                      </div>

                      {/* Social Links */}
                      <div className="space-y-2">
                        <p className="text-slate-400 text-xs flex items-center gap-1.5"><LinkIcon className="h-3 w-3" />Social Links</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div className="flex items-center gap-2 bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 h-9">
                            <Instagram className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                            <input
                              value={communitySettings.socialLinks.instagram}
                              onChange={(e) => setCommunitySettings(prev => ({ ...prev, socialLinks: { ...prev.socialLinks, instagram: e.target.value } }))}
                              className="flex-1 bg-transparent text-white text-xs placeholder:text-slate-600 outline-none"
                              placeholder="Instagram URL"
                            />
                          </div>
                          <div className="flex items-center gap-2 bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 h-9">
                            <Youtube className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                            <input
                              value={communitySettings.socialLinks.youtube}
                              onChange={(e) => setCommunitySettings(prev => ({ ...prev, socialLinks: { ...prev.socialLinks, youtube: e.target.value } }))}
                              className="flex-1 bg-transparent text-white text-xs placeholder:text-slate-600 outline-none"
                              placeholder="YouTube URL"
                            />
                          </div>
                          <div className="flex items-center gap-2 bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 h-9">
                            <Linkedin className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                            <input
                              value={communitySettings.socialLinks.linkedin}
                              onChange={(e) => setCommunitySettings(prev => ({ ...prev, socialLinks: { ...prev.socialLinks, linkedin: e.target.value } }))}
                              className="flex-1 bg-transparent text-white text-xs placeholder:text-slate-600 outline-none"
                              placeholder="LinkedIn URL"
                            />
                          </div>
                          <div className="flex items-center gap-2 bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 h-9">
                            <MessageSquare className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                            <input
                              value={communitySettings.socialLinks.twitter}
                              onChange={(e) => setCommunitySettings(prev => ({ ...prev, socialLinks: { ...prev.socialLinks, twitter: e.target.value } }))}
                              className="flex-1 bg-transparent text-white text-xs placeholder:text-slate-600 outline-none"
                              placeholder="Twitter / X URL"
                            />
                          </div>
                          <div className="sm:col-span-2 flex items-center gap-2 bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 h-9">
                            <Globe className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                            <input
                              value={communitySettings.socialLinks.website}
                              onChange={(e) => setCommunitySettings(prev => ({ ...prev, socialLinks: { ...prev.socialLinks, website: e.target.value } }))}
                              className="flex-1 bg-transparent text-white text-xs placeholder:text-slate-600 outline-none"
                              placeholder="Website URL"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end pt-2">
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
                          className="bg-slate-700 hover:bg-slate-600 text-white h-8 text-xs px-4"
                        >
                          {updateCommunityMutation.isPending ? "Saving..." : "Save Changes"}
                        </Button>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Discover Tab */}
                  <GroupDiscoverTab groupId={community?.id} />

            </Tabs>
          </div>
        </main>
        <MobileNav />
      </div>
    </SimpleBackground>
  );
}
