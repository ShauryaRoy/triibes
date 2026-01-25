import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { ErrorBoundary } from "@/components/error-boundary";
import Header from "@/components/layout/header";
import { lazy, Suspense, useEffect } from "react";
import { ThemeProvider } from "@/contexts/ThemeContext";

// ⚡ OPTIMIZED: Lazy load pages for faster initial load
// Only Landing and Home are eagerly loaded since they're the entry points
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import NotFound from "@/pages/not-found";

// Lazy load all other pages
const EventDetails = lazy(() => import("@/pages/event-details"));
const CreateEvent = lazy(() => import("@/pages/create-event"));
const EditEvent = lazy(() => import("@/pages/edit-event"));
const Discover = lazy(() => import("@/pages/discover"));
const Profile = lazy(() => import("@/pages/profile"));
const Communities = lazy(() => import("@/pages/communities"));
const CommunityDetails = lazy(() => import("@/pages/community-details"));
const CommunityManage = lazy(() => import("@/pages/community-manage"));
const CreateCommunity = lazy(() => import("./pages/create-community"));
const InvitePage = lazy(() => import("@/pages/invite"));
const EventInvitePage = lazy(() => import("@/pages/event-invite"));

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-black">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
);

function Router() {
  const { user, isLoading } = useAuth();
  const isAuthenticated = !!user;
  const [, setLocation] = useLocation();

  // Handle OAuth callback and redirect to stored URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const oauthSuccess = params.get('oauth') === 'success';
      
      if (oauthSuccess && user && !isLoading) {
        console.log("[DEBUG] 🔵 OAuth success and user loaded, checking for redirect");
        
        // Check if there's a redirect URL in sessionStorage
        const redirectUrl = sessionStorage.getItem('redirectAfterLogin');
        
        if (redirectUrl) {
          console.log("[DEBUG] 🔵 Found redirect URL:", redirectUrl);
          // Don't clear sessionStorage here - let the event-details page handle it
          // Just redirect to the stored URL
          setLocation(redirectUrl);
        }
      }
    }
  }, [user, isLoading, setLocation]);

  // Handle OAuth callback by showing loading state while auth resolves
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const oauthSuccess = params.get('oauth') === 'success';
    
    if (oauthSuccess && isLoading) {
      return <PageLoader />;
    }
  }

  return (
    <>
      <Suspense fallback={<PageLoader />}>
        <Switch>
          {/* Root: if authenticated go Home, if not show Landing */}
          <Route path="/">
            {isAuthenticated ? <Home /> : <Landing />}
          </Route>
          <Route path="/create-event" component={CreateEvent} />
          <Route path="/edit-event/:id" component={EditEvent} />
          <Route path="/discover" component={Discover} />
          <Route path="/groups" component={Communities} />
          <Route path="/groups/create" component={CreateCommunity} />
          <Route path="/groups/:id" component={CommunityDetails} />
          <Route path="/groups/:id/manage" component={CommunityManage} />
          <Route path="/profile" component={Profile} />
          <Route path="/events/:id" component={EventDetails} />
          <Route path="/invite/:code" component={InvitePage} />
          <Route path="/event-invite/:code" component={EventInvitePage} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </>
  );
}

function App() {
  return (
    <ThemeProvider>
      <TooltipProvider>
        <QueryClientProvider client={queryClient}>
          <ErrorBoundary>
            <Router />
          </ErrorBoundary>
          <Toaster />
        </QueryClientProvider>
      </TooltipProvider>
    </ThemeProvider>
  );
}

export default App;
