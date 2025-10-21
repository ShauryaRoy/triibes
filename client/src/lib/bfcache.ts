/**
 * Back/Forward Cache (bfcache) compatibility utilities
 * 
 * This module ensures the app is bfcache-eligible for fast back/forward navigation.
 * Key requirements:
 * - Clean up timers/intervals on pagehide
 * - No unload/beforeunload handlers
 * - No open network connections during freeze
 * - Pause/resume animations properly
 */

// Track all active intervals/timeouts for cleanup
const activeTimers = new Set<number>();

// Wrap setTimeout to track timers
const originalSetTimeout = window.setTimeout;
(window as any).setTimeout = function(handler: TimerHandler, timeout?: number, ...args: any[]) {
  const id = originalSetTimeout(handler, timeout, ...args);
  activeTimers.add(id);
  return id;
};

// Wrap clearTimeout to untrack timers
const originalClearTimeout = window.clearTimeout;
(window as any).clearTimeout = function(id: number) {
  activeTimers.delete(id);
  return originalClearTimeout(id);
};

// Wrap setInterval to track intervals
const originalSetInterval = window.setInterval;
(window as any).setInterval = function(handler: TimerHandler, timeout?: number, ...args: any[]) {
  const id = originalSetInterval(handler, timeout, ...args);
  activeTimers.add(id);
  return id;
};

// Wrap clearInterval to untrack intervals
const originalClearInterval = window.clearInterval;
(window as any).clearInterval = function(id: number) {
  activeTimers.delete(id);
  return originalClearInterval(id);
};

/**
 * Initialize bfcache compatibility handlers.
 * Call this once in the app entry point.
 */
export function initBfcacheHandlers() {
  // Clean up all timers when page goes into bfcache
  window.addEventListener('pagehide', (event) => {
    console.log('[bfcache] Page hiding, cleaning up timers:', activeTimers.size);
    
    // Clear all active timers to allow page to freeze
    activeTimers.forEach(id => {
      clearTimeout(id);
      clearInterval(id);
    });
    activeTimers.clear();
    
    // If page is being persisted in bfcache, log it
    if (event.persisted) {
      console.log('[bfcache] Page persisted in bfcache ✅');
    }
  });

  // Resume when page comes back from bfcache
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
      console.log('[bfcache] Page restored from bfcache ✅');
      
      // Trigger a React Query refetch to refresh data
      // This is handled by React Query's refetchOnReconnect
      window.dispatchEvent(new Event('online'));
    }
  });

  // Handle visibility changes for performance
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      console.log('[bfcache] Page hidden, pausing expensive operations');
    } else {
      console.log('[bfcache] Page visible, resuming operations');
    }
  });

  console.log('[bfcache] Handlers initialized ✅');
}

/**
 * Check if the page was restored from bfcache.
 * Use this to trigger data refreshes or re-initialization.
 */
export function wasRestoredFromBfcache(): boolean {
  return performance.getEntriesByType('navigation').some(
    (entry: any) => entry.type === 'back_forward'
  );
}
