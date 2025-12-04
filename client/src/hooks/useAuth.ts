import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

export async function fetchCurrentUser(): Promise<User | null> {
  try {
    // Add timeout to prevent hanging during slow connections
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const res = await fetch("/api/auth/user", { 
      credentials: "include",
      signal: controller.signal 
    });
    
    clearTimeout(timeoutId);
    
    if (!res.ok) {
      return null;
    }
    const data = await res.json();
    return data;
  } catch (error) {
    // If timeout or network error, assume not logged in
    return null;
  }
}

// Use React Query for auth to enable caching and avoid redundant fetches
export function useAuth() {
  // Read cached user from localStorage for instant render on repeat visits
  let cachedUser: User | null = null;
  try {
    const raw = localStorage.getItem('auth:user');
    cachedUser = raw ? (JSON.parse(raw) as User) : null;
  } catch { /* ignore */ }

  const { data: user = null, isLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      const result = await fetchCurrentUser();
      return result;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    retry: 1, // Only retry once on failure
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    placeholderData: cachedUser ?? undefined,
    meta: { description: 'auth-status' },
  });

  // Persist or clear cache on updates
  try {
    if (user) {
      localStorage.setItem('auth:user', JSON.stringify(user));
    } else {
      localStorage.removeItem('auth:user');
    }
  } catch { /* ignore */ }

  return { user, isLoading };
}
