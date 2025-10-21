// Web Vitals monitoring for performance tracking
// Import this in main.tsx to track Core Web Vitals

export function reportWebVitals(metric: any) {
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(metric);
  }
  
  // In production, send to analytics
  // Example: sendToAnalytics(metric);
}

// Optional: Track specific metrics
export function initWebVitals() {
  if ('web-vital' in window) {
    // Use web-vitals library if installed
    // import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';
    // getCLS(reportWebVitals);
    // getFID(reportWebVitals);
    // getFCP(reportWebVitals);
    // getLCP(reportWebVitals);
    // getTTFB(reportWebVitals);
  }
}

// Track long tasks that block the main thread
export function trackLongTasks() {
  if ('PerformanceObserver' in window) {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          // Log tasks longer than 50ms
          if (entry.duration > 50) {
            console.warn('Long task detected:', {
              duration: entry.duration,
              startTime: entry.startTime,
            });
          }
        }
      });
      
      observer.observe({ entryTypes: ['longtask'] });
    } catch (e) {
      // longtask observer not supported
    }
  }
}
