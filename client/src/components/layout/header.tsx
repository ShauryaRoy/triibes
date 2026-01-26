import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Calendar, Bell, Settings, LogOut, Search, User, Users, Check, X, UserCheck, MapPin, CheckCheck, Moon, Sun } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useState, useMemo, memo } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

// Memoized constant styles to avoid GC overhead
// const TRANSPARENT_BG_STYLE = { background: 'transparent' } as const;

export default function Header() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { theme, toggleTheme } = useTheme();
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [location] = useLocation();

  // ✅ OPTIMIZED: Fetch notifications only when dropdown is open
  // ✅ Added caching with staleTime and gcTime to reduce refetches
  const { data: notificationData } = useQuery({
    queryKey: ['/api/notifications'],
    queryFn: async () => {
      if (!user) return { notifications: [], unreadCount: 0 };
      const response = await fetch('/api/notifications', { credentials: 'include' });
      if (!response.ok) return { notifications: [], unreadCount: 0 };
      return response.json();
    },
    enabled: !!user && notificationOpen, // ✅ Only fetch when dropdown is open
    staleTime: 60000, // ✅ Cache for 60 seconds - don't refetch if data is fresh
    gcTime: 300000, // ✅ Keep in memory for 5 minutes
    refetchInterval: notificationOpen ? 30000 : false, // ✅ Only poll when dropdown is open
  });

  const notifications = notificationData?.notifications || [];
  const unreadCount = notificationData?.unreadCount || 0;

  // ✅ OPTIMIZED: Handle access request with optimistic updates and targeted invalidation
  const handleAccessRequestMutation = useMutation({
    mutationFn: async ({ notificationId, eventId, action, userId }: { 
      notificationId: number; 
      eventId: number; 
      action: 'approve' | 'deny';
      userId: string;
    }) => {
      const response = await apiRequest('POST', `/api/events/${eventId}/access-requests/respond`, {
        userId,
        action
      });
      if (!response.ok) throw new Error('Failed to respond to access request');
      
      await apiRequest('DELETE', `/api/notifications/${notificationId}`, {});
      
      return response.json();
    },
    onMutate: async (variables) => {
      // ✅ Optimistic update: Remove notification from UI immediately
      await queryClient.cancelQueries({ queryKey: ['/api/notifications'] });
      const previousData = queryClient.getQueryData(['/api/notifications']);
      
      queryClient.setQueryData(['/api/notifications'], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          notifications: old.notifications.filter((n: any) => n.id !== variables.notificationId),
          unreadCount: Math.max(0, old.unreadCount - 1)
        };
      });
      
      return { previousData };
    },
    onSuccess: (data, variables) => {
      // ✅ Only invalidate specific event query, not all notifications
      queryClient.invalidateQueries({ queryKey: [`/api/events/${variables.eventId}`] });
      toast({
        title: variables.action === 'approve' ? 'Access Approved' : 'Access Denied',
        description: variables.action === 'approve' 
          ? 'The user can now view the full event details' 
          : 'The access request has been declined',
      });
    },
    onError: (error: any, variables, context) => {
      // ✅ Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(['/api/notifications'], context.previousData);
      }
      toast({
        title: 'Error',
        description: error.message || 'Failed to respond to access request',
        variant: 'destructive',
      });
    },
  });

  // ✅ OPTIMIZED: Mark as read with optimistic update
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      const response = await apiRequest('PATCH', `/api/notifications/${notificationId}/read`, {});
      if (!response.ok) throw new Error('Failed to mark as read');
      return response.json();
    },
    onMutate: async (notificationId) => {
      // ✅ Optimistic update: Mark as read immediately in UI
      await queryClient.cancelQueries({ queryKey: ['/api/notifications'] });
      const previousData = queryClient.getQueryData(['/api/notifications']);
      
      queryClient.setQueryData(['/api/notifications'], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          notifications: old.notifications.map((n: any) => 
            n.id === notificationId ? { ...n, read: true } : n
          ),
          unreadCount: Math.max(0, old.unreadCount - 1)
        };
      });
      
      return { previousData };
    },
    onError: (error: any, variables, context) => {
      // ✅ Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(['/api/notifications'], context.previousData);
      }
    },
  });

  const handleAccessRequest = (notification: any, action: 'approve' | 'deny') => {
    if (!notification.eventId || !notification.fromUserId) return;
    
    handleAccessRequestMutation.mutate({
      notificationId: notification.id,
      eventId: notification.eventId,
      action,
      userId: notification.fromUserId
    });
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'access_request': return <UserCheck className="h-3 w-3 text-orange-400" />;
      case 'rsvp_update': return <Users className="h-3 w-3 text-green-400" />;
      case 'event_update': return <MapPin className="h-3 w-3 text-blue-400" />;
      case 'access_response': return <Check className="h-3 w-3 text-purple-400" />;
      default: return <Bell className="h-3 w-3 text-gray-400" />;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const handleLogout = async () => {
    // Clear the cached user from localStorage before logout
    try {
      localStorage.removeItem('auth:user');
    } catch (e) {
      console.error('Failed to clear auth cache:', e);
    }
    // Redirect to logout endpoint which will clear session
    window.location.href = "/api/auth/logout";
  };

  const notificationItems = useMemo(() => {
    return notifications.slice(0, 10).map((notification: any) => (
      <NotificationItem
        key={notification.id}
        notification={notification}
        onAccessRequest={handleAccessRequest}
        onMarkAsRead={(id: number) => markAsReadMutation.mutate(id)}
        formatTimeAgo={formatTimeAgo}
        getNotificationIcon={getNotificationIcon}
        isPending={handleAccessRequestMutation.isPending || markAsReadMutation.isPending}
      />
    ));
  }, [notifications, handleAccessRequestMutation.isPending, markAsReadMutation.isPending]);

  return (
    <header className="fixed top-0 inset-x-0 z-50 flex justify-center p-2  pointer-events-none ">
      <div className="pointer-events-auto bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-full pl-5 pr-2 py-2  flex items-center gap-2 md:gap-10 shadow-[0_2px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_20px_rgba(0,0,0,0.2)] border border-slate-200/50 dark:border-slate-700/50">
        {/* Logo */}
        <Link href="/">
          <div className="flex items-center cursor-pointer mr-2">
            <span className="font-black text-xl tracking-tight text-slate-900 dark:text-white">Tribbe</span>
            <div className="w-1.5 h-1.5 rounded-full bg-violet-500 ml-0.5" />
          </div>
        </Link>
        
        {/* Nav Links */}
        <nav className="hidden md:flex items-center gap-1">
          <Link href="/">
            <button className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${location === '/' ? 'bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
              Events
            </button>
          </Link>
          <Link href="/groups">
            <button className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${location.startsWith('/groups') || location.startsWith('/communities') ? 'bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
              Groups
            </button>
          </Link>
          <Link href="/discover">
            <button className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${location === '/discover' ? 'bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
              Discover
            </button>
          </Link>
        </nav>
        
        {/* Right side actions */}
        <div className="flex items-center gap-2 ml-2">
          {/* Notifications Dropdown */}
          {user && (
              <DropdownMenu open={notificationOpen} onOpenChange={setNotificationOpen}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative text-slate-600 dark:text-slate-300 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/30"
                  >
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 h-4 w-4 bg-gradient-to-r from-violet-500 to-purple-500 rounded-full flex items-center justify-center text-xs text-white shadow-sm">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-slate-200 dark:border-slate-700 shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 rounded-xl">
                  <div className="p-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-slate-900 dark:text-white">Notifications</h3>
                      {unreadCount > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            // ✅ OPTIMIZED: Mark all as read with optimistic update
                            const previousData = queryClient.getQueryData(['/api/notifications']);
                            queryClient.setQueryData(['/api/notifications'], (old: any) => ({
                              ...old,
                              notifications: old?.notifications?.map((n: any) => ({ ...n, read: true })) || [],
                              unreadCount: 0
                            }));
                            
                            fetch('/api/notifications/read-all', {
                              method: 'PATCH',
                              credentials: 'include'
                            }).catch(() => {
                              // Rollback on error
                              queryClient.setQueryData(['/api/notifications'], previousData);
                            });
                          }}
                          className="text-xs text-violet-600 hover:text-violet-700 hover:bg-violet-50"
                        >
                          <CheckCheck className="h-3 w-3 mr-1" />
                          Mark all read
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-slate-400">
                      <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No notifications</p>
                    </div>
                  ) : (
                    <div className="max-h-80 overflow-y-auto">
                      {notificationItems}
                    </div>
                  )}
                  
                  {notifications.length > 10 && (
                    <div className="p-3 text-center border-t border-slate-100">
                      <Button variant="ghost" size="sm" className="text-xs text-violet-600 hover:text-violet-700">
                        View all notifications
                      </Button>
                    </div>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Avatar className="w-9 h-9 cursor-pointer border-2 border-violet-100 hover:border-violet-300 transition-colors">
                  <AvatarImage src={user?.profileImageUrl || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-violet-100 to-purple-100 text-violet-700 text-sm">
                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-slate-200 dark:border-slate-700 shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 rounded-xl">
                <div className="flex items-center space-x-2 p-2">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={user?.profileImageUrl || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-violet-100 to-purple-100 text-violet-700 text-xs">
                      {user?.firstName?.[0]}{user?.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {user?.email}
                    </p>
                  </div>
                </div>
                <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800" />
                <DropdownMenuItem className="text-slate-700 dark:text-slate-300 hover:bg-violet-50 dark:hover:bg-violet-900/30 hover:text-violet-700 dark:hover:text-violet-400 cursor-pointer" onClick={() => window.location.href = '/profile'}>
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem className="text-slate-700 dark:text-slate-300 hover:bg-violet-50 dark:hover:bg-violet-900/30 hover:text-violet-700 dark:hover:text-violet-400 cursor-pointer" onClick={toggleTheme}>
                  {theme === 'light' ? (
                    <><Moon className="mr-2 h-4 w-4" />Dark Mode</>
                  ) : (
                    <><Sun className="mr-2 h-4 w-4" />Light Mode</>
                  )}
                </DropdownMenuItem>
                {/* <DropdownMenuItem className="hover:bg-dark-card">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem> */}
                <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800" />
                <DropdownMenuItem 
                  className="text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 cursor-pointer"
                  onClick={handleLogout}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
    </header>
  );
}

// ✅ OPTIMIZED: Memoized notification item component to prevent unnecessary re-renders
const NotificationItem = memo(({ 
  notification, 
  onAccessRequest, 
  onMarkAsRead, 
  formatTimeAgo, 
  getNotificationIcon,
  isPending 
}: { 
  notification: any; 
  onAccessRequest: (notification: any, action: 'approve' | 'deny') => void;
  onMarkAsRead: (id: number) => void;
  formatTimeAgo: (dateString: string) => string;
  getNotificationIcon: (type: string) => JSX.Element;
  isPending: boolean;
}) => {
  return (
    <div
      className={`p-3 border-b border-dark-border/50 hover:bg-dark-card/50 transition-colors ${
        !notification.read ? 'bg-primary/5' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-1 flex-shrink-0">
          {getNotificationIcon(notification.type)}
        </div>
        
        <div className="flex-1 space-y-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-medium truncate">{notification.title}</h4>
            <span className="text-xs text-muted-foreground flex-shrink-0">
              {formatTimeAgo(notification.createdAt)}
            </span>
          </div>
          
          <p className="text-xs text-muted-foreground leading-relaxed">
            {notification.message}
          </p>
          
          {notification.fromUser && (
            <div className="flex items-center gap-2 mt-2">
              <Avatar className="w-4 h-4">
                <AvatarImage src={notification.fromUser.profileImageUrl} loading="lazy" />
                <AvatarFallback className="text-xs">
                  {notification.fromUser.firstName[0]}{notification.fromUser.lastName[0]}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground">
                {notification.fromUser.firstName} {notification.fromUser.lastName}
              </span>
            </div>
          )}
          
          {/* Action buttons for access requests */}
          {notification.type === 'access_request' && notification.eventId && (
            <div className="flex gap-2 mt-2">
              <Button
                size="sm"
                onClick={() => onAccessRequest(notification, 'approve')}
                disabled={isPending}
                className="bg-green-600 hover:bg-green-700 text-white h-6 px-2 text-xs"
              >
                <Check className="h-3 w-3 mr-1" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onAccessRequest(notification, 'deny')}
                disabled={isPending}
                className="border-red-300 text-red-400 hover:bg-red-50 h-6 px-2 text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                Deny
              </Button>
            </div>
          )}
          
          {/* Mark as read button for non-action notifications */}
          {!notification.read && notification.type !== 'access_request' && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onMarkAsRead(notification.id)}
              disabled={isPending}
              className="text-xs mt-1 h-6 px-2"
            >
              <Check className="h-3 w-3 mr-1" />
              Mark as read
            </Button>
          )}
        </div>
      </div>
    </div>
  );
});
