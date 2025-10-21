import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

export async function fetchCurrentUser(): Promise<User | null> {
  try {
    console.log("[DEBUG] 🔵 fetchCurrentUser called - starting fetch to /api/auth/user");
    // 🔥 CRITICAL: Add timeout to prevent hanging during slow connections (Lighthouse audits)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const res = await fetch("/api/auth/user", { 
      credentials: "include",
      signal: controller.signal 
    });
    
    clearTimeout(timeoutId);
    
    console.log("[DEBUG] 🔵 fetchCurrentUser - response status:", res.status);
    
    if (!res.ok) {
      console.log("[DEBUG] ❌ fetchCurrentUser - response not OK, returning null");
      return null;
    }
    const data = await res.json();
    console.log("[DEBUG] ✅ fetchCurrentUser - got data:", data);
    return data;
  } catch (error) {
    // If timeout or network error, assume not logged in
    console.error('[DEBUG] ❌ Failed to fetch user:', error);
    return null;
  }
}

// ⚡ OPTIMIZED: Use React Query for auth to enable caching and avoid redundant fetches
// 🚀 CRITICAL FIX: Use placeholderData to render immediately, even during slow auth check
export function useAuth() {
  // Read cached user from localStorage for instant render on repeat visits
  let cachedUser: User | null = null;
  try {
    const raw = localStorage.getItem('auth:user');
    cachedUser = raw ? (JSON.parse(raw) as User) : null;
    console.log("[DEBUG] 🔵 Cached user from localStorage:", cachedUser ? `${cachedUser.email} (${cachedUser.id})` : "none");
  } catch { /* ignore */ }

  const { data: user = null, isLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      console.log("[DEBUG] 🔵 Fetching current user from /api/auth/user...");
      const result = await fetchCurrentUser();
      console.log("[DEBUG] ✅ Fetched user:", result ? `${result.email} (${result.id})` : "null (not authenticated)");
      return result;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    retry: 1, // Only retry once on failure
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    // DON'T use initialData - it prevents fetching!
    // Use placeholderData instead for optimistic rendering
    placeholderData: cachedUser ?? undefined,
    meta: { description: 'auth-status' },
  });

  // Persist or clear cache on updates
  try {
    if (user) {
      console.log("[DEBUG] ✅ Saving user to localStorage:", `${user.email} (${user.id})`);
      localStorage.setItem('auth:user', JSON.stringify(user));
    } else {
      console.log("[DEBUG] 🔵 Removing user from localStorage");
      localStorage.removeItem('auth:user');
    }
  } catch { /* ignore */ }

  console.log("[DEBUG] 🔵 useAuth returning - isAuthenticated:", !!user, "isLoading:", isLoading);

  return { user, isLoading };
}
