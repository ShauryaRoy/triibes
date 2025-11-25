import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { 
  Calendar, 
  MapPin, 
  Users, 
  Settings, 
  Camera, 
  Edit3, 
  Save,
  X,
  Mail,
  Clock,
  TrendingUp,
  Heart,
  Plus,
  Search,
  Globe,
  Lock
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import Header from "@/components/layout/header";
import MobileNav from "@/components/layout/mobile-nav";
import EventCard from "@/components/event-card";
import { SimpleBackground } from "@/components/simple-background";

interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  profileImageUrl?: string;
  bio?: string;
  location?: string;
  website?: string;
  createdAt: string;
  updatedAt: string;
}

interface UserStats {
  eventsHosted: number;
  eventsAttended: number;
  totalRsvps: number;
  upcomingEvents: number;
}

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("hosted");
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    bio: "",
    location: ""
  });
  const [isCreatingCommunity, setIsCreatingCommunity] = useState(false);
  const [communityForm, setCommunityForm] = useState({
    name: "",
    description: "",
    isPublic: true
  });

  // Memoize tap highlight style to prevent object creation on every render
  const tapHighlightStyle = useMemo(() => ({ WebkitTapHighlightColor: 'transparent' }), []);

  // Fetch user profile data
  const { data: profile, isLoading: profileLoading } = useQuery<UserProfile>({
    queryKey: ["/api/profile"],
    queryFn: async () => {
      const response = await fetch("/api/profile", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch profile");
      return response.json();
    },
    enabled: !!user,
  });

  // Fetch user statistics
  const { data: stats, isLoading: statsLoading } = useQuery<UserStats>({
    queryKey: ["/api/profile/stats"],
    queryFn: async () => {
      const response = await fetch("/api/profile/stats", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch stats");
      return response.json();
    },
    enabled: !!user,
  });

  // Fetch user's events
  const { data: userEvents, isLoading: eventsLoading } = useQuery<any[]>({
    queryKey: ["/api/profile/events"],
    queryFn: async () => {
      const response = await fetch("/api/profile/events", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch events");
      return response.json();
    },
    enabled: !!user,
  });

  // Fetch user's communities
  const { data: userCommunities, isLoading: communitiesLoading } = useQuery<any[]>({
    queryKey: ["/api/profile/groups"],
    queryFn: async () => {
      const response = await fetch("/api/profile/groups", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch communities");
      return response.json();
    },
    enabled: !!user,
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: Partial<UserProfile>) => {
      const response = await apiRequest("PUT", "/api/profile", data);
      if (!response.ok) throw new Error("Failed to update profile");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      setIsEditing(false);
      toast({
        title: "Profile updated!",
        description: "Your profile has been successfully updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  // Create community mutation
  const createCommunityMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; isPublic: boolean }) => {
      const response = await apiRequest("POST", "/api/groups", data);
      if (!response.ok) throw new Error("Failed to create community");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile/groups"] });
      setIsCreatingCommunity(false);
      setCommunityForm({ name: "", description: "", isPublic: true });
      toast({
        title: "Community created!",
        description: "Your community has been successfully created.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create community",
        variant: "destructive",
      });
    },
  });

  // Initialize edit form when profile loads
  useEffect(() => {
    if (profile) {
      setEditForm({
        firstName: profile.firstName || "",
        lastName: profile.lastName || "",
        bio: profile.bio || "",
        location: profile.location || ""
      });
    }
  }, [profile]);

  const handleSaveProfile = () => {
    updateProfileMutation.mutate(editForm);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    if (profile) {
      setEditForm({
        firstName: profile.firstName || "",
        lastName: profile.lastName || "",
        bio: profile.bio || "",
        location: profile.location || ""
      });
    }
  };

  if (!user) {
    // Redirect to home page (which will show sign-in options)
    setLocation('/');
    return null;
  }

  if (profileLoading) {
    return (
      <SimpleBackground className="min-h-screen">
        <div className="relative z-10">
          <Header />
          <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </SimpleBackground>
    );
  }

  return (
    <SimpleBackground className="min-h-screen">
      {/* Full page overlay for content readability */}
      <div className="absolute inset-0 bg-black/30" />
      
      {/* Page content */}
      <div className="relative z-10">
        <Header />
        
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-28 pb-24 md:pb-14 space-y-8 sm:space-y-12">
          {/* Profile Header */}
          <section className="relative rounded-3xl overflow-hidden border border-white/15 backdrop-blur-xl p-6 sm:p-10 bg-gradient-to-br from-primary/25 via-primary/10 to-cyan-400/20">
            <div className="flex flex-col lg:flex-row gap-8 lg:items-start">
              {/* Avatar and Basic Info */}
              <div className="flex flex-col items-center lg:items-start space-y-6">
                <div className="relative">
                  <Avatar className="w-24 h-24 sm:w-32 sm:h-32 border-4 border-white/20 shadow-2xl">
                    <AvatarImage src={profile?.profileImageUrl || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-cyan-400 text-white text-2xl sm:text-3xl font-bold">
                      {profile?.firstName?.[0]}{profile?.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    size="sm"
                    variant="outline"
                    className="absolute bottom-0 right-0 rounded-full h-8 w-8 sm:h-10 sm:w-10 p-0 border-white/30 bg-white/10 hover:bg-white/20 backdrop-blur"
                  >
                    <Camera className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                </div>
                
                <div className="text-center lg:text-left space-y-2">
                  <h1 className="text-3xl sm:text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-cyan-200 drop-shadow">
                    {profile?.firstName} {profile?.lastName}
                  </h1>
                  <p className="text-white/70 flex items-center gap-2 justify-center lg:justify-start text-sm">
                    <Mail className="h-4 w-4" />
                    {profile?.email}
                  </p>
                  <p className="text-white/50 text-xs flex items-center gap-2 justify-center lg:justify-start">
                    <Clock className="h-4 w-4" />
                    Joined {new Date(profile?.createdAt || '').toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric"
                    })}
                  </p>
                </div>
              </div>

              {/* Profile Details and Actions */}
              <div className="flex-1 space-y-6">
                {!isEditing ? (
                  <>
                    {/* Bio and Details */}
                    <div className="space-y-4">
                      {profile?.bio && (
                        <div>
                          <h3 className="text-lg font-semibold text-white mb-2">About</h3>
                          <p className="text-white/80">{profile.bio}</p>
                        </div>
                      )}
                      
                      <div className="flex flex-wrap gap-4">
                        {profile?.location && (
                          <div className="flex items-center gap-2 text-white/70">
                            <MapPin className="h-4 w-4" />
                            <span>{profile.location}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 flex-wrap relative z-20">
                      <Button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('Edit Profile button clicked');
                          setIsEditing(true);
                        }}
                        onTouchStart={(e) => {
                          console.log('Edit Profile button touched');
                        }}
                        className="brand-gradient text-white min-h-[44px] px-6 py-3 touch-manipulation mobile-button cursor-pointer relative z-20"
                        type="button"
                        style={tapHighlightStyle}
                      >
                        <Edit3 className="h-4 w-4 mr-2" />
                        Edit Profile
                      </Button>
                      <Button
                        variant="outline"
                        className="border-white/30 text-white bg-white/10 hover:bg-white/20 min-h-[44px] px-6 py-3 mobile-button relative z-20"
                        type="button"
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Settings
                      </Button>
                    </div>
                  </>
                ) : (
                  // Edit Form
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName" className="text-white">First Name</Label>
                        <Input
                          id="firstName"
                          value={editForm.firstName}
                          onChange={(e) => setEditForm({...editForm, firstName: e.target.value})}
                          className="bg-white/10 border-white/20 text-white focus:bg-white/15"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName" className="text-white">Last Name</Label>
                        <Input
                          id="lastName"
                          value={editForm.lastName}
                          onChange={(e) => setEditForm({...editForm, lastName: e.target.value})}
                          className="bg-white/10 border-white/20 text-white focus:bg-white/15"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="bio" className="text-white">Bio</Label>
                      <Textarea
                        id="bio"
                        value={editForm.bio}
                        onChange={(e) => setEditForm({...editForm, bio: e.target.value})}
                        placeholder="Tell us about yourself..."
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:bg-white/15"
                        rows={3}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="location" className="text-white">Location</Label>
                      <Input
                        id="location"
                        value={editForm.location}
                        onChange={(e) => setEditForm({...editForm, location: e.target.value})}
                        placeholder="City, Country"
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:bg-white/15"
                      />
                    </div>

                    <div className="flex gap-3 flex-wrap relative z-20">
                      <Button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleSaveProfile();
                        }}
                        disabled={updateProfileMutation.isPending}
                        className="brand-gradient text-white min-h-[44px] px-6 py-3 touch-manipulation mobile-button cursor-pointer relative z-20"
                        type="button"
                        style={tapHighlightStyle}
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                      </Button>
                      <Button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleCancelEdit();
                        }}
                        variant="outline"
                        className="border-white/30 text-white bg-white/10 hover:bg-white/20 min-h-[44px] px-6 py-3 touch-manipulation mobile-button cursor-pointer relative z-20"
                        type="button"
                        style={tapHighlightStyle}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Background decorative elements */}
            <div className="absolute -top-10 -right-10 w-64 h-64 bg-cyan-400/20 rounded-full blur-3xl -z-10" />
            <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-primary/20 rounded-full blur-3xl -z-10" />
          </section>

          {/* Stats Cards */}
          {!statsLoading && stats && (
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="group relative overflow-hidden border-white/15 bg-white/10 backdrop-blur transition hover:border-white/30">
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition bg-gradient-to-br from-primary/20 via-primary/10 to-cyan-400/20" />
                <CardContent className="p-6 relative z-10">
                  <div className="flex flex-col items-center text-center space-y-2">
                    <Calendar className="h-8 w-8 text-cyan-400" />
                    <div>
                      <p className="text-3xl font-bold text-white">{stats.eventsHosted}</p>
                      <p className="text-white/60 text-xs">Events Hosted</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="group relative overflow-hidden border-white/15 bg-white/10 backdrop-blur transition hover:border-white/30">
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition bg-gradient-to-br from-primary/20 via-primary/10 to-cyan-400/20" />
                <CardContent className="p-6 relative z-10">
                  <div className="flex flex-col items-center text-center space-y-2">
                    <Users className="h-8 w-8 text-primary" />
                    <div>
                      <p className="text-3xl font-bold text-white">{stats.eventsAttended}</p>
                      <p className="text-white/60 text-xs">Events Attended</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="group relative overflow-hidden border-white/15 bg-white/10 backdrop-blur transition hover:border-white/30">
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition bg-gradient-to-br from-primary/20 via-primary/10 to-cyan-400/20" />
                <CardContent className="p-6 relative z-10">
                  <div className="flex flex-col items-center text-center space-y-2">
                    <Heart className="h-8 w-8 text-pink-400" />
                    <div>
                      <p className="text-3xl font-bold text-white">{stats.totalRsvps}</p>
                      <p className="text-white/60 text-xs">Total RSVPs</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="group relative overflow-hidden border-white/15 bg-white/10 backdrop-blur transition hover:border-white/30">
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition bg-gradient-to-br from-primary/20 via-primary/10 to-cyan-400/20" />
                <CardContent className="p-6 relative z-10">
                  <div className="flex flex-col items-center text-center space-y-2">
                    <TrendingUp className="h-8 w-8 text-yellow-400" />
                    <div>
                      <p className="text-3xl font-bold text-white">{stats.upcomingEvents}</p>
                      <p className="text-white/60 text-xs">Upcoming</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>
          )}

          {/* Content Tabs */}
          <section className="relative rounded-2xl overflow-hidden border border-white/15 bg-white/10 backdrop-blur-xl p-6 sm:p-8">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3 bg-white/10 border border-white/20 rounded-lg">
                <TabsTrigger 
                  value="hosted" 
                  className="text-white data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-cyan-400 data-[state=active]:text-white rounded-md transition"
                >
                  Hosted Events
                </TabsTrigger>
                <TabsTrigger 
                  value="attending" 
                  className="text-white data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-cyan-400 data-[state=active]:text-white rounded-md transition"
                >
                  Attending
                </TabsTrigger>
                <TabsTrigger 
                  value="communities" 
                  className="text-white data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-cyan-400 data-[state=active]:text-white rounded-md transition"
                >
                  Communities
                </TabsTrigger>
              </TabsList>

              <TabsContent value="hosted" className="mt-8">
                {eventsLoading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent mx-auto"></div>
                    <p className="text-white/60 text-sm mt-4">Loading events...</p>
                  </div>
                ) : userEvents && userEvents.filter(event => event.hostId === user.id).length > 0 ? (
                  <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {userEvents.filter(event => event.hostId === user.id).map((event) => (
                      <EventCard key={event.id} event={event} showManageOptions={true} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16 space-y-4">
                    <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-r from-primary/20 to-cyan-400/20 flex items-center justify-center">
                      <Calendar className="h-10 w-10 text-white/60" />
                    </div>
                    <h3 className="text-xl font-semibold text-white">No hosted events yet</h3>
                    <p className="text-white/60 max-w-sm mx-auto">Start creating amazing events for your friends and community.</p>
                    <Button asChild className="brand-gradient text-white mt-4">
                      <Link href="/create-event">
                        <Plus className="h-4 w-4 mr-2" />
                        Create Your First Event
                      </Link>
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="attending" className="mt-8">
                {eventsLoading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent mx-auto"></div>
                    <p className="text-white/60 text-sm mt-4">Loading events...</p>
                  </div>
                ) : userEvents && userEvents.filter(event => event.hostId !== user.id).length > 0 ? (
                  <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {userEvents.filter(event => event.hostId !== user.id).map((event) => (
                      <EventCard key={event.id} event={event} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16 space-y-4">
                    <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-r from-primary/20 to-cyan-400/20 flex items-center justify-center">
                      <Users className="h-10 w-10 text-white/60" />
                    </div>
                    <h3 className="text-xl font-semibold text-white">No events joined yet</h3>
                    <p className="text-white/60 max-w-sm mx-auto">Discover and join exciting events happening around you.</p>
                    <Button asChild variant="outline" className="border-white/30 text-white bg-white/10 hover:bg-white/20 mt-4">
                      <Link href="/discover">
                        <Search className="h-4 w-4 mr-2" />
                        Explore Events
                      </Link>
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="communities" className="mt-8">
                <div className="space-y-6">
                  {/* Create Community Section */}
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-white">My Communities</h3>
                    <Dialog open={isCreatingCommunity} onOpenChange={setIsCreatingCommunity}>
                      <DialogTrigger asChild>
                        <Button className="brand-gradient text-white">
                          <Plus className="h-4 w-4 mr-2" />
                          Create Community
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-gray-900/95 border-white/20 text-white">
                        <DialogHeader>
                          <DialogTitle>Create New Community</DialogTitle>
                          <DialogDescription className="text-white/70">
                            Create a community to bring people together around shared interests.
                          </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={(e) => {
                          e.preventDefault();
                          createCommunityMutation.mutate(communityForm);
                        }} className="space-y-4">
                          <div>
                            <Label htmlFor="community-name">Community Name</Label>
                            <Input
                              id="community-name"
                              value={communityForm.name}
                              onChange={(e) => setCommunityForm(prev => ({ ...prev, name: e.target.value }))}
                              placeholder="Enter community name"
                              className="bg-white/10 border-white/30 text-white placeholder:text-white/50"
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="community-description">Description</Label>
                            <Textarea
                              id="community-description"
                              value={communityForm.description}
                              onChange={(e) => setCommunityForm(prev => ({ ...prev, description: e.target.value }))}
                              placeholder="Describe your community"
                              className="bg-white/10 border-white/30 text-white placeholder:text-white/50"
                              rows={3}
                            />
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="community-public"
                              checked={communityForm.isPublic}
                              onCheckedChange={(checked) => setCommunityForm(prev => ({ ...prev, isPublic: checked }))}
                            />
                            <Label htmlFor="community-public" className="flex items-center gap-2">
                              {communityForm.isPublic ? (
                                <><Globe className="h-4 w-4" /> Public Community</>
                              ) : (
                                <><Lock className="h-4 w-4" /> Private Community</>
                              )}
                            </Label>
                          </div>
                          <DialogFooter>
                            <Button 
                              type="button" 
                              variant="outline" 
                              onClick={() => setIsCreatingCommunity(false)}
                              className="border-white/30 text-white bg-white/10 hover:bg-white/20"
                            >
                              Cancel
                            </Button>
                            <Button 
                              type="submit" 
                              disabled={createCommunityMutation.isPending || !communityForm.name.trim()}
                              className="brand-gradient text-white"
                            >
                              {createCommunityMutation.isPending ? "Creating..." : "Create Community"}
                            </Button>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>

                  {/* Communities List */}
                  {communitiesLoading ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent mx-auto"></div>
                      <p className="text-white/60 text-sm mt-4">Loading communities...</p>
                    </div>
                  ) : userCommunities && userCommunities.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {userCommunities.map((community) => (
                        <Card key={community.id} className="bg-white/10 border-white/20 backdrop-blur-md hover:bg-white/15 transition-colors">
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <CardTitle className="text-white flex items-center gap-2 text-lg">
                                  {community.name}
                                  {community.isPublic ? (
                                    <Globe className="h-4 w-4 text-green-400" />
                                  ) : (
                                    <Lock className="h-4 w-4 text-yellow-400" />
                                  )}
                                </CardTitle>
                                <CardDescription className="text-white/70 mt-1">
                                  {community.description || "No description available"}
                                </CardDescription>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-white/60">
                                <Users className="h-4 w-4" />
                                <span className="text-sm">
                                  {community.memberCount} {community.memberCount === 1 ? 'member' : 'members'}
                                </span>
                              </div>
                              <Button asChild size="sm" variant="outline" className="border-white/30 text-white bg-white/10 hover:bg-white/20">
                                <Link href={`/groups/${community.slug || community.id}`}>
                                  View
                                </Link>
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-16 space-y-4">
                      <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-r from-primary/20 to-cyan-400/20 flex items-center justify-center">
                        <Users className="h-10 w-10 text-white/60" />
                      </div>
                      <h3 className="text-xl font-semibold text-white">No communities yet</h3>
                      <p className="text-white/60 max-w-sm mx-auto">
                        Create your first community to connect with like-minded people.
                      </p>
                      <Button 
                        onClick={() => setIsCreatingCommunity(true)}
                        className="brand-gradient text-white mt-4"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create Your First Community
                      </Button>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </section>
        </main>

        <MobileNav />
      </div>
    </SimpleBackground>
  );
}
