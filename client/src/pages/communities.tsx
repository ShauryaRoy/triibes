import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Plus, Search, Filter, SortAsc } from "lucide-react";
import { Link } from "wouter";
import Header from "@/components/layout/header";
import MobileNav from "@/components/layout/mobile-nav";
import { ThemeBackground } from "@/components/theme-background";
import { getThemeById } from "@shared/themes";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export default function Communities() {
  const theme = getThemeById('quantum-dark');
  const { user, isLoading: authLoading } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("name");

  const categories = [
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
  
  // Fetch communities for the authenticated user (memberships), not public list
  const { data: myCommunities = [], isLoading: myLoading, error: myError } = useQuery({
    queryKey: ["/api/profile/communities"],
    enabled: !!user, // only when logged in
    queryFn: async () => {
      const res = await fetch("/api/profile/communities", { credentials: "include" });
      if (res.status === 401) return [];
      if (!res.ok) throw new Error("Failed to fetch user communities");
      return res.json();
    },
  });

  // Fetch all public communities for discovery
  const { data: publicCommunities = [], isLoading: publicLoading } = useQuery({
    queryKey: ["/api/communities/discovery"],
    queryFn: async () => {
      const res = await fetch("/api/communities/discovery", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch public communities");
      return res.json();
    },
  });

  // Derive owned vs joined communities for the logged-in user
  const ownedCommunities = (myCommunities || []).filter((c: any) => c.createdBy === user?.id);
  const joinedCommunities = (myCommunities || []).filter((c: any) => c.createdBy !== user?.id);

  // Filter public communities excluding user's own communities and apply search/category filters
  const userCommunityIds = (myCommunities || []).map((c: any) => c.id);
  const filteredPublicCommunities = (publicCommunities || [])
    .filter((c: any) => !userCommunityIds.includes(c.id))
    .filter((c: any) => 
      searchTerm === "" || 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.description?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .filter((c: any) => 
      selectedCategory === "all" || 
      (c.category && c.category === selectedCategory) ||
      (!c.category && selectedCategory === "general") // Default for communities without category
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

  if (authLoading || myLoading) {
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
      <ThemeBackground theme={theme} className="min-h-screen">
        <div className="absolute inset-0 bg-black/40 pointer-events-none" />
        <div className="relative z-10 min-h-screen flex flex-col">
          <Header />
          <main className="pt-28 pb-20 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 space-y-10">
            <section className="relative rounded-3xl overflow-hidden border border-white/15 backdrop-blur-xl p-6 sm:p-10 bg-gradient-to-br from-primary/25 via-primary/10 to-cyan-400/20">
              <div className="space-y-3 relative z-10">
                <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300">Communities</h1>
                <p className="text-white/70 text-sm">Loading your communities...</p>
              </div>
              <div className="pointer-events-none absolute -top-10 -right-10 w-64 h-64 bg-pink-500/20 rounded-full blur-3xl" />
              <div className="pointer-events-none absolute -bottom-10 -left-10 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl" />
            </section>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">My Communities</h2>
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
      </ThemeBackground>
    );
  }

  // If not logged in, show a minimal empty state matching the page style
  if (!user) {
    return (
      <ThemeBackground theme={theme} className="min-h-screen">
        <div className="absolute inset-0 bg-black/30 pointer-events-none" />
        <div className="relative z-10 min-h-screen flex flex-col">
          <Header />
          <main className="pt-28 pb-20 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 space-y-10">
            <section className="relative rounded-3xl overflow-hidden border border-white/15 backdrop-blur-xl p-6 sm:p-10 bg-gradient-to-br from-primary/25 via-primary/10 to-cyan-400/20">
              <div className="space-y-4">
                <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300">Communities</h1>
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
      </ThemeBackground>
    );
  }

  return (
    <ThemeBackground theme={theme} className="min-h-screen">
      <div className="absolute inset-0 bg-black/30 pointer-events-none" />
      <div className="relative z-10 min-h-screen flex flex-col">
        <Header />
        <main className="pt-28 pb-20 md:pb-14 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 space-y-12">
          {/* Hero */}
          <section className="relative rounded-3xl overflow-hidden border border-white/15 backdrop-blur-xl p-6 sm:p-10 bg-gradient-to-br from-primary/25 via-primary/10 to-cyan-400/20">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end relative z-10">
              <div className="space-y-4 flex-1">
                <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 drop-shadow">Communities</h1>
                <p className="text-white/70 max-w-2xl text-sm sm:text-base leading-relaxed">Create and manage your groups. Share events, coordinate members, and keep everyone in sync.</p>
                <div className="flex gap-3 flex-wrap pt-1">
                  <Button asChild className="brand-gradient hover:shadow-lg shadow-cyan-400/30 text-sm">
                    <Link href="/communities/create">Create Community</Link>
                  </Button>
                  <Link href="/discover"><Button variant="outline" className="border-white/30 text-white bg-white/10 hover:bg-white/20 text-sm">Discover Events</Button></Link>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
                <div className="rounded-2xl p-4 bg-white/10 backdrop-blur border border-white/20 flex flex-col">
                  <p className="text-[10px] uppercase tracking-wide text-white/50 mb-1">Mine</p>
                  <p className="text-2xl font-bold text-white">{ownedCommunities.length}</p>
                </div>
                <div className="rounded-2xl p-4 bg-white/10 backdrop-blur border border-white/20 flex flex-col">
                  <p className="text-[10px] uppercase tracking-wide text-white/50 mb-1">Joined</p>
                  <p className="text-2xl font-bold text-white">{joinedCommunities.length}</p>
                </div>
              </div>
            </div>
            <div className="pointer-events-none absolute -top-10 -right-10 w-64 h-64 bg-pink-500/20 rounded-full blur-3xl" />
            <div className="pointer-events-none absolute -bottom-10 -left-10 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl" />
          </section>

          {/* My Communities */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">My Communities</h2>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {ownedCommunities.length > 0 ? (
                ownedCommunities.map((community: any) => (
                  <Link key={community.id} href={`/communities/${community.id}`}>
                    <Card className="relative group min-w-[260px] overflow-hidden border-white/15 bg-white/10 backdrop-blur transition hover:border-white/30">
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition bg-gradient-to-br from-primary/20 via-primary/10 to-cyan-400/20" />
                      <CardContent className="p-4 relative z-10">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white/80">
                            <Users className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-white font-medium truncate">{community.name}</p>
                            <p className="text-xs text-white/60 truncate">
                              {community.memberCount > 0 ? `${community.memberCount} ${community.memberCount === 1 ? 'Member' : 'Members'}` : 'No Members'}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))
              ) : (
                <Card className="min-w-[260px] border-white/15 bg-white/10 backdrop-blur">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white/80">
                        <Users className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-white font-medium truncate">No Communities</p>
                        <p className="text-xs text-white/60 truncate">Create your first community</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </section>

          {/* Divider */}
          <div className="border-t border-white/15" />

          {/* Joined Communities */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-white">Joined Communities</h2>
            {joinedCommunities.length > 0 ? (
              <div className="flex gap-4 overflow-x-auto pb-2">
                {joinedCommunities.map((community: any) => (
                  <Link key={community.id} href={`/communities/${community.id}`}>
                    <Card className="relative group min-w-[260px] overflow-hidden border-white/15 bg-white/10 backdrop-blur transition hover:border-white/30">
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition bg-gradient-to-br from-primary/20 via-primary/10 to-cyan-400/20" />
                      <CardContent className="p-4 relative z-10">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white/80">
                            <Users className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-white font-medium truncate">{community.name}</p>
                            <p className="text-xs text-white/60 truncate">
                              {community.memberCount > 0 ? `${community.memberCount} ${community.memberCount === 1 ? 'Member' : 'Members'}` : 'No Members'}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
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

          {/* Discover Communities */}
          <section className="space-y-4">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Discover Communities</h2>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/40" />
                  <Input
                    placeholder="Search communities..."
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
                      {categories.map((cat) => (
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
      </div>
    </ThemeBackground>
  );
}

// Component for discover community cards with join functionality
function DiscoverCommunityCard({ community }: { community: any }) {
  const [isJoining, setIsJoining] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const handleJoin = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsJoining(true);
    try {
      const res = await fetch(`/api/communities/${community.id}/join`, {
        method: 'POST',
        credentials: 'include'
      });
      
      if (!res.ok) throw new Error('Failed to join community');
      
      // Reload the page to refresh the communities lists
      window.location.reload();
    } catch (error) {
      console.error('Failed to join community:', error);
      alert('Failed to join community. Please try again.');
    } finally {
      setIsJoining(false);
    }
  };

  const getCategoryLabel = (category: string) => {
    const categoryMap: { [key: string]: string } = {
      "general": "General",
      "technology": "Technology",
      "business": "Business", 
      "health": "Health & Fitness",
      "education": "Education",
      "entertainment": "Entertainment",
      "gaming": "Gaming",
      "sports": "Sports",
      "travel": "Travel",
      "food": "Food & Drink",
      "arts": "Arts & Culture",
      "science": "Science",
      "social": "Social",
      "hobbies": "Hobbies",
      "other": "Other"
    };
    return categoryMap[category] || "General";
  };

  return (
    <div 
      className="relative"
      onMouseEnter={() => setShowPreview(true)}
      onMouseLeave={() => setShowPreview(false)}
    >
      <Card className="relative group overflow-hidden border-white/15 bg-white/10 backdrop-blur transition hover:border-white/30 hover:bg-white/15">
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition bg-gradient-to-br from-primary/20 via-primary/10 to-cyan-400/20" />
        <CardContent className="p-4 relative z-10">
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="h-10 w-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white/80 flex-shrink-0">
                  <Users className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <Link href={`/communities/${community.id}`}>
                    <p className="text-white font-medium truncate hover:text-white/80 transition">{community.name}</p>
                  </Link>
                  <div className="flex items-center gap-2 text-xs text-white/60">
                    <span>{community.memberCount > 0 ? `${community.memberCount} ${community.memberCount === 1 ? 'Member' : 'Members'}` : 'No Members'}</span>
                    <span>•</span>
                    <span>{community.eventCount > 0 ? `${community.eventCount} ${community.eventCount === 1 ? 'Event' : 'Events'}` : 'No Events'}</span>
                    <span>•</span>
                    <span className="px-2 py-0.5 bg-white/10 rounded-full border border-white/20">
                      {getCategoryLabel(community.category || 'general')}
                    </span>
                  </div>
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
              className="w-full bg-primary/20 hover:bg-primary/30 border border-primary/30 text-white text-xs"
            >
              {isJoining ? "Joining..." : "Join Community"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview tooltip */}
      {showPreview && (
        <div className="absolute z-50 top-0 left-full ml-2 w-80 p-4 bg-gray-900/95 backdrop-blur border border-white/20 rounded-xl shadow-2xl">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white/80">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-white">{community.name}</h3>
                <p className="text-xs text-white/60">
                  {getCategoryLabel(community.category || 'general')} • Created {new Date(community.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            
            {community.description && (
              <p className="text-sm text-white/70 leading-relaxed">
                {community.description}
              </p>
            )}
            
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/10">
              <div className="text-center">
                <p className="text-lg font-semibold text-white">{community.memberCount || 0}</p>
                <p className="text-xs text-white/60">Members</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-white">{community.eventCount || 0}</p>
                <p className="text-xs text-white/60">Events</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}