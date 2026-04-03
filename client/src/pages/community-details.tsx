import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  MapPin, 
  Clock, 
  Settings, 
  Plus, 
  Users, 
  Shield, 
  Crown, 
  Megaphone, 
  Send, 
  UserPlus, 
  LayoutDashboard, 
  Globe, 
  Lock,
  ChevronRight,
  Share2,
  Info
} from "lucide-react";
import { Link } from "wouter";
import Header from "@/components/layout/header";
import MobileNav from "@/components/layout/mobile-nav";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useState, useMemo } from "react";
import { GroupInviteDialog } from "@/components/group-invite-dialog";
import { LoginDialog } from "@/components/LoginDialog";

export default function CommunityDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  
  const { data: community, isLoading } = useQuery({
    queryKey: [`/api/groups/${id}`],
    queryFn: async () => {
      const response = await fetch(`/api/groups/${id}`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch group");
      return response.json();
    },
    enabled: !!id,
  });

  const { data: events } = useQuery({
    queryKey: [`/api/groups/${id}/events`],
    queryFn: async () => {
      const response = await fetch(`/api/groups/${id}/events`, { credentials: "include" });
      return response.json();
    },
    enabled: !!id,
  });

  const { data: members } = useQuery({
    queryKey: [`/api/groups/${id}/members`],
    queryFn: async () => {
      const response = await fetch(`/api/groups/${id}/members`, { credentials: "include" });
      return response.json();
    },
    enabled: !!id,
  });

  const { data: announcements } = useQuery({
    queryKey: [`/api/groups/${id}/announcements`],
    queryFn: async () => {
      const response = await fetch(`/api/groups/${id}/announcements`, { credentials: "include" });
      return response.json();
    },
    enabled: !!id,
  });

  const joinMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/groups/${id}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({}),
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({ title: data?.type === 'request_created' ? 'Request sent!' : 'Joined group!' });
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${id}/members`] });
    },
  });

  const userMembership = useMemo(() => 
    Array.isArray(members) ? members.find((m: any) => m.userId === user?.id) : undefined, 
    [members, user]
  );
  const isOwner = userMembership?.role === 'owner';
  const isHost = userMembership?.role === 'host';
  const isMember = !!userMembership;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="w-8 h-8 border-4 border-slate-200 dark:border-slate-800 border-t-indigo-600 dark:border-t-indigo-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (!community) return null;

  const upcomingEvents = events?.filter((e: any) => new Date(e.datetime) >= new Date()) || [];
  const pastEvents = events?.filter((e: any) => new Date(e.datetime) < new Date())
    .sort((a: any, b: any) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime()) || [];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans pb-20">
      <Header />

      {/* Cinematic Hero */}
      <section className="relative pt-16">
        <div className="h-48 md:h-64 lg:h-80 w-full overflow-hidden relative">
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-[10s] hover:scale-105"
            style={{ backgroundImage: `url(${community.coverImageUrl || community.imageUrl || "https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&q=80"})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-50 via-slate-50/20 to-transparent dark:from-slate-950 dark:via-slate-950/20" />
        </div>

        <div className="max-w-7xl mx-auto px-4 md:px-6 -mt-16 md:-mt-24 relative z-10">
          <div className="flex flex-col md:flex-row items-center md:items-end justify-between gap-6">
            <div className="flex flex-col md:flex-row items-center md:items-end gap-6 text-center md:text-left">
              <Avatar className="w-32 h-32 md:w-40 md:h-40 border-8 border-slate-50 dark:border-slate-950 shadow-2xl rounded-[2.5rem]">
                <AvatarImage src={community.imageUrl} />
                <AvatarFallback className="bg-indigo-600 text-white text-4xl font-black">{community.name[0]}</AvatarFallback>
              </Avatar>
              <div className="pb-2">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-2">
                  <h1 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
                    {community.name}
                  </h1>
                  <Badge className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest border shadow-none ${
                    community.isPublic ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'
                  }`}>
                    {community.isPublic ? <Globe className="h-3 w-3 mr-1" /> : <Lock className="h-3 w-3 mr-1" />}
                    {community.isPublic ? 'Public Tribe' : 'Invite Only'}
                  </Badge>
                </div>
                <p className="font-bold text-slate-500 dark:text-slate-400 flex items-center justify-center md:justify-start gap-2">
                  <Users className="h-4 w-4" /> {community.memberCount} members
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pb-2">
              {!isMember ? (
                <Button 
                  onClick={() => user ? joinMutation.mutate() : setShowLoginDialog(true)}
                  className="rounded-full bg-indigo-600 hover:bg-indigo-700 text-white h-11 px-8 font-black shadow-lg"
                >
                  {community.isPublic ? 'Join Tribe' : 'Request Invite'}
                </Button>
              ) : (
                <Button onClick={() => setShowInviteDialog(true)} variant="outline" className="rounded-full border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white h-11 px-6 font-bold shadow-sm">
                  <UserPlus className="h-4 w-4 mr-2" /> Invite
                </Button>
              )}
              <Button 
                variant="outline" 
                className="rounded-full border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white h-11 w-11 p-0 shadow-sm"
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  toast({ title: "Link copied!", description: "Group link copied to clipboard." });
                }}
              >
                <Share2 className="h-4 w-4" />
              </Button>
              {(isOwner || isHost) && (
                <>
                  <Button asChild className="rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 h-11 px-6 font-black shadow-lg">
                    <Link href={`/groups/${id}/dashboard`}>
                      <LayoutDashboard className="h-4 w-4 mr-2" /> Dashboard
                    </Link>
                  </Button>
                  <Button asChild className="rounded-full bg-indigo-600 hover:bg-indigo-700 text-white h-11 px-6 font-black shadow-lg">
                    <Link href={`/create-event?groupId=${id}`}>
                      <Plus className="h-4 w-4 mr-2" /> Create Event
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 md:px-6 pt-12 md:pt-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Community Timeline */}
          <div className="lg:col-span-2 space-y-12">
            
            <section className="space-y-6">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-6 bg-indigo-600 rounded-full" />
                  <h2 className="text-xl font-bold tracking-tight uppercase tracking-[0.1em] text-xs">Community Feed</h2>
                </div>
              </div>

              <div className="space-y-6 relative ml-4 pl-8 border-l border-slate-200 dark:border-slate-800">
                
                {/* Pinned Announcements */}
                {Array.isArray(announcements) && announcements.slice(0, 2).map((ann: any) => (
                  <div key={ann.id} className="relative">
                    <div className="absolute -left-[41px] top-1 w-4 h-4 rounded-full bg-slate-900 border-4 border-slate-50 flex items-center justify-center">
                       <Megaphone className="h-2 w-2 text-white" />
                    </div>
                    <div className="bg-indigo-50 dark:bg-indigo-900/20 p-6 rounded-3xl border border-indigo-100 dark:border-indigo-800/50">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 flex items-center gap-1">
                          <Plus className="h-3 w-3" /> Announcement
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{ann.title}</h3>
                      <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">{ann.content}</p>
                    </div>
                  </div>
                ))}

                {/* Upcoming Events as "Story Posts" */}
                {Array.isArray(upcomingEvents) && upcomingEvents.map((ev: any) => (
                  <Link key={ev.id} href={`/events/${ev.slug || ev.id}`}>
                    <div className="relative group cursor-pointer mb-6">
                      <div className="absolute -left-[41px] top-1 w-4 h-4 rounded-full bg-indigo-600 border-4 border-slate-50" />
                      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 transition-all group-hover:shadow-md group-hover:-translate-y-1">
                         <div className="flex items-center gap-3 mb-4">
                           <div className="h-10 w-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-indigo-600 font-bold">
                              <Calendar className="h-5 w-5" />
                           </div>
                           <div>
                             <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Upcoming Event</p>
                             <h3 className="text-lg font-bold text-slate-900 dark:text-white line-clamp-1">{ev.title}</h3>
                           </div>
                         </div>
                         {ev.imageUrl && <img src={ev.imageUrl} className="w-full h-48 object-cover rounded-2xl mb-4" />}
                         <div className="flex flex-wrap gap-4 text-xs font-bold text-slate-500">
                            <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> {new Date(ev.datetime).toLocaleDateString()}</span>
                            <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {ev.location || "TBD"}</span>
                            <span className="ml-auto text-indigo-600 flex items-center gap-1">Details <ChevronRight className="h-3 w-3" /></span>
                         </div>
                      </div>
                    </div>
                  </Link>
                ))}

                {/* Past Highlights */}
                {pastEvents.slice(0, 3).map((ev: any) => (
                  <div key={ev.id} className="relative grayscale opacity-60">
                     <div className="absolute -left-[41px] top-1 w-4 h-4 rounded-full bg-slate-200 border-4 border-slate-50" />
                     <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Past Highlight</p>
                     <h4 className="text-sm font-bold text-slate-600 dark:text-slate-400">{ev.title}</h4>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Sidebar - The Tribe Context */}
          <div className="space-y-8">
            
            {/* Leadership Card */}
            <section className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-8 shadow-sm">
               <div className="flex items-center gap-2 mb-6">
                 <div className="w-1 h-6 bg-amber-500 rounded-full" />
                 <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">The Leaders</h2>
               </div>
               <div className="space-y-4">
                  {Array.isArray(members) && members.filter((m: any) => m.role === 'owner' || m.role === 'host').map((m: any) => (
                    <div key={m.userId} className="flex items-center gap-3">
                       <Avatar className="h-10 w-10">
                          <AvatarImage src={m.user?.profileImageUrl || m.user?.profilePicture} />
                          <AvatarFallback className="bg-slate-100 font-bold">{m.user?.firstName?.[0] || m.user?.displayName?.[0]}</AvatarFallback>
                       </Avatar>
                       <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">{m.user?.firstName ? `${m.user.firstName} ${m.user.lastName || ''}` : m.user?.displayName}</p>
                          <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600 flex items-center gap-1">
                             {m.role === 'owner' ? <><Crown className="h-2 w-2" /> Founder</> : <><Shield className="h-2 w-2" /> Host</>}
                          </p>
                       </div>
                    </div>
                  ))}
               </div>
            </section>

            {/* Social Proof Sidebar */}
            <section className="bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-8 shadow-sm relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl" />
               <div className="relative z-10">
                  <h3 className="text-xs font-black uppercase tracking-widest text-indigo-500 dark:text-indigo-400 mb-4">The Tribe</h3>
                  <div className="flex -space-x-3 mb-4">
                     {Array.isArray(members) && members.slice(0, 6).map((m: any) => (
                       <Avatar key={m.userId} className="h-10 w-10 border-2 border-white dark:border-slate-900 ring-2 ring-transparent">
                          <AvatarImage src={m.user?.profileImageUrl || m.user?.profilePicture} />
                          <AvatarFallback className="bg-slate-200 dark:bg-slate-800 text-[10px] font-bold text-slate-700 dark:text-slate-300">{m.user?.firstName?.[0] || m.user?.displayName?.[0]}</AvatarFallback>
                       </Avatar>
                     ))}
                     {community.memberCount > 6 && (
                       <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-2 border-white dark:border-slate-900 flex items-center justify-center text-[10px] font-bold">
                          +{community.memberCount - 6}
                       </div>
                     )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                    Join this community of {community.memberCount} like-minded individuals today.
                  </p>
                  <Button asChild variant="link" className="text-indigo-600 dark:text-indigo-400 p-0 text-xs font-bold mt-4 h-auto flex items-center gap-1">
                    <Link href={`/groups/${id}/manage?tab=members`}>
                       View all members <ChevronRight className="h-3 w-3" />
                    </Link>
                  </Button>
               </div>
            </section>

            {/* Quick Actions / Share */}
            <section className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-8 shadow-sm">
               <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6">Group Info</h3>
               <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs font-bold">
                     <span className="text-slate-400">Created</span>
                     <span>{new Date(community.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-bold">
                     <span className="text-slate-400">Category</span>
                     <span className="capitalize">{community.category || 'General'}</span>
                  </div>
                  <div className="pt-4 mt-4 border-t border-slate-100">
                     <p className="text-[10px] text-slate-400 mb-4 font-medium flex items-center gap-1.5"><Info className="h-3 w-3" /> Members get exclusive updates and invite-only access to private events.</p>
                  </div>
               </div>
            </section>
          </div>
        </div>
      </main>

      <MobileNav />
      <GroupInviteDialog open={showInviteDialog} onOpenChange={setShowInviteDialog} groupId={Number(id)} groupName={community.name} />
      <LoginDialog open={showLoginDialog} onOpenChange={setShowLoginDialog} />
    </div>
  );
}
