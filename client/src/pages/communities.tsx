import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Users, Plus, Search, Filter, SortAsc, Lock, Globe, Ticket, Loader2 } from "lucide-react";
import { Link, useLocation } from "wouter";
import Header from "@/components/layout/header";
import MobileNav from "@/components/layout/mobile-nav";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import React, { useState, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const CATEGORIES = [
  { value: "all", label: "All Categories" },
  { value: "general", label: "General" },
  { value: "technology", label: "Technology" },
  { value: "business", label: "Business" },
  { value: "health", label: "Health & Fitness" },
  { value: "education", label: "Education" },
  { value: "entertainment", label: "Entertainment" },
  { value: "gaming", label: "Gaming" },
  { value: "sports", label: "Sports" },
  { value: "travel", label: "Travel" },
  { value: "food", label: "Food & Drink" },
  { value: "arts", label: "Arts & Culture" },
  { value: "science", label: "Science" },
  { value: "social", label: "Social" },
  { value: "hobbies", label: "Hobbies" },
  { value: "other", label: "Other" },
];

export default function Communities() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  
  // Join by code mutation
  const joinByCodeMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await apiRequest("POST", "/api/groups/join-by-code", { code });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to join group");
      }
      return data;
    },
    onSuccess: (data) => {
      toast({ title: "Joined successfully!", description: `You're now a member of ${data.group?.name || "the group"}` });
      setShowJoinDialog(false);
      setInviteCode("");
      queryClient.invalidateQueries({ queryKey: ["/api/profile/groups"] });
      setLocation(`/groups/${data.group?.slug || data.group?.id}`);
    },
    onError: (error: any) => {
      toast({ title: "Failed to join", description: error.message, variant: "destructive" });
    },
  });
  
  const { data: myCommunities = [], isLoading: myLoading } = useQuery({
    queryKey: ["/api/profile/groups"],
    enabled: !!user,
    queryFn: async () => {
      const res = await fetch("/api/profile/groups", { credentials: "include" });
      if (res.status === 401) return [];
      if (!res.ok) throw new Error("Failed to fetch user communities");
      return res.json();
    },
    staleTime: 60000,
  });

  const { data: publicCommunities = [], isLoading: publicLoading } = useQuery({
    queryKey: ["/api/groups/discovery"],
    queryFn: async () => {
      const res = await fetch("/api/groups/discovery", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch public communities");
      return res.json();
    },
    staleTime: 120000,
  });

  const userCommunityIds = useMemo(() => 
    (myCommunities || []).map((c: any) => c.id), 
    [myCommunities]
  );

  const filteredPublicCommunities = useMemo(() => {
    return (publicCommunities || [])
      .filter((c: any) => !userCommunityIds.includes(c.id))
      .filter((c: any) => 
        searchTerm === "" || 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .filter((c: any) => 
        selectedCategory === "all" || 
        (c.category && c.category === selectedCategory) ||
        (!c.category && selectedCategory === "general")
      )
      .sort((a: any, b: any) => {
        switch (sortBy) {
          case "name": return a.name.localeCompare(b.name);
          case "newest": return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          case "oldest": return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          case "members": return (b.memberCount || 0) - (a.memberCount || 0);
          default: return 0;
        }
      });
  }, [publicCommunities, userCommunityIds, searchTerm, selectedCategory, sortBy]);

  if (authLoading || myLoading || publicLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <Header />
        <main className="pt-24 pb-20 max-w-7xl mx-auto px-4 md:px-6">
          <div className="animate-pulse space-y-8">
            <div className="h-40 bg-slate-200 dark:bg-slate-900 rounded-[2rem]" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
               {[...Array(4)].map((_, i) => <div key={i} className="h-64 bg-slate-200 dark:bg-slate-900 rounded-2xl" />)}
            </div>
          </div>
        </main>
        <MobileNav />
      </div>
    );
  }

  const CommunityCard = ({ community }: { community: any }) => (
    <Link href={`/groups/${community.slug || community.id}`}>
      <div className="group cursor-pointer h-full">
        <div className="h-full bg-white dark:bg-slate-900 rounded-2xl shadow-sm hover:shadow-md border border-slate-200 dark:border-slate-800 overflow-hidden transition-all duration-300 hover:-translate-y-1">
          <div className="relative aspect-[16/9] bg-slate-100 dark:bg-slate-800 overflow-hidden">
            {community.imageUrl ? (
              <img
                src={community.imageUrl}
                alt={community.name}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Users className="h-12 w-12 text-slate-300 dark:text-slate-700" />
              </div>
            )}
            <div className="absolute top-3 right-3">
              <span className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded-full font-bold shadow-sm flex items-center gap-1 ${
                community.isPublic 
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400 ring-1 ring-emerald-200 dark:ring-emerald-800' 
                  : 'bg-amber-50 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400 ring-1 ring-amber-200 dark:ring-amber-800'
              }`}>
                {community.isPublic ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                {community.isPublic ? 'Public' : 'Private'}
              </span>
            </div>
          </div>
          <div className="p-4" style={{ minHeight: '100px' }}>
            <h3 className="text-base font-bold text-slate-900 dark:text-white line-clamp-1 mb-1.5">{community.name}</h3>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Users className="h-3.5 w-3.5" />
              <span>{community.memberCount || 0} Members</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans pb-20">
      <Header />
      
      {/* Hero Section - Functional & Clean */}
      <section className="pt-24 md:pt-32 pb-8 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 p-6 md:p-10 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white mb-2">
              Your <span className="text-indigo-600 dark:text-indigo-400">Groups</span>
            </h1>
            <p className="text-slate-600 dark:text-slate-400 font-medium">
              Join or manage communities to coordinate events and members easily.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 w-full md:w-auto">
            <Button 
              onClick={() => setShowJoinDialog(true)}
              variant="outline"
              className="rounded-full border-slate-300 dark:border-slate-700 h-11 px-6 font-medium text-slate-900 dark:text-white bg-white dark:bg-slate-900"
            >
              <Ticket className="h-4 w-4 mr-2" />
              Join with Code
            </Button>
            <Button asChild size="lg" className="rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-md px-8 h-11">
              <Link href="/groups/create">
                <Plus className="h-5 w-5 mr-2" />
                Create Group
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 md:px-6 space-y-12">
        {/* My Groups List */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Participating In</h2>
            <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold">
               {myCommunities.length}
            </span>
          </div>
          
          {myCommunities.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {myCommunities.map((community: any) => (
                <CommunityCard key={community.id} community={community} />
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 p-12 text-center">
               <Users className="h-10 w-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
               <p className="text-slate-500 dark:text-slate-400 font-medium">You haven't joined any groups yet.</p>
            </div>
          )}
        </section>

        {/* Discovery Section */}
        <section className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Discover New Groups</h2>
            
            <div className="flex flex-col sm:flex-row gap-2 flex-1 max-w-2xl">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search and find groups..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full sm:w-48 h-10 rounded-full border-slate-200 dark:border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {filteredPublicCommunities.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
               {filteredPublicCommunities.map((community: any) => (
                 <DiscoverCommunityCard key={community.id} community={community} />
               ))}
            </div>
          ) : (
            <div className="py-20 text-center">
               <h3 className="text-slate-500 dark:text-slate-400 font-medium">No results matching your search.</h3>
            </div>
          )}
        </section>
      </main>

      <MobileNav />

      {/* Dialogs */}
      <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
        <DialogContent className="rounded-[2rem] border-none p-8 dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Join a Group</DialogTitle>
            <DialogDescription>Enter the 8-character code sent by a group administrator.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 pt-4">
             <Input
                placeholder="ABCDEF12"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                className="h-16 text-2xl font-black text-center tracking-[0.5em] rounded-2xl bg-slate-50 dark:bg-slate-800 border-none"
                maxLength={8}
             />
             <Button 
                onClick={() => joinByCodeMutation.mutate(inviteCode)}
                disabled={inviteCode.length < 8 || joinByCodeMutation.isPending}
                className="w-full h-12 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-lg"
             >
                {joinByCodeMutation.isPending ? "Connecting..." : "Join Group Now"}
             </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Minimalist Discover Card
const DiscoverCommunityCard = ({ community }: { community: any }) => {
  const [isJoining, setIsJoining] = useState(false);
  const logoUrl = community.imageUrl || community.logoUrl;

  const handleJoin = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    setIsJoining(true);
    try {
      const res = await fetch(`/api/groups/${community.id}/join`, { method: 'POST', credentials: 'include' });
      if (!res.ok) throw new Error('Failed');
      window.location.reload();
    } catch (error) {
      alert('Failed to join');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-900 transition-colors group">
      <div className="flex items-start gap-4 mb-4">
        <div className="h-12 w-12 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex-shrink-0 overflow-hidden">
           {logoUrl ? <img src={logoUrl} className="w-full h-full object-cover" /> : <Users className="h-6 w-6 m-3 text-slate-300" />}
        </div>
        <div className="min-w-0">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate mb-0.5">{community.name}</h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
             {community.memberCount || 0} members · {community.isPublic ? "Public" : "Private"}
          </p>
        </div>
      </div>
      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mb-4 h-8 leading-snug">
        {community.description || "No description provided."}
      </p>
      <Button 
        onClick={handleJoin} 
        disabled={isJoining}
        variant="outline" 
        className="w-full h-9 rounded-full text-xs font-bold border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800"
      >
        {isJoining ? "Joining..." : community.isPublic ? "Join" : "Request"}
      </Button>
    </div>
  );
};
