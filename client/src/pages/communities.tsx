import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Users, Plus, Search, Filter, SortAsc, Lock, Globe, Ticket, Loader2 } from "lucide-react";
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
      <div className="animate-pulse rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-5 space-y-4 min-w-[260px]">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-white/10" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-40 bg-white/10 rounded" />
            <div className="h-3 w-24 bg-white/10 rounded" />
          </div>
        </div>
      </div>
    );

    return (
      <div className="min-h-screen bg-black overflow-x-hidden">
        <Header />
        <main className="pt-28 pb-20 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 space-y-10">
          <section className="relative rounded-3xl overflow-hidden border border-white/15 backdrop-blur-xl p-6 sm:p-10 bg-gradient-to-br from-primary/25 via-primary/10 to-cyan-400/20">
            <div className="space-y-3 relative z-10">
              <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300">Groups</h1>
              <p className="text-white/70 text-sm">Loading your groups...</p>
            </div>
            <div className="pointer-events-none absolute -top-10 -right-10 w-64 h-64 bg-pink-500/20 rounded-full blur-3xl" />
            <div className="pointer-events-none absolute -bottom-10 -left-10 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl" />
          </section>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">My Groups</h2>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
              <div className="animate-pulse min-w-[140px] h-12 rounded-xl border border-white/10 bg-white/5" />
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
      <div className="min-h-screen bg-black overflow-x-hidden">
        <Header />
        <main className="pt-28 pb-20 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 space-y-10">
          <section className="relative rounded-3xl overflow-hidden border border-white/15 backdrop-blur-xl p-6 sm:p-10 bg-gradient-to-br from-primary/25 via-primary/10 to-cyan-400/20">
            <div className="space-y-4">
              <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300">Groups</h1>
              <p className="text-white/70 text-sm">Sign in to see your communities.</p>
              <Button asChild className="brand-gradient w-fit">
                <Link href="/profile">Go to Profile</Link>
              </Button>
            </div>
            <div className="absolute -top-10 -right-10 w-64 h-64 bg-pink-500/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl" />
          </section>
        </main>
        <MobileNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black overflow-x-hidden">
      <Header />
      
      {/* Hero - Full Width Gradient Section */}
      <section className="relative pt-20 w-full overflow-hidden">
        <div className="absolute inset-0 top-0 hero-animated-gradient" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black to-transparent pointer-events-none" />
        <div className="relative z-10 px-4 sm:px-6 lg:px-24 py-12 sm:py-24 lg:py-36">
          <div className="flex flex-col gap-6">
            <div className="flex-1 space-y-3">
              <h1 className="text-3xl sm:text-5xl font-bold text-white">Groups</h1>
              <p className="text-white/70 max-w-2xl text-sm sm:text-base leading-relaxed">Create and manage your groups. Share events, coordinate members, and keep everyone in sync.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button 
                onClick={() => setShowJoinDialog(true)}
                size="lg" 
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10 flex-1 sm:flex-none"
              >
                <Ticket className="h-4 w-4 mr-2" />
                Join with Code
              </Button>
              <Button asChild size="lg" className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white shadow-lg shadow-violet-500/20 flex-1 sm:flex-none">
                <Link href="/groups/create">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Group
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <main className="pb-24 md:pb-12 w-full px-4 sm:px-6 lg:px-24 space-y-8 sm:space-y-12 mt-4 sm:mt-8">
        {/* My Communities - Horizontal with Controls */}
        <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">My Groups</h2>
              {ownedCommunities.length > 0 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="border-white/20 text-white/80 hover:text-white hover:bg-white/10"
                    onClick={() => {
                      const el = document.getElementById('ownedScroller');
                      if (el) el.scrollBy({ left: -Math.max(300, el.clientWidth * 0.8), behavior: 'smooth' });
                    }}
                    aria-label="Scroll left"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><path d="m15 18-6-6 6-6"/></svg>
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="border-white/20 text-white/80 hover:text-white hover:bg-white/10"
                    onClick={() => {
                      const el = document.getElementById('ownedScroller');
                      if (el) el.scrollBy({ left: Math.max(300, el.clientWidth * 0.8), behavior: 'smooth' });
                    }}
                    aria-label="Scroll right"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><path d="m9 18 6-6-6-6"/></svg>
                  </Button>
                </div>
              )}
            </div>
            {ownedCommunities.length > 0 ? (
              <div id="ownedScroller" className="overflow-x-auto hide-scrollbar -mx-4 sm:-mx-6 lg:-mx-24 pb-2 scroll-smooth">
                <div className="px-4 sm:px-6 lg:px-24 inline-flex gap-4 md:gap-6 snap-x snap-mandatory">
                  {ownedCommunities.map((community: any) => (
                    <Link key={community.id} href={`/groups/${community.slug || community.id}`} className="min-w-[260px] sm:min-w-[300px] lg:min-w-[340px] snap-start">
                      <Card className="relative group overflow-hidden border-white/15 bg-white/10 backdrop-blur transition hover:border-white/30 h-full">
                        {/* Image Container */}
                        <div className="relative aspect-square w-full bg-gradient-to-br from-indigo-500/30 to-blue-600/30 overflow-hidden">
                          {community.imageUrl ? (
                            <LazyImage
                              src={community.imageUrl}
                              alt={community.name}
                              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Users className="h-16 w-16 text-white/40" />
                            </div>
                          )}
                        </div>
                        {/* Content */}
                        <CardContent className="p-3">
                          <p className="text-white font-medium line-clamp-2 text-sm">{community.name}</p>
                          <p className="text-xs text-white/60 mt-1">
                            {community.memberCount > 0 ? `${community.memberCount} ${community.memberCount === 1 ? 'Member' : 'Members'}` : 'No Members'}
                          </p>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <Card className="min-w-[260px] border-white/15 bg-white/10 backdrop-blur">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white/80">
                      <Users className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-white font-medium truncate">No Groups</p>
                      <p className="text-xs text-white/60 truncate">Create your first group</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </section>

          {/* Divider */}
          <div className="border-t border-white/15" />

          {/* Joined Communities - Horizontal with Controls */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Joined Groups</h2>
              {joinedCommunities.length > 0 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="border-white/20 text-white/80 hover:text-white hover:bg-white/10"
                    onClick={() => {
                      const el = document.getElementById('joinedScroller');
                      if (el) el.scrollBy({ left: -Math.max(300, el.clientWidth * 0.8), behavior: 'smooth' });
                    }}
                    aria-label="Scroll left"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><path d="m15 18-6-6 6-6"/></svg>
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="border-white/20 text-white/80 hover:text-white hover:bg-white/10"
                    onClick={() => {
                      const el = document.getElementById('joinedScroller');
                      if (el) el.scrollBy({ left: Math.max(300, el.clientWidth * 0.8), behavior: 'smooth' });
                    }}
                    aria-label="Scroll right"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><path d="m9 18 6-6-6-6"/></svg>
                  </Button>
                </div>
              )}
            </div>
            {joinedCommunities.length > 0 ? (
              <div id="joinedScroller" className="overflow-x-auto hide-scrollbar -mx-4 sm:-mx-6 lg:-mx-24 pb-2 scroll-smooth">
                <div className="px-4 sm:px-6 lg:px-24 inline-flex gap-4 md:gap-6 snap-x snap-mandatory">
                  {joinedCommunities.map((community: any) => (
                    <Link key={community.id} href={`/groups/${community.slug || community.id}`} className="min-w-[260px] sm:min-w-[300px] lg:min-w-[340px] snap-start">
                      <Card className="relative group overflow-hidden border-white/15 bg-white/10 backdrop-blur transition hover:border-white/30 h-full">
                        {/* Image Container */}
                        <div className="relative aspect-square w-full bg-gradient-to-br from-indigo-500/30 to-blue-600/30 overflow-hidden">
                          {community.imageUrl ? (
                            <LazyImage
                              src={community.imageUrl}
                              alt={community.name}
                              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Users className="h-16 w-16 text-white/40" />
                            </div>
                          )}
                        </div>
                        {/* Content */}
                        <CardContent className="p-3">
                          <p className="text-white font-medium line-clamp-2 text-sm">{community.name}</p>
                          <p className="text-xs text-white/60 mt-1">
                            {community.memberCount > 0 ? `${community.memberCount} ${community.memberCount === 1 ? 'Member' : 'Members'}` : 'No Members'}
                          </p>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <Card className="bg-white/10 border-white/15 backdrop-blur">
                <CardContent className="p-10 text-center space-y-3">
                  <div className="mx-auto h-14 w-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
                    <Users className="h-7 w-7 text-white/70" />
                  </div>
                  <h3 className="text-xl font-semibold text-white">No Joined Communities</h3>
                  <p className="text-sm text-white/60 max-w-md mx-auto">You haven't joined any communities yet.</p>
                </CardContent>
              </Card>
            )}
          </section>

          {/* Divider */}
          <div className="border-t border-white/15" />

          {/* Discover Groups */}
          <section className="space-y-4">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Discover Groups</h2>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/40" />
                  <Input
                    placeholder="Search groups..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-white/40"
                  />
                </div>
                
                <div className="flex gap-2">
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-48 bg-white/10 border-white/20 text-white">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-white/20">
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value} className="text-white hover:bg-white/10">
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-40 bg-white/10 border-white/20 text-white">
                      <SortAsc className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-white/20">
                      <SelectItem value="name" className="text-white hover:bg-white/10">A-Z</SelectItem>
                      <SelectItem value="newest" className="text-white hover:bg-white/10">Newest</SelectItem>
                      <SelectItem value="oldest" className="text-white hover:bg-white/10">Oldest</SelectItem>
                      <SelectItem value="members" className="text-white hover:bg-white/10">Most Members</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            {publicLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="animate-pulse rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-5 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-white/10" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-40 bg-white/10 rounded" />
                        <div className="h-3 w-24 bg-white/10 rounded" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredPublicCommunities.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {filteredPublicCommunities.map((community: any) => (
                  <DiscoverCommunityCard key={community.id} community={community} />
                ))}
              </div>
            ) : (
              <Card className="bg-white/10 border-white/15 backdrop-blur">
                <CardContent className="p-10 text-center space-y-3">
                  <div className="mx-auto h-14 w-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
                    <Search className="h-7 w-7 text-white/70" />
                  </div>
                  <h3 className="text-xl font-semibold text-white">
                    {searchTerm ? "No communities found" : "No new communities"}
                  </h3>
                  <p className="text-sm text-white/60 max-w-md mx-auto">
                    {searchTerm 
                      ? `No communities match "${searchTerm}". Try a different search term.`
                      : "All public communities are already in your list."
                    }
                  </p>
                </CardContent>
              </Card>
            )}
          </section>
        </main>
        <MobileNav />

        {/* Join with Code Dialog */}
        <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
          <DialogContent className="bg-gray-900 border-white/20 text-white">
            <DialogHeader>
              <DialogTitle className="text-xl">Join with Invite Code</DialogTitle>
              <DialogDescription className="text-white/60">
                Enter the invite code you received to join a private group.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-white/80 block mb-2">
                  Invite Code
                </label>
                <Input
                  placeholder="Enter 8-character code..."
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50 font-mono tracking-wider text-center text-lg"
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
                  className="flex-1 border-white/20 text-white hover:bg-white/10"
                  disabled={joinByCodeMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => joinByCodeMutation.mutate(inviteCode)}
                  disabled={joinByCodeMutation.isPending || inviteCode.length < 8}
                  className="flex-1 brand-gradient"
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
      <Card className="relative group overflow-hidden border-white/15 bg-white/10 backdrop-blur transition hover:border-white/30">
        {/* Logo Container */}
        <div className="relative aspect-square w-full bg-gradient-to-br from-indigo-500/30 to-blue-600/30 overflow-hidden">
          {logoUrl ? (
            <LazyImage
              src={logoUrl}
              alt={community.name}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Users className="h-16 w-16 text-white/40" />
            </div>
          )}
        </div>
        {/* Content */}
        <CardContent className="p-3">
          <div className="space-y-3">
            <div>
              <div className="min-w-0">
                <Link href={`/groups/${community.slug || community.id}`}>
                  <p className="text-white font-medium line-clamp-2 text-sm hover:text-white/80 transition">{community.name}</p>
                </Link>
                <div className="flex items-center gap-2 text-xs text-white/60 mt-1">
                  <span>{community.memberCount} Members</span>
                  <span>•</span>
                  <span className={`px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                    community.isPublic 
                      ? 'bg-green-500/20 border-green-500/30 text-green-300' 
                      : 'bg-orange-500/20 border-orange-500/30 text-orange-300'
                  }`}>
                    {community.isPublic ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                    {community.isPublic ? 'Public' : 'Private'}
                  </span>
                </div>
              </div>
            </div>
            
            {community.description && (
              <p className="text-xs text-white/60 line-clamp-2 leading-relaxed">
                {community.description}
              </p>
            )}
            
            <Button
              size="sm"
              onClick={handleJoin}
              disabled={isJoining}
              className={`w-full text-xs ${
                community.isPublic 
                  ? 'bg-primary/20 hover:bg-primary/30 border border-primary/30 text-white'
                  : 'bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/30 text-orange-100'
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
        </CardContent>
      </Card>
      
      <Dialog open={showJoinRequestDialog} onOpenChange={setShowJoinRequestDialog}>
        <DialogContent className="bg-gray-900 border-white/20">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Lock className="h-5 w-5 text-orange-500" />
              Request to Join {community.name}
            </DialogTitle>
            <DialogDescription className="text-white/70">
              This is a private community. Your request will be reviewed by the community administrators.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-white/80 block mb-2">
                Message (Optional)
              </label>
              <Textarea
                placeholder="Tell the admins why you'd like to join this group..."
                value={joinRequestMessage}
                onChange={(e) => setJoinRequestMessage(e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                rows={3}
              />
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowJoinRequestDialog(false)}
                className="flex-1 border-white/20 text-white hover:bg-white/10"
                disabled={isJoining}
              >
                Cancel
              </Button>
              <Button
                onClick={handleJoinRequest}
                disabled={isJoining}
                className="flex-1 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/30 text-orange-100"
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

