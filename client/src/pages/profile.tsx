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
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-black overflow-x-hidden">
        <Header />
        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-24 md:pb-14">
          <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600 dark:border-violet-400" />
          </div>
        </main>
        <MobileNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-black text-slate-900 dark:text-slate-100 font-sans">
      <Header />

      <main className="max-w-5xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 pt-20 md:pt-24 pb-24 md:pb-14 space-y-6 sm:space-y-8 md:space-y-12">
        {/* Profile Header */}
        <section className="bg-white/70 dark:bg-gray-900/90 backdrop-blur rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 border border-slate-200/60 dark:border-gray-800/60 shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
            <div className="flex flex-col lg:flex-row gap-6 sm:gap-8 lg:items-start">
              {/* Avatar and Basic Info */}
              <div className="flex flex-col items-center lg:items-start space-y-4 sm:space-y-6">
                <div className="relative">
                  <Avatar className="w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 border-2 border-slate-200 dark:border-slate-700">
                    <AvatarImage src={profile?.profileImageUrl || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-violet-400 to-purple-500 text-white text-xl sm:text-2xl md:text-3xl font-bold">
                      {profile?.firstName?.[0]}{profile?.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    size="sm"
                    variant="outline"
                    className="absolute bottom-0 right-0 rounded-full h-7 w-7 sm:h-8 sm:w-8 md:h-10 md:w-10 p-0 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm"
                  >
                    <Camera className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 text-slate-600 dark:text-slate-400" />
                  </Button>
                </div>
                
                <div className="text-center lg:text-left space-y-1.5 sm:space-y-2">
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 dark:text-white">
                    {profile?.firstName} {profile?.lastName}
                  </h1>
                  <p className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5 sm:gap-2 justify-center lg:justify-start text-xs sm:text-sm">
                    <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    {profile?.email}
                  </p>
                  <p className="text-slate-500 dark:text-slate-400 text-[10px] sm:text-xs flex items-center gap-1.5 sm:gap-2 justify-center lg:justify-start">
                    <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                    Joined {new Date(profile?.createdAt || '').toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric"
                    })}
                  </p>
                </div>
              </div>

              {/* Profile Details and Actions */}
              <div className="flex-1 space-y-4 sm:space-y-6">
                {!isEditing ? (
                  <>
                    {/* Bio and Details */}
                    <div className="space-y-3 sm:space-y-4">
                      {profile?.bio && (
                        <div>
                          <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white mb-1.5 sm:mb-2">About</h3>
                          <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300">{profile.bio}</p>
                        </div>
                      )}
                      
                      <div className="flex flex-wrap gap-3 sm:gap-4">
                        {profile?.location && (
                          <div className="flex items-center gap-1.5 sm:gap-2 text-slate-600 dark:text-slate-400 text-sm">
                            <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            <span>{profile.location}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 sm:gap-3 flex-wrap relative z-20">
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
                        className="rounded-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg shadow-violet-200 dark:shadow-violet-900/30 min-h-[40px] sm:min-h-[44px] px-4 sm:px-6 py-2 sm:py-3 text-sm touch-manipulation mobile-button cursor-pointer relative z-20"
                        type="button"
                        style={tapHighlightStyle}
                      >
                        <Edit3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                        Edit Profile
                      </Button>
                      <Button
                        variant="outline"
                        className="rounded-full border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 min-h-[40px] sm:min-h-[44px] px-4 sm:px-6 py-2 sm:py-3 text-sm mobile-button relative z-20"
                        type="button"
                      >
                        <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                        Settings
                      </Button>
                    </div>
                  </>
                ) : (
                  // Edit Form
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName" className="text-slate-700">First Name</Label>
                        <Input
                          id="firstName"
                          value={editForm.firstName}
                          onChange={(e) => setEditForm({...editForm, firstName: e.target.value})}
                          className="bg-white border-slate-200 text-slate-900 focus:border-violet-300"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName" className="text-slate-700">Last Name</Label>
                        <Input
                          id="lastName"
                          value={editForm.lastName}
                          onChange={(e) => setEditForm({...editForm, lastName: e.target.value})}
                          className="bg-white border-slate-200 text-slate-900 focus:border-violet-300"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="bio" className="text-slate-700">Bio</Label>
                      <Textarea
                        id="bio"
                        value={editForm.bio}
                        onChange={(e) => setEditForm({...editForm, bio: e.target.value})}
                        placeholder="Tell us about yourself..."
                        className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-violet-300"
                        rows={3}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="location" className="text-slate-700">Location</Label>
                      <Input
                        id="location"
                        value={editForm.location}
                        onChange={(e) => setEditForm({...editForm, location: e.target.value})}
                        placeholder="City, Country"
                        className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-violet-300"
                      />
                    </div>

                    <div className="flex gap-2 sm:gap-3 flex-wrap relative z-20">
                      <Button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleSaveProfile();
                        }}
                        disabled={updateProfileMutation.isPending}
                        className="rounded-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg shadow-violet-200 min-h-[40px] sm:min-h-[44px] px-4 sm:px-6 py-2 sm:py-3 text-sm touch-manipulation mobile-button cursor-pointer relative z-20"
                        type="button"
                        style={tapHighlightStyle}
                      >
                        <Save className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                        {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                      </Button>
                      <Button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleCancelEdit();
                        }}
                        variant="outline"
                        className="rounded-full border-slate-200 text-slate-700 bg-white hover:bg-slate-50 min-h-[40px] sm:min-h-[44px] px-4 sm:px-6 py-2 sm:py-3 text-sm touch-manipulation mobile-button cursor-pointer relative z-20"
                        type="button"
                        style={tapHighlightStyle}
                      >
                        <X className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Stats Cards */}
          {!statsLoading && stats && (
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <Card className="bg-white dark:bg-gray-950 border-slate-200 dark:border-gray-800 shadow-[0_4px_20px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.5)] transition hover:shadow-[0_8px_30px_rgba(99,102,241,0.15)] hover:-translate-y-1">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col items-center text-center space-y-1.5 sm:space-y-2">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-violet-100 dark:bg-gray-800 flex items-center justify-center">
                      <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div>
                      <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">{stats.eventsHosted}</p>
                      <p className="text-slate-600 dark:text-slate-400 text-[10px] sm:text-xs">Events Hosted</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-white dark:bg-gray-950 border-slate-200 dark:border-gray-800 shadow-[0_4px_20px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.5)] transition hover:shadow-[0_8px_30px_rgba(99,102,241,0.15)] hover:-translate-y-1">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col items-center text-center space-y-1.5 sm:space-y-2">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-blue-100 dark:bg-gray-800 flex items-center justify-center">
                      <Users className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">{stats.eventsAttended}</p>
                      <p className="text-slate-600 dark:text-slate-400 text-[10px] sm:text-xs">Events Attended</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-white dark:bg-gray-950 border-slate-200 dark:border-gray-800 shadow-[0_4px_20px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.5)] transition hover:shadow-[0_8px_30px_rgba(99,102,241,0.15)] hover:-translate-y-1">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col items-center text-center space-y-1.5 sm:space-y-2">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-pink-100 dark:bg-gray-800 flex items-center justify-center">
                      <Heart className="h-5 w-5 sm:h-6 sm:w-6 text-pink-600 dark:text-pink-400" />
                    </div>
                    <div>
                      <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">{stats.totalRsvps}</p>
                      <p className="text-slate-600 dark:text-slate-400 text-[10px] sm:text-xs">Total RSVPs</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-white dark:bg-gray-950 border-slate-200 dark:border-gray-800 shadow-[0_4px_20px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.5)] transition hover:shadow-[0_8px_30px_rgba(99,102,241,0.15)] hover:-translate-y-1">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col items-center text-center space-y-1.5 sm:space-y-2">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-green-100 dark:bg-gray-800 flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">{stats.upcomingEvents}</p>
                      <p className="text-slate-600 dark:text-slate-400 text-[10px] sm:text-xs">Upcoming</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>
          )}

          {/* Content Tabs */}
          <section className="bg-white/70 dark:bg-gray-900/90 backdrop-blur rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 border border-slate-200/60 dark:border-gray-800/60 shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3 bg-slate-100 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-lg text-xs sm:text-sm">
                <TabsTrigger 
                  value="hosted" 
                  className="text-slate-700 dark:text-slate-300 data-[state=active]:bg-white dark:data-[state=active]:bg-black data-[state=active]:text-slate-900 dark:data-[state=active]:text-white data-[state=active]:shadow-sm rounded-md transition"
                >
                  Hosted Events
                </TabsTrigger>
                <TabsTrigger 
                  value="attending" 
                  className="text-slate-700 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm rounded-md transition"
                >
                  Attending
                </TabsTrigger>
                <TabsTrigger 
                  value="communities" 
                  className="text-slate-700 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm rounded-md transition"
                >
                  Communities
                </TabsTrigger>
              </TabsList>

              <TabsContent value="hosted" className="mt-6 sm:mt-8">
                {eventsLoading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-10 w-10 border-2 border-violet-600 border-t-transparent mx-auto"></div>
                    <p className="text-slate-600 text-sm mt-4">Loading events...</p>
                  </div>
                ) : userEvents && userEvents.filter(event => event.hostId === user.id).length > 0 ? (
                  <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {userEvents.filter(event => event.hostId === user.id).map((event) => (
                      <EventCard key={event.id} event={event} showManageOptions={true} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 sm:py-16 space-y-3 sm:space-y-4">
                    <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-violet-50 dark:bg-violet-950/30 flex items-center justify-center">
                      <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-violet-500 dark:text-violet-400" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white">No hosted events yet</h3>
                    <p className="text-slate-600 dark:text-slate-400 max-w-sm mx-auto text-sm sm:text-base">Start creating amazing events for your friends and community.</p>
                    <Button asChild className="rounded-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg shadow-violet-200 dark:shadow-violet-900/30 mt-3 sm:mt-4 h-9 sm:h-10 px-4 sm:px-5 text-sm">
                      <Link href="/create-event">
                        <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                        Create Your First Event
                      </Link>
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="attending" className="mt-6 sm:mt-8">
                {eventsLoading ? (
                  <div className="text-center py-10 sm:py-12">
                    <div className="animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 border-2 border-violet-600 border-t-transparent mx-auto"></div>
                    <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm mt-3 sm:mt-4">Loading events...</p>
                  </div>
                ) : userEvents && userEvents.filter(event => event.hostId !== user.id).length > 0 ? (
                  <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
                    {userEvents.filter(event => event.hostId !== user.id).map((event) => (
                      <EventCard key={event.id} event={event} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 sm:py-16 space-y-3 sm:space-y-4">
                    <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center">
                      <Users className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500 dark:text-blue-400" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white">No events joined yet</h3>
                    <p className="text-slate-600 dark:text-slate-400 max-w-sm mx-auto text-sm sm:text-base">Discover and join exciting events happening around you.</p>
                    <Button asChild variant="outline" className="rounded-full border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 mt-3 sm:mt-4 h-9 sm:h-10 px-4 sm:px-5 text-sm">
                      <Link href="/discover">
                        <Search className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                        Explore Events
                      </Link>
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="communities" className="mt-6 sm:mt-8">
                <div className="space-y-4 sm:space-y-6">
                  {/* Create Community Section */}
                  <div className="flex justify-between items-center">
                    <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">My Communities</h3>
                    <Dialog open={isCreatingCommunity} onOpenChange={setIsCreatingCommunity}>
                      <DialogTrigger asChild>
                        <Button className="rounded-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg shadow-violet-200 dark:shadow-violet-900/30 h-9 sm:h-10 px-3 sm:px-4 text-sm">
                          <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                          Create Community
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-white border-slate-200 text-slate-900">
                        <DialogHeader>
                          <DialogTitle>Create New Community</DialogTitle>
                          <DialogDescription className="text-slate-600">
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
                              className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
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
                              className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
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
                              className="border-slate-200 text-slate-700 bg-white hover:bg-slate-50"
                            >
                              Cancel
                            </Button>
                            <Button 
                              type="submit" 
                              disabled={createCommunityMutation.isPending || !communityForm.name.trim()}
                              className="rounded-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white"
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
                    <div className="text-center py-10 sm:py-12">
                      <div className="animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 border-2 border-violet-600 border-t-transparent mx-auto"></div>
                      <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm mt-3 sm:mt-4">Loading communities...</p>
                    </div>
                  ) : userCommunities && userCommunities.length > 0 ? (
                    <div className="grid gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {userCommunities.map((community) => (
                        <Card key={community.id} className="bg-white dark:bg-gray-950 border-slate-200 dark:border-gray-800 shadow-[0_4px_20px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.5)] hover:shadow-[0_8px_30px_rgba(99,102,241,0.15)] hover:-translate-y-1 transition-all">
                          <CardHeader className="p-4 sm:p-6">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <CardTitle className="text-slate-900 dark:text-white flex items-center gap-1.5 sm:gap-2 text-base sm:text-lg">
                                  {community.name}
                                  {community.isPublic ? (
                                    <Globe className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500" />
                                  ) : (
                                    <Lock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-orange-500" />
                                  )}
                                </CardTitle>
                                <CardDescription className="text-slate-600 dark:text-slate-400 mt-1 text-xs sm:text-sm line-clamp-2">
                                  {community.description || "No description available"}
                                </CardDescription>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="p-4 sm:p-6 pt-0">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 sm:gap-2 text-slate-600 dark:text-slate-400">
                                <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                <span className="text-xs sm:text-sm">
                                  {community.memberCount} {community.memberCount === 1 ? 'member' : 'members'}
                                </span>
                              </div>
                              <Button asChild size="sm" variant="outline" className="border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 h-8 px-3 text-xs">
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
                    <div className="text-center py-10 sm:py-16 space-y-3 sm:space-y-4">
                      <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-purple-50 dark:bg-purple-950/30 flex items-center justify-center">
                        <Users className="h-6 w-6 sm:h-8 sm:w-8 text-purple-500 dark:text-purple-400" />
                      </div>
                      <h3 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white">No communities yet</h3>
                      <p className="text-slate-600 dark:text-slate-400 max-w-sm mx-auto text-sm sm:text-base">
                        Create your first community to connect with like-minded people.
                      </p>
                      <Button 
                        onClick={() => setIsCreatingCommunity(true)}
                        className="rounded-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg shadow-violet-200 dark:shadow-violet-900/30 mt-3 sm:mt-4 h-9 sm:h-10 px-4 sm:px-5 text-sm"
                      >
                        <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
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
  );
}
