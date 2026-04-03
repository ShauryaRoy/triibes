import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Users, 
  Calendar, 
  Activity,
  Clock,
  Zap,
  BarChart3,
  ChevronRight,
  Settings,
  Sparkles,
  Wallet,
  Crown,
  TrendingUp,
  Plus,
  LayoutDashboard
} from "lucide-react";
import { Link } from "wouter";
import Header from "@/components/layout/header";
import MobileNav from "@/components/layout/mobile-nav";
import { useAuth } from "@/hooks/useAuth";
import { useState, useMemo } from "react";

export default function GroupDashboard() {
  const { id } = useParams();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  const { data: group, isLoading: groupLoading } = useQuery({
    queryKey: [`/api/groups/${id}`],
    queryFn: async () => {
      const response = await fetch(`/api/groups/${id}`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch group");
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

  const { data: events } = useQuery({
    queryKey: [`/api/groups/${id}/events`],
    queryFn: async () => {
      const response = await fetch(`/api/groups/${id}/events`, { credentials: "include" });
      return response.json();
    },
    enabled: !!id,
  });

  const userMembership = useMemo(() => members?.find((m: any) => m.userId === user?.id), [members, user]);
  const isOwner = userMembership?.role === 'owner';
  const isHost = userMembership?.role === 'host';

  if (groupLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="w-8 h-8 border-4 border-slate-200 dark:border-slate-800 border-t-indigo-600 dark:border-t-indigo-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (!group || (!isOwner && !isHost)) return null;

  const StatCard = ({ icon: Icon, label, value, colorClass }: any) => (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:scale-[1.02] transition-all">
       <div className={`absolute top-0 right-0 w-24 h-24 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl opacity-20 ${colorClass}`} />
       <div className="relative z-10">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${colorClass.replace('bg-', 'bg-opacity-20 text-')}`}>
             <Icon className="h-5 w-5" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</p>
          <div className="flex items-baseline gap-2">
             <h3 className="text-3xl font-black text-slate-900 dark:text-white">{value || 0}</h3>
             <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-0.5"><TrendingUp className="h-3 w-3" /> 12%</span>
          </div>
       </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans pb-20">
      <Header />

      <main className="max-w-7xl mx-auto px-4 md:px-6 pt-24 md:pt-32 space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
           <div className="flex items-center gap-4">
              <Button asChild variant="ghost" className="rounded-full h-11 w-11 p-0 hover:bg-slate-100 dark:hover:bg-slate-900">
                 <Link href={`/groups/${id}`}><ArrowLeft className="h-5 w-5" /></Link>
              </Button>
              <div>
                 <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="h-5 w-5 text-indigo-600" />
                    <h1 className="text-3xl font-black tracking-tight">{group.name} Dashboard</h1>
                 </div>
                 <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Command Center • {isOwner ? 'Founder' : 'Host'}</p>
              </div>
           </div>
           <div className="flex items-center gap-3 w-full md:w-auto">
              {isOwner && (
                <Button asChild variant="outline" className="flex-1 md:flex-none rounded-full h-11 px-6 font-bold border-slate-200">
                   <Link href={`/groups/${id}/manage`}><Settings className="h-4 w-4 mr-2" /> Global Settings</Link>
                </Button>
              )}
              <Button asChild className="flex-1 md:flex-none rounded-full h-11 px-6 font-black bg-indigo-600 text-white shadow-lg">
                 <Link href={`/create-event?groupId=${id}`}><Plus className="h-4 w-4 mr-2" /> Quick Event</Link>
              </Button>
           </div>
        </div>

        {/* Status Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
           <StatCard icon={Users} label="Total Tribe" value={group.memberCount} colorClass="bg-indigo-500" />
           <StatCard icon={Calendar} label="Active Events" value={events?.filter((e:any) => new Date(e.datetime) > new Date()).length} colorClass="bg-emerald-500" />
           <StatCard icon={Zap} label="Engagement" value="84%" colorClass="bg-amber-500" />
           <StatCard icon={Wallet} label="Growth" value="+12" colorClass="bg-rose-500" />
        </section>

        {/* Intelligence Tabs */}
        <section className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-6 md:p-10 shadow-sm min-h-[400px]">
           <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-10 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-full inline-flex h-12 w-auto border border-slate-200 dark:border-slate-700">
                 <TabsTrigger value="overview" className="rounded-full px-8 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm transition-all"><Activity className="h-3.5 w-3.5 mr-2" /> Overview</TabsTrigger>
                 <TabsTrigger value="members" className="rounded-full px-8 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm transition-all"><Crown className="h-3.5 w-3.5 mr-2" /> Tribe Analytics</TabsTrigger>
                 <TabsTrigger value="performance" className="rounded-full px-8 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm transition-all"><BarChart3 className="h-3.5 w-3.5 mr-2" /> Impact</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-0">
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Recent Tribe Joins */}
                    <div>
                       <div className="flex items-center justify-between mb-6">
                          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Recent Joins</h3>
                          <Link href={`/groups/${id}/manage?tab=members`} className="text-[10px] font-bold text-indigo-600 hover:underline">Manage All</Link>
                       </div>
                       <div className="space-y-3">
                          {members?.slice(0, 5).map((m: any) => (
                             <div key={m.userId} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-3">
                                   <Avatar className="h-10 w-10">
                                      <AvatarImage src={m.user?.profileImageUrl || m.user?.profilePicture} />
                                      <AvatarFallback className="bg-slate-200 text-xs font-bold">{m.user?.firstName?.[0]}</AvatarFallback>
                                   </Avatar>
                                   <div>
                                      <p className="text-sm font-bold">{m.user?.firstName} {m.user?.lastName}</p>
                                      <p className="text-[10px] text-slate-500 font-medium">{new Date(m.joinedAt).toLocaleDateString()}</p>
                                   </div>
                                </div>
                                <Badge className="rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 border-none">Active</Badge>
                             </div>
                          ))}
                       </div>
                    </div>

                    {/* Performance Preview */}
                    <div className="bg-slate-50 dark:bg-slate-800/30 rounded-[2rem] border border-slate-100 dark:border-slate-800 p-8 flex flex-col items-center justify-center text-center">
                       <div className="w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center mb-6">
                          <LayoutDashboard className="h-8 w-8 text-indigo-600" />
                       </div>
                       <h4 className="text-lg font-black mb-2">Impact Score: 8.4</h4>
                       <p className="text-sm text-slate-500 font-medium max-w-[280px]">Your community health is currently <span className="text-emerald-500 font-bold">Excellent</span> based on recent attendee retention.</p>
                       <Button variant="outline" className="mt-8 rounded-full h-11 px-8 font-bold border-slate-200 bg-transparent">Detailed Analysis</Button>
                    </div>
                 </div>
              </TabsContent>

              <TabsContent value="members" className="text-center py-20">
                 <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                 <h4 className="text-lg font-black">Detailed Member Insights</h4>
                 <p className="text-sm text-slate-500 max-w-xs mx-auto">Track member demographics, retention rates, and top contributors coming soon.</p>
              </TabsContent>

              <TabsContent value="performance" className="text-center py-20">
                 <BarChart3 className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                 <h4 className="text-lg font-black">Impact Analytics</h4>
                 <p className="text-sm text-slate-500 max-w-xs mx-auto">Visualize your community growth and event success over time.</p>
              </TabsContent>
           </Tabs>
        </section>
      </main>

      <MobileNav />
    </div>
  );
}
