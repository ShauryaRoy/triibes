import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Users, Plus, Search, Filter, SortAsc, Lock, Globe, Ticket, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import LazyImage from "@/components/ui/lazy-image";
import { Link, useLocation } from "wouter";
import Header from "@/components/layout/header";
import MobileNav from "@/components/layout/mobile-nav";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import React, { useState, useEffect, useMemo, useCallback } from "react";

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
      // Navigate to the group
      setLocation(`/groups/${data.group?.slug || data.group?.id}`);
    },
    onError: (error: any) => {
      toast({ title: "Failed to join", description: error.message, variant: "destructive" });
    },
  });
  
  // Fetch communities for the authenticated user (memberships), not public list
  const { data: myCommunities = [], isLoading: myLoading, isFetching: myFetching } = useQuery({
    queryKey: ["/api/profile/groups"],
    enabled: !!user, // only when logged in
    queryFn: async () => {
      const res = await fetch("/api/profile/groups", { credentials: "include" });
      if (res.status === 401) return [];
      if (!res.ok) throw new Error("Failed to fetch user communities");
      return res.json();
    },
    // ✅ OPTIMIZED: Use cache-first strategy instead of always refetching
    staleTime: 60000, // Data fresh for 1 minute
    gcTime: 300000, // Keep in cache for 5 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });

  // Fetch all public communities for discovery
  const { data: publicCommunities = [], isLoading: publicLoading, isFetching: publicFetching } = useQuery({
    queryKey: ["/api/groups/discovery"],
    queryFn: async () => {
      const res = await fetch("/api/groups/discovery", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch public communities");
      return res.json();
    },
    // ✅ OPTIMIZED: Cache public communities for 2 minutes
    staleTime: 120000, // Data fresh for 2 minutes (public data changes less frequently)
    gcTime: 600000, // Keep in cache for 10 minutes
    refetchOnWindowFocus: false,
  });

  // Memoize expensive computations
  const ownedCommunities = useMemo(() => 
    (myCommunities || []).filter((c: any) => c.createdBy === user?.id), 
    [myCommunities, user?.id]
  );
  
  const joinedCommunities = useMemo(() => 
    (myCommunities || []).filter((c: any) => c.createdBy !== user?.id), 
    [myCommunities, user?.id]
  );

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
          case "name":
            return a.name.localeCompare(b.name);
          case "newest":
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          case "oldest":
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          case "members":
            return (b.memberCount || 0) - (a.memberCount || 0);
          default:
            return 0;
        }
      });
  }, [publicCommunities, userCommunityIds, searchTerm, selectedCategory, sortBy]);

  // Show skeleton if initial load
  if (authLoading || myLoading || publicLoading) {
    const SkeletonCard = () => (
      <div className="animate-pulse rounded-2xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-sm p-5 space-y-4 min-w-[260px]">
        <div className="flex items-start gap-4">
          <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-800" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-40 bg-slate-200 dark:bg-slate-800 rounded" />
            <div className="h-3 w-24 bg-slate-100 dark:bg-slate-700 rounded" />
          </div>
        </div>
      </div>
    );

    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 overflow-x-hidden">
        <Header />
        <main className="pt-24 pb-20 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="space-y-3">
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">Groups</h1>
            <p className="text-slate-600 dark:text-slate-400 text-sm">Loading your groups...</p>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">My Groups</h2>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          </div>
        </main>
        <MobileNav />
      </div>
    );
  }


  // If not logged in, show a minimal empty state matching the page style
  if (!user) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-black overflow-x-hidden">
        <Header />
        <main className="pt-24 pb-20 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">Groups</h1>
            <p className="text-slate-600 dark:text-slate-400 text-sm">Sign in to see your communities.</p>
            <Button asChild className="rounded-full bg-gradient-to-r from-violet-600 to-purple-600 text-white w-fit">
              <Link href="/profile">Go to Profile</Link>
            </Button>
          </div>
        </main>
        <MobileNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-black text-slate-900 dark:text-slate-100 font-sans">
      <Header />
      
      {/* Hero Section */}
      <section className="relative pt-20 overflow-hidden isolate">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-50/60 via-white to-purple-50/40 dark:from-gray-950 dark:via-black dark:to-gray-900" />
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-b from-transparent to-[#F8FAFC] dark:to-black" />

        <div className="max-w-7xl mx-auto relative z-10 grid lg:grid-cols-2 gap-12 items-center">
          
          {/* LEFT COLUMN: Text Content */}
          <div className="flex flex-col items-start pl-6 max-w-xl">
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white mb-3">
              Your <span className="text-violet-600 dark:text-gray-200">Groups</span> 👥
            </h1>
            <p className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">
              Connect and collaborate <span className="text-violet-500 dark:text-gray-200">in one place.</span>
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md leading-relaxed mb-6">
              Create and manage your groups. Share events, coordinate members, and keep everyone in sync.
            </p>
            
            <div className="flex flex-wrap gap-3">
              <Button 
                onClick={() => setShowJoinDialog(true)}
                size="lg" 
                variant="outline"
                className="border border-slate-200 dark:border-white/10
text-slate-800 dark:text-slate-200
bg-white dark:bg-slate-900/40
dark:backdrop-blur-xl
hover:bg-slate-50 dark:hover:bg-slate-800/60
hover:shadow-[0_0_0_1px_rgba(139,92,246,0.2)]
rounded-full
transition-all duration-200

    
"
              >
                <Ticket className="h-4 w-4 mr-2" />
                Join with Code
              </Button>
              <Button asChild size="lg" className="rounded-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white  shadow-violet-200">
                <Link href="/groups/create">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Group
                </Link>
              </Button>
            </div>
          </div>

          {/* RIGHT COLUMN: Floating Decor Area */}
          <div className="relative h-[320px] hidden lg:block w-full">
            
            {/* Sticky Note */}
            <div className="absolute left-10 top-10 z-10">
              <div className="w-40 p-3.5 bg-yellow-100 dark:bg-yellow-900/80 rounded-xl shadow-xl rotate-[-6deg] animate-float">
                <p className="text-xs font-medium text-slate-800 dark:text-yellow-100 leading-snug">
                  Connect with
                  <br />
                  your community ✨
                </p>
                <span className="absolute -top-2 left-1/2 w-3 h-3 bg-red-500 rounded-full -translate-x-1/2" />
              </div>
            </div>

            {/* Group Card Preview */}
            <div className="absolute right-0 top-6 z-20">
              <div className="w-60 rounded-2xl overflow-hidden shadow-2xl rotate-[4deg] bg-white dark:bg-gray-950 animate-float-delayed border border-slate-100 dark:border-gray-800">
                <div className="p-4 bg-white dark:bg-gray-950">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-violet-400 to-purple-500" />
                    <div className="flex-1">
                      <div className="text-sm font-bold text-slate-900 dark:text-white">Tech Enthusiasts</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">42 Members</div>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="h-1.5 w-3/4 bg-slate-100 dark:bg-slate-800 rounded" />
                    <div className="h-1.5 w-1/2 bg-slate-100 dark:bg-slate-800 rounded" />
                  </div>
                </div>
              </div>
            </div>

            {/* Create Group Pill */}
            <div className="absolute right-12 bottom-12 z-30">
              <Link href="/groups/create">
                <div className="px-5 py-2.5 rounded-full bg-gradient-to-r from-violet-600 to-purple-600 shadow-lg flex items-center gap-2 hover:scale-105 transition-transform cursor-pointer">
                  <span className="text-white font-semibold text-xs">Create Group</span>
                  <span className="text-white text-sm">→</span>
                </div>
              </Link>
            </div>

          </div>
        </div>
      </section>

      <main className="pb-24 md:pb-12 w-full px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-12 mt-6 max-w-7xl mx-auto">
        {/* My Communities - Horizontal with Controls */}
        <section className="bg-white/70 dark:bg-slate-900/70 backdrop-blur rounded-3xl p-6 border border-slate-200/60 dark:border-slate-800/60 shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)]">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">My Groups</h2>
                <span className="px-2.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300 text-xs font-medium">
                  {ownedCommunities.length}
                </span>
              </div>
              {ownedCommunities.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    className="h-9 w-9 flex items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-violet-600 dark:hover:text-violet-400 hover:border-violet-300 dark:hover:border-violet-600 hover:shadow-sm transition-all active:scale-95"
                    onClick={() => {
                      const el = document.getElementById('ownedScroller');
                      if (el) el.scrollBy({ left: -360, behavior: 'smooth' });
                    }}
                    aria-label="Scroll left"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    className="h-9 w-9 flex items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 hover:text-violet-600 hover:border-violet-300 hover:shadow-sm transition-all active:scale-95"
                    onClick={() => {
                      const el = document.getElementById('ownedScroller');
                      if (el) el.scrollBy({ left: 360, behavior: 'smooth' });
                    }}
                    aria-label="Scroll right"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              )}
            </div>
            {ownedCommunities.length > 0 ? (
              <div id="ownedScroller" className="overflow-x-auto hide-scrollbar pb-2 scroll-smooth">
                <div className="flex gap-6 snap-x snap-mandatory">
                  {ownedCommunities.map((community: any) => (
                    <Link key={community.id} href={`/groups/${community.slug || community.id}`} className="w-[260px] sm:w-[280px] flex-shrink-0 snap-start">
                      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)] border border-slate-100 dark:border-slate-800 overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(99,102,241,0.2)] group">
                        {/* Image Container */}
                        <div className="relative aspect-[4/3] bg-gradient-to-br from-violet-300/70 to-blue-300/50 dark:from-violet-900/70 dark:to-blue-900/50 overflow-hidden">
                          {community.imageUrl ? (
                            <img
                              src={community.imageUrl}
                              alt={community.name}
                              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Users className="h-16 w-16 text-white/60" />
                            </div>
                          )}
                        </div>
                        {/* Content */}
                        <div className="p-4">
                          <h3 className="text-sm font-semibold text-slate-900 line-clamp-2 mb-1">{community.name}</h3>
                          <p className="text-xs text-slate-500">
                            {community.memberCount > 0 ? `${community.memberCount} ${community.memberCount === 1 ? 'Member' : 'Members'}` : 'No Members'}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-12 text-center">
                <div className="w-14 h-14 bg-violet-50 dark:bg-violet-950 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Users className="h-7 w-7 text-violet-500 dark:text-violet-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">No Groups Yet</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Create your first group</p>
              </div>
            )}
          </section>

          {/* Joined Communities - Horizontal with Controls */}
          <section className="bg-white/70 dark:bg-slate-900/70 backdrop-blur rounded-3xl p-6 border border-slate-200/60 dark:border-slate-800/60 shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)]">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Joined Groups</h2>
                <span className="px-2.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300 text-xs font-medium">
                  {joinedCommunities.length}
                </span>
              </div>
              {joinedCommunities.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    className="h-9 w-9 flex items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-violet-600 dark:hover:text-violet-400 hover:border-violet-300 dark:hover:border-violet-600 hover:shadow-sm transition-all active:scale-95"
                    onClick={() => {
                      const el = document.getElementById('joinedScroller');
                      if (el) el.scrollBy({ left: -360, behavior: 'smooth' });
                    }}
                    aria-label="Scroll left"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    className="h-9 w-9 flex items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-violet-600 dark:hover:text-violet-400 hover:border-violet-300 dark:hover:border-violet-600 hover:shadow-sm transition-all active:scale-95"
                    onClick={() => {
                      const el = document.getElementById('joinedScroller');
                      if (el) el.scrollBy({ left: 360, behavior: 'smooth' });
                    }}
                    aria-label="Scroll right"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              )}
            </div>
            {joinedCommunities.length > 0 ? (
              <div id="joinedScroller" className="overflow-x-auto hide-scrollbar pb-2 scroll-smooth">
                <div className="flex gap-6 snap-x snap-mandatory">
                  {joinedCommunities.map((community: any) => (
                    <Link key={community.id} href={`/groups/${community.slug || community.id}`} className="w-[260px] sm:w-[280px] flex-shrink-0 snap-start">
                      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)] border border-slate-100 dark:border-slate-800 overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(99,102,241,0.2)] group">
                        {/* Image Container */}
                        <div className="relative aspect-[4/3] bg-gradient-to-br from-violet-300/70 to-blue-300/50 dark:from-violet-900/70 dark:to-blue-900/50 overflow-hidden">
                          {community.imageUrl ? (
                            <img
                              src={community.imageUrl}
                              alt={community.name}
                              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Users className="h-16 w-16 text-white/60" />
                            </div>
                          )}
                        </div>
                        {/* Content */}
                        <div className="p-4">
                          <h3 className="text-sm font-semibold text-slate-900 dark:text-white line-clamp-2 mb-1">{community.name}</h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {community.memberCount > 0 ? `${community.memberCount} ${community.memberCount === 1 ? 'Member' : 'Members'}` : 'No Members'}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-12 text-center">
                <div className="w-14 h-14 bg-violet-50 dark:bg-violet-950 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Users className="h-7 w-7 text-violet-500 dark:text-violet-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">No Joined Communities</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">You haven't joined any communities yet.</p>
              </div>
            )}
          </section>

          {/* Discover Groups */}
          <section className="bg-white/70 dark:bg-slate-900/70 backdrop-blur rounded-3xl p-6 border border-slate-200/60 dark:border-slate-800/60 shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)]">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Discover Groups</h2>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
                  <Input
                    placeholder="Search groups..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-violet-300 dark:focus:border-violet-600"
                  />
                </div>
                
                <div className="flex gap-2">
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-48 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value} className="text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700">
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-40 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                      <SortAsc className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                      <SelectItem value="name" className="text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700">A-Z</SelectItem>
                      <SelectItem value="newest" className="text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700">Newest</SelectItem>
                      <SelectItem value="oldest" className="text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700">Oldest</SelectItem>
                      <SelectItem value="members" className="text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700">Most Members</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            {publicLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mt-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="animate-pulse rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-5 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-800" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-40 bg-slate-200 dark:bg-slate-800 rounded" />
                        <div className="h-3 w-24 bg-slate-100 dark:bg-slate-700 rounded" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredPublicCommunities.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mt-6">
                {filteredPublicCommunities.map((community: any) => (
                  <DiscoverCommunityCard key={community.id} community={community} />
                ))}
              </div>
            ) : (
              <div className="py-12 text-center mt-6">
                <div className="w-14 h-14 bg-violet-50 dark:bg-violet-950 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Search className="h-7 w-7 text-violet-500 dark:text-violet-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
                  {searchTerm ? "No communities found" : "No new communities"}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  {searchTerm 
                    ? `No communities match "${searchTerm}". Try a different search term.`
                    : "All public communities are already in your list."
                  }
                </p>
              </div>
            )}
          </section>
        </main>
        <MobileNav />

        {/* Join with Code Dialog */}
        <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
          <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
            <DialogHeader>
              <DialogTitle className="text-xl dark:text-white">Join with Invite Code</DialogTitle>
              <DialogDescription className="text-slate-600 dark:text-slate-400">
                Enter the invite code you received to join a private group.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-2">
                  Invite Code
                </label>
                <Input
                  placeholder="Enter 8-character code..."
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 font-mono tracking-wider text-center text-lg"
                  maxLength={8}
                />
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowJoinDialog(false);
                    setInviteCode("");
                  }}
                  className="flex-1 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  disabled={joinByCodeMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => joinByCodeMutation.mutate(inviteCode)}
                  disabled={joinByCodeMutation.isPending || inviteCode.length < 8}
                  className="flex-1 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white"
                >
                  {joinByCodeMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Joining...
                    </>
                  ) : (
                    "Join Group"
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
    </div>
  );
}

// Helper function to get logo URL from group
const getGroupLogoUrl = (group: any) => {
  if (group.imageUrl) return group.imageUrl;
  if (group.logoUrl) return group.logoUrl;
  return null;
};

// Component for discover community cards with join functionality
const DiscoverCommunityCard = React.memo(function DiscoverCommunityCard({ community }: { community: any }) {
  const [isJoining, setIsJoining] = useState(false);
  const [showJoinRequestDialog, setShowJoinRequestDialog] = useState(false);
  const [joinRequestMessage, setJoinRequestMessage] = useState("");

  const handleJoin = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // If private community, show join request dialog
    if (!community.isPublic) {
      setShowJoinRequestDialog(true);
      return;
    }

    // For public communities, join directly
    setIsJoining(true);
    try {
      const res = await fetch(`/api/groups/${community.id}/join`, {
        method: 'POST',
        credentials: 'include'
      });
      
      if (!res.ok) throw new Error('Failed to join group');
      
      // Reload the page to refresh the communities lists
      window.location.reload();
    } catch (error) {
      console.error('Failed to join group:', error);
      alert('Failed to join group. Please try again.');
    } finally {
      setIsJoining(false);
    }
  };

  const handleJoinRequest = async () => {
    setIsJoining(true);
    try {
      const res = await fetch(`/api/groups/${community.id}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          message: joinRequestMessage.trim() || null
        })
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to send join request');
      }

      const result = await res.json();
      
      if (result.type === 'request_created') {
        alert('Join request sent! You will be notified when an admin reviews your request.');
        setShowJoinRequestDialog(false);
        setJoinRequestMessage("");
      } else if (result.type === 'joined') {
        alert('Successfully joined the community!');
        window.location.reload();
      }
    } catch (error: any) {
      console.error('Failed to send join request:', error);
      alert(error.message || 'Failed to send join request. Please try again.');
    } finally {
      setIsJoining(false);
    }
  };

  const logoUrl = getGroupLogoUrl(community);

  return (
    <>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)] border border-slate-100 dark:border-slate-800 overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(99,102,241,0.2)] group">
        {/* Logo Container */}
        <div className="relative aspect-[4/3] bg-gradient-to-br from-violet-300/70 to-blue-300/50 dark:from-violet-900/70 dark:to-blue-900/50 overflow-hidden">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={community.name}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Users className="h-12 w-12 text-white/60" />
            </div>
          )}
        </div>
        {/* Content */}
        <div className="p-4">
          <div className="space-y-3">
            <div>
              <div className="min-w-0">
                <Link href={`/groups/${community.slug || community.id}`}>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white line-clamp-2 hover:text-violet-600 dark:hover:text-violet-400 transition">{community.name}</p>
                </Link>
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
                  <span>{community.memberCount} Members</span>
                  <span>•</span>
                  <span className={`px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                    community.isPublic 
                      ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400' 
                      : 'bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-400'
                  }`}>
                    {community.isPublic ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                    {community.isPublic ? 'Public' : 'Private'}
                  </span>
                </div>
              </div>
            </div>
            
            {community.description && (
              <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                {community.description}
              </p>
            )}
            
            <Button
              size="sm"
              onClick={handleJoin}
              disabled={isJoining}
              className={`w-full text-xs ${
                community.isPublic 
                  ? 'bg-violet-100 dark:bg-violet-950 hover:bg-violet-200 dark:hover:bg-violet-900 border border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-400'
                  : 'bg-orange-100 dark:bg-orange-950 hover:bg-orange-200 dark:hover:bg-orange-900 border border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-400'
              }`}
            >
              {isJoining 
                ? "Processing..." 
                : community.isPublic 
                  ? "Join Community" 
                  : "Request to Join"
              }
            </Button>
          </div>
        </div>
      </div>
      
      <Dialog open={showJoinRequestDialog} onOpenChange={setShowJoinRequestDialog}>
        <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white flex items-center gap-2">
              <Lock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              Request to Join {community.name}
            </DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-400">
              This is a private community. Your request will be reviewed by the community administrators.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-2">
                Message (Optional)
              </label>
              <Textarea
                placeholder="Tell the admins why you'd like to join this group..."
                value={joinRequestMessage}
                onChange={(e) => setJoinRequestMessage(e.target.value)}
                className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                rows={3}
              />
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowJoinRequestDialog(false)}
                className="flex-1 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                disabled={isJoining}
              >
                Cancel
              </Button>
              <Button
                onClick={handleJoinRequest}
                disabled={isJoining}
                className="flex-1 bg-orange-100 dark:bg-orange-950 hover:bg-orange-200 dark:hover:bg-orange-900 border border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-400"
              >
                {isJoining ? "Sending..." : "Send Request"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
});

