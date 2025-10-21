import { createContext, useContext, useLayoutEffect, useState, useCallback, useRef } from "react";
import { useLocation } from "wouter";

type NavigationContextType = {
  isNavigating: boolean;
  endNavigation: () => void;
};

const NavigationContext = createContext<NavigationContextType>({
  isNavigating: false,
  endNavigation: () => {},
});

export const useNavigation = () => useContext(NavigationContext);

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [isNavigating, setIsNavigating] = useState(true); // Start with navigating=true
  const firstRenderRef = useRef(true);

  // On route change, set navigating to true
  useLayoutEffect(() => {
    // Set navigating to true on route changes (including first load)
    setIsNavigating(true);
    
    // Auto-clear after 5 seconds as failsafe
    const timeout = setTimeout(() => {
      setIsNavigating(false);
    }, 5000);
    
    return () => clearTimeout(timeout);
  }, [location]);

  // Provide a way for pages to signal that navigation is complete
  const endNavigation = useCallback(() => {
    setIsNavigating(false);
  }, []);

  return (
    <NavigationContext.Provider value={{ isNavigating, endNavigation }}>
      {children}
    </NavigationContext.Provider>
  );
}
