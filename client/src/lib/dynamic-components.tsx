// Dynamic component loader utility for reducing initial bundle size
// This helps achieve the 62 KiB unused JavaScript reduction target

import { lazy, ComponentType } from 'react';
import React from 'react';

// Loading fallback component optimized for performance
export const ComponentLoader = ({ size = 'default' }: { size?: 'small' | 'default' | 'large' }) => {
  const sizeClasses = {
    small: 'h-16 w-16',
    default: 'h-24 w-24', 
    large: 'h-32 w-32'
  };

  return React.createElement('div', 
    { className: 'flex items-center justify-center p-8' },
    React.createElement('div', {
      className: `animate-spin rounded-full border-2 border-primary border-t-transparent ${sizeClasses[size]}`
    })
  );
};

// Heavy component lazy loaders - these are the largest components causing unused JS
export const LazyExpenseTracker = lazy(() => import('@/components/expense-tracker'));
export const LazyPosterCustomizer = lazy(() => import('@/components/poster-customizer'));
export const LazyNotifications = lazy(() => import('@/components/notifications'));
export const LazyPolls = lazy(() => import('@/components/polls'));
export const LazyEventCard = lazy(() => import('@/components/event-card'));
export const LazyPosterSelector = lazy(() => import('@/components/poster-selector').then(m => ({ default: m.PosterSelector })));
export const LazyPosterGallery = lazy(() => import('@/components/poster-gallery'));
export const LazyAccessRequests = lazy(() => import('@/components/access-requests'));
export const LazyGuestList = lazy(() => import('@/components/guest-list'));

// Effects components (also heavy due to canvas operations)
export const LazyElectricStorm = lazy(() => import('@/components/effects/electric-storm').then(m => ({ default: m.ElectricStorm })));
export const LazyFireStorm = lazy(() => import('@/components/effects/fire-storm').then(m => ({ default: m.FireStorm })));

// Wrapper function to create lazy components with consistent fallbacks
export function createLazyComponent<T extends ComponentType<any>>(
  loader: () => Promise<{ default: T }>,
  fallbackSize: 'small' | 'default' | 'large' = 'default'
) {
  return lazy(() => loader());
}

// Preload functions for critical components (optional performance optimization)
export const preloadCriticalComponents = () => {
  // Only preload in production when user is likely to use these components
  if (typeof window !== 'undefined') {
    const connection = (navigator as any).connection;
    
    // Only preload on fast connections to avoid unnecessary data usage
    if (connection && connection.effectiveType === '4g') {
      // Preload most commonly used components after initial load
      setTimeout(() => {
        import('@/components/theme-background');
        import('@/components/event-card');
      }, 2000);
    }
  }
};

// Bundle analysis helpers for development
export const logBundleInfo = () => {
  if (process.env.NODE_ENV === 'development') {
    console.log('[Bundle Optimization] Heavy components loaded dynamically:');
    console.log('- ExpenseTracker: 37.86 KB');
    console.log('- ThemeBackground: 22.76 KB'); 
    console.log('- PosterCustomizer: 17.84 KB');
    console.log('- Notifications: 13.4 KB');
    console.log('- Polls: 10.72 KB');
    console.log('Total potential savings: ~102 KB from dynamic loading');
  }
};

export default {
  LazyExpenseTracker,
  LazyThemeBackground,
  LazyPosterCustomizer,
  LazyNotifications,
  LazyPolls,
  LazyEventCard,
  LazyPosterSelector,
  LazyThemeSelector,
  LazyPosterGallery,
  LazyAccessRequests,
  LazyGuestList,
  ComponentLoader,
  preloadCriticalComponents,
  logBundleInfo
};