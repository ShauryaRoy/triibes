import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import EventDetails from "@/pages/event-details";
import CreateEvent from "@/pages/create-event";
import Discover from "@/pages/discover";
import EventShare from "@/pages/event-share";
import Profile from "@/pages/profile";
import Communities from "@/pages/communities";
import CommunityDetails from "@/pages/community-details";
import CommunityManage from "@/pages/community-manage";
import CreateCommunity from "./pages/create-community";

function Router() {
  const { user, isLoading } = useAuth();
  const isAuthenticated = !!user;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-bg">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/" component={isAuthenticated ? Home : Landing} />
      <Route path="/create-event" component={CreateEvent} />
      <Route path="/discover" component={Discover} />
      <Route path="/groups" component={Communities} />
  <Route path="/groups/create" component={CreateCommunity} />
      <Route path="/groups/:id" component={CommunityDetails} />
      <Route path="/groups/:id/manage" component={CommunityManage} />
      <Route path="/profile" component={Profile} />
      <Route path="/events/:id" component={EventDetails} />
      <Route path="/events/:id/share" component={EventShare} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
