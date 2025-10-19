import { useEffect, useState } from "react";
import type { User } from "@shared/schema";

export async function fetchCurrentUser(): Promise<User | null> {
  try {
    console.log("Fetching current user...");
    const res = await fetch("/api/auth/user", { 
      credentials: "include",
      signal: AbortSignal.timeout(5000) // Add 5 second timeout
    });
    console.log("Auth response status:", res.status);
    if (!res.ok) return null;
    const data = await res.json();
    console.log("Auth data:", data);
    return data;
  } catch (error) {
    console.log("Auth error:", error);
    return null;
  }
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    console.log("useAuth: Starting auth check...");
    setIsLoading(true);
    
    // Add a maximum timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (mounted) {
        console.log("useAuth: Timeout reached, setting loading to false");
        setIsLoading(false);
        setUser(null);
      }
    }, 10000); // 10 second max timeout

    fetchCurrentUser().then((u) => {
      if (mounted) {
        console.log("useAuth: Auth check completed, user:", u);
        clearTimeout(timeoutId);
        setUser(u);
        setIsLoading(false);
      }
    }).catch((error) => {
      if (mounted) {
        console.log("useAuth: Auth check failed:", error);
        clearTimeout(timeoutId);
        setUser(null);
        setIsLoading(false);
      }
    });

    return () => { 
      mounted = false; 
      clearTimeout(timeoutId);
    };
  }, []);

  console.log("useAuth: Current state - user:", user, "isLoading:", isLoading);
  return { user, isLoading };
}
