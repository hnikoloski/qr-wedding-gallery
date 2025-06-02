"use client";

import { useEffect } from "react";

export default function PerformanceMonitor() {
  useEffect(() => {
    // Only run performance monitoring in development
    if (process.env.NODE_ENV === "development") {
      const logPerformanceMetrics = () => {
        if (typeof window !== "undefined" && window.performance) {
          const navigation = performance.getEntriesByType(
            "navigation"
          )[0] as PerformanceNavigationTiming;

          // Basic performance metrics for development debugging
          const metrics = {
            domContentLoaded: Math.round(
              navigation.domContentLoadedEventEnd -
                navigation.domContentLoadedEventStart
            ),
            windowLoad: Math.round(
              navigation.loadEventEnd - navigation.loadEventStart
            ),
            totalLoadTime: Math.round(
              navigation.loadEventEnd - navigation.fetchStart
            ),
            firstPaint: Math.round(
              navigation.domContentLoadedEventEnd - navigation.fetchStart
            ),
            networkLatency: Math.round(
              navigation.responseEnd - navigation.fetchStart
            ),
          };

          // Only log in development
          console.log("🚀 Performance Metrics (Development):", metrics);
        }
      };

      // Run after component mounts
      const timeoutId = setTimeout(logPerformanceMetrics, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, []);

  // Don't render anything in production
  return null;
}
