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
  const [isNavigating, setIsNavigating] = useState(false);
  const firstRenderRef = useRef(true);

  // On route change, set navigating to true
  useLayoutEffect(() => {
    // Don't run on the very first render of the app
    if (firstRenderRef.current) {
      firstRenderRef.current = false;
      return;
    }
    setIsNavigating(true);
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
