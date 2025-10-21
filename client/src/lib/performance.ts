/**
 * Performance utilities for optimizing the app
 */

/**
 * Add passive event listeners for better scroll performance
 * This prevents the browser from waiting for the listener to complete before scrolling
 */
export function initPassiveListeners() {
  // Override addEventListener to make touch and wheel events passive by default
  const addEventListenerOriginal = EventTarget.prototype.addEventListener;
  
  EventTarget.prototype.addEventListener = function(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ) {
    const passiveEvents = ['touchstart', 'touchmove', 'wheel', 'mousewheel'];
    
    if (passiveEvents.includes(type)) {
      // Make the event passive if not explicitly set
      if (typeof options === 'object' && options !== null) {
        if (options.passive === undefined) {
          options.passive = true;
        }
      } else {
        options = { passive: true, capture: typeof options === 'boolean' ? options : false };
      }
    }
    
    return addEventListenerOriginal.call(this, type, listener, options);
  };
}

/**
 * Defer offscreen images by adding native lazy loading
 */
export function enableLazyLoading() {
  // Add native lazy loading to any remaining <img> tags
  const addLazyLoading = () => {
    const images = document.querySelectorAll('img:not([loading])');
    images.forEach(img => {
      img.setAttribute('loading', 'lazy');
      img.setAttribute('decoding', 'async');
    });
  };
  
  // Run immediately and after DOM changes
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addLazyLoading);
  } else {
    addLazyLoading();
  }
  
  // Observe DOM for new images
  const observer = new MutationObserver(() => {
    addLazyLoading();
  });
  
  observer.observe(document.body || document.documentElement, {
    childList: true,
    subtree: true
  });
}

/**
 * Optimize images for better LCP
 */
export function optimizeImages() {
  // Add importance hints to hero images
  const heroImages = document.querySelectorAll('img[data-hero], img.hero-image');
  heroImages.forEach(img => {
    img.setAttribute('fetchpriority', 'high');
    img.removeAttribute('loading'); // Don't lazy load hero images
  });
}

/**
 * Reduce layout shifts with content-visibility
 */
export function reduceLayoutShifts() {
  // Add content-visibility to off-screen elements
  const style = document.createElement('style');
  style.textContent = `
    /* Optimize rendering of off-screen content */
    .event-card:not(:first-child),
    .poster-item:not(:first-child) {
      content-visibility: auto;
      contain-intrinsic-size: 300px;
    }
    
    /* Font display optimization */
    * {
      font-display: swap;
    }
    
    /* Aspect ratio boxes to prevent layout shifts */
    img, video {
      height: auto;
    }
  `;
  document.head.appendChild(style);
}

/**
 * Preconnect to external domains for faster loading
 */
export function addPreconnects() {
  const preconnectDomains = [
    'https://firebasestorage.googleapis.com',
    'https://accounts.google.com',
    'https://pub-235cf704af824b4f862d187c67946951.r2.dev'
  ];
  
  preconnectDomains.forEach(domain => {
    // Check if already exists
    if (!document.querySelector(`link[href="${domain}"]`)) {
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = domain;
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    }
  });
}

/**
 * Enable back/forward cache by handling page lifecycle
 */
export function enableBFCache() {
  // Handle page show event for back/forward cache
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
      // Page was restored from cache - refresh stale data
      console.log('Page restored from bfcache');
      // Trigger any necessary data refresh here
    }
  });
  
  // Handle page hide event
  window.addEventListener('pagehide', () => {
    // Clean up to allow bfcache - remove any blocking resources
  });
  
  // Avoid blocking BFCache with unload handlers
  window.addEventListener('beforeunload', (e) => {
    // Don't set returnValue unless absolutely necessary
    delete e.returnValue;
  });
}

/**
 * Optimize DOM size by limiting rendered items
 */
export function optimizeDOMSize() {
  // Monitor DOM size
  const checkDOMSize = () => {
    const nodeCount = document.getElementsByTagName('*').length;
    if (nodeCount > 1500) {
      console.warn(`Large DOM detected: ${nodeCount} nodes. Consider virtualization.`);
    }
  };
  
  // Check periodically
  setTimeout(checkDOMSize, 5000);
}

/**
 * Prevent forced reflows by batching DOM reads/writes
 */
export function preventForcedReflows() {
  // Intercept common reflow-causing property reads
  let rafScheduled = false;
  const reads: Array<() => void> = [];
  const writes: Array<() => void> = [];
  
  const scheduleBatch = () => {
    if (!rafScheduled) {
      rafScheduled = true;
      requestAnimationFrame(() => {
        // Do all reads first
        reads.forEach(read => read());
        reads.length = 0;
        
        // Then all writes
        writes.forEach(write => write());
        writes.length = 0;
        
        rafScheduled = false;
      });
    }
  };
  
  // Helper for developers to batch operations
  (window as any).batchRead = (fn: () => void) => {
    reads.push(fn);
    scheduleBatch();
  };
  
  (window as any).batchWrite = (fn: () => void) => {
    writes.push(fn);
    scheduleBatch();
  };
}

/**
 * Initialize all performance optimizations
 */
export function initPerformanceOptimizations() {
  // Init all optimizations
  initPassiveListeners();
  enableLazyLoading();
  reduceLayoutShifts();
  addPreconnects();
  enableBFCache();
  optimizeDOMSize();
  preventForcedReflows();
  
  // Optimize images after load
  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', optimizeImages);
  } else {
    optimizeImages();
  }
  
  // Remove console logs in production
  if (import.meta.env.PROD) {
    console.log = () => {};
    console.warn = () => {};
    console.error = () => {};
  }
}

