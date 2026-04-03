import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  Heart,
  Plus,
  Globe,
  Lock,
  ChevronRight
} from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import Header from "@/components/layout/header";
import MobileNav from "@/components/layout/mobile-nav";

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
  const [activeTab, setActiveTab] = useState("events");
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

  const { data: profile, isLoading: profileLoading } = useQuery<UserProfile>({
    queryKey: ["/api/profile"],
    queryFn: async () => {
      const response = await fetch("/api/profile", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch profile");
      return response.json();
    },
    enabled: !!user,
  });

  const { data: stats } = useQuery<UserStats>({
    queryKey: ["/api/profile/stats"],
    queryFn: async () => {
      const response = await fetch("/api/profile/stats", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch stats");
      return response.json();
    },
    enabled: !!user,
  });

  const { data: userEvents, isLoading: eventsLoading } = useQuery<any[]>({
    queryKey: ["/api/profile/events"],
    queryFn: async () => {
      const response = await fetch("/api/profile/events", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch events");
      return response.json();
    },
    enabled: !!user,
  });

  const { data: userCommunities, isLoading: communitiesLoading } = useQuery<any[]>({
    queryKey: ["/api/profile/groups"],
    queryFn: async () => {
      const response = await fetch("/api/profile/groups", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch communities");
      return response.json();
    },
    enabled: !!user,
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: Partial<UserProfile>) => {
      const response = await apiRequest("PUT", "/api/profile", data);
      if (!response.ok) throw new Error("Failed to update profile");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      setIsEditing(false);
      toast({ title: "Profile updated!" });
    },
  });

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

  if (profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
         <div className="w-8 h-8 border-4 border-slate-200 dark:border-slate-800 border-t-indigo-600 dark:border-t-indigo-400 rounded-full animate-spin" />
      </div>
    );
  }

  const StatItem = ({ icon: Icon, label, value, colorClass }: any) => (
    <div className="flex items-center gap-3 bg-white dark:bg-slate-900 px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
       <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorClass}`}>
          <Icon className="h-4 w-4" />
       </div>
       <div>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-none mb-1">{label}</p>
          <p className="text-lg font-black text-slate-900 dark:text-white leading-none">{value || 0}</p>
       </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans pb-20">
      <Header />

      <main className="max-w-7xl mx-auto px-4 md:px-6 pt-24 md:pt-32 space-y-8">
        
        {/* Profile Card - Civic Design */}
        <section className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-6 md:p-10 shadow-sm relative overflow-hidden">
           {/* Decorative Accents */}
           <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
           
           <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-8 md:gap-12">
              {/* Avatar Section */}
              <div className="relative group">
                <Avatar className="w-32 h-32 md:w-40 md:h-40 border-4 border-white dark:border-slate-800 shadow-xl">
                  <AvatarImage src={profile?.profileImageUrl} />
                  <AvatarFallback className="bg-slate-100 dark:bg-slate-800 text-slate-500 text-4xl font-black">
                    {profile?.firstName?.[0]}{profile?.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <button className="absolute bottom-2 right-2 w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                   <Camera className="h-5 w-5" />
                </button>
              </div>

              {/* Identity Section */}
              <div className="flex-1 text-center md:text-left">
                 {!isEditing ? (
                   <>
                     <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white mb-2">
                        {profile?.firstName} {profile?.lastName}
                     </h1>
                     <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mb-6">
                        <span className="flex items-center gap-1.5 text-sm font-medium text-slate-500 dark:text-slate-400">
                           <Mail className="h-4 w-4" /> {profile?.email}
                        </span>
                        <span className="flex items-center gap-1.5 text-sm font-medium text-slate-500 dark:text-slate-400">
                           <Clock className="h-4 w-4" /> Since {new Date(profile?.createdAt || '').getFullYear()}
                        </span>
                        {profile?.location && (
                          <span className="flex items-center gap-1.5 text-sm font-medium text-slate-500 dark:text-slate-400">
                             <MapPin className="h-4 w-4" /> {profile.location}
                          </span>
                        )}
                     </div>
                     <p className="text-slate-600 dark:text-slate-400 max-w-xl font-medium leading-relaxed mb-8">
                        {profile?.bio || "No bio yet. Tell the tribe about yourself."}
                     </p>
                     <div className="flex flex-wrap justify-center md:justify-start gap-3">
                        <Button onClick={() => setIsEditing(true)} className="rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 h-11 px-8 font-bold shadow-lg">
                           <Edit3 className="h-4 w-4 mr-2" /> Edit Profile
                        </Button>
                        <Button variant="outline" className="rounded-full border-slate-200 dark:border-slate-700 h-11 px-8 font-bold">
                           <Settings className="h-4 w-4 mr-2" /> Settings
                        </Button>
                     </div>
                   </>
                 ) : (
                   <div className="space-y-6 max-w-2xl">
                      <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">First Name</Label>
                            <Input value={editForm.firstName} onChange={(e) => setEditForm({...editForm, firstName: e.target.value})} className="h-12 rounded-xl bg-slate-50 dark:bg-slate-800 border-none" />
                         </div>
                         <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Last Name</Label>
                            <Input value={editForm.lastName} onChange={(e) => setEditForm({...editForm, lastName: e.target.value})} className="h-12 rounded-xl bg-slate-50 dark:bg-slate-800 border-none" />
                         </div>
                      </div>
                      <div className="space-y-2">
                         <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Bio</Label>
                         <Textarea value={editForm.bio} onChange={(e) => setEditForm({...editForm, bio: e.target.value})} className="rounded-xl bg-slate-50 dark:bg-slate-800 border-none min-h-[100px]" />
                      </div>
                      <div className="flex gap-3">
                         <Button onClick={() => updateProfileMutation.mutate(editForm)} className="rounded-full bg-indigo-600 text-white h-11 px-8 font-bold">
                            <Save className="h-4 w-4 mr-2" /> Save Changes
                         </Button>
                         <Button onClick={() => setIsEditing(false)} variant="outline" className="rounded-full border-slate-200 h-11 px-8 font-bold">
                            <X className="h-4 w-4 mr-2" /> Cancel
                         </Button>
                      </div>
                   </div>
                 )}
              </div>
           </div>
        </section>

        {/* Stats Grid - High Density */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
           <StatItem icon={Calendar} label="Hosted" value={stats?.eventsHosted} colorClass="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400" />
           <StatItem icon={Users} label="Attending" value={stats?.eventsAttended} colorClass="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" />
           <StatItem icon={Heart} label="RSVPs" value={stats?.totalRsvps} colorClass="bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400" />
           <StatItem icon={MapPin} label="Upcoming" value={stats?.upcomingEvents} colorClass="bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" />
        </section>

        {/* Activity Section */}
        <section className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-6 md:p-10">
           <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-8 bg-slate-50 dark:bg-slate-800 p-1.5 rounded-full inline-flex h-12 w-auto border border-slate-100 dark:border-slate-700">
                 <TabsTrigger value="events" className="rounded-full px-8 text-xs font-bold uppercase tracking-widest data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm">Events</TabsTrigger>
                 <TabsTrigger value="groups" className="rounded-full px-8 text-xs font-bold uppercase tracking-widest data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm">Groups</TabsTrigger>
              </TabsList>

              <TabsContent value="events" className="mt-0">
                 {userEvents && userEvents.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                       {userEvents.map(ev => (
                          <Link key={ev.id} href={`/events/${ev.slug || ev.id}`}>
                             <div className="group cursor-pointer">
                                <div className="aspect-square rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 mb-3 border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md hover:-translate-y-1">
                                   {ev.imageUrl ? <img src={ev.imageUrl} className="w-full h-full object-cover transition-transform group-hover:scale-105" /> : <div className="w-full h-full flex items-center justify-center"><Calendar className="text-slate-300 h-10 w-10" /></div>}
                                </div>
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{ev.title}</h4>
                                <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500 font-medium">
                                   <Calendar className="h-3 w-3" /> {new Date(ev.datetime).toLocaleDateString()}
                                </div>
                             </div>
                          </Link>
                       ))}
                    </div>
                 ) : (
                    <div className="py-20 text-center text-slate-400 font-medium">No event history yet.</div>
                 )}
              </TabsContent>

              <TabsContent value="groups" className="mt-0">
                 {userCommunities && userCommunities.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                       {userCommunities.map(community => (
                          <Link key={community.id} href={`/groups/${community.slug || community.id}`}>
                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between group cursor-pointer hover:border-indigo-200 transition-colors">
                               <div className="flex items-center gap-4">
                                  <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 overflow-hidden">
                                     {community.imageUrl ? <img src={community.imageUrl} className="w-full h-full object-cover" /> : <Users className="h-6 w-6 m-3 text-slate-300" />}
                                  </div>
                                  <div>
                                     <h4 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">{community.name}</h4>
                                     <p className="text-[11px] text-slate-500 font-medium uppercase tracking-widest">{community.memberCount || 1} Members</p>
                                  </div>
                               </div>
                               <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-indigo-600 transition-colors" />
                            </div>
                          </Link>
                       ))}
                    </div>
                 ) : (
                    <div className="py-20 text-center text-slate-400 font-medium">No communities joined yet.</div>
                 )}
              </TabsContent>
           </Tabs>
        </section>
      </main>

      <MobileNav />
    </div>
  );
}
