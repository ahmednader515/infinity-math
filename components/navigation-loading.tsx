"use client";

import { useEffect, useRef, useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useNavigation } from "@/lib/contexts/navigation-context";
import { cn } from "@/lib/utils";

export const NavigationLoading = () => {
  const { isNavigating, startNavigating, stopNavigating } = useNavigation();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastPathnameRef = useRef<string>(pathname || "");
  const pendingNavigationRef = useRef<boolean>(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const navigationStartTimeRef = useRef<number>(0);

  const currentLocation = useMemo(() => {
    const search = searchParams?.toString();
    return search ? `${pathname}?${search}` : pathname || "";
  }, [pathname, searchParams]);

  // Initialize lastPathnameRef on mount
  useEffect(() => {
    lastPathnameRef.current = pathname || "";
  }, []);

  // Additional fallback: Watch for page readiness
  useEffect(() => {
    if (!pendingNavigationRef.current || !isNavigating) return;

    const checkPageReady = () => {
      // If document is ready and enough time has passed since navigation started
      if (
        (document.readyState === "complete" || document.readyState === "interactive") &&
        Date.now() - navigationStartTimeRef.current > 300
      ) {
        // Check if pathname matches what we expect (or has changed)
        const currentPath = pathname || "";
        if (currentPath !== lastPathnameRef.current || currentPath) {
          // Give it a moment for React to finish rendering
          setTimeout(() => {
            if (pendingNavigationRef.current) {
              pendingNavigationRef.current = false;
              stopNavigating();
            }
          }, 100);
        }
      }
    };

    // Check immediately
    checkPageReady();

    // Also listen for readystatechange
    document.addEventListener("readystatechange", checkPageReady);

    return () => {
      document.removeEventListener("readystatechange", checkPageReady);
    };
  }, [isNavigating, pathname, stopNavigating]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleClick = (e: MouseEvent) => {
      // Find the closest anchor or button element
      let target = e.target as HTMLElement;
      let link: HTMLAnchorElement | null = null;
      let button: HTMLButtonElement | null = null;

      // Traverse up the DOM to find a link or button
      while (target && target !== document.body) {
        if (target.tagName === "A") {
          link = target as HTMLAnchorElement;
          break;
        }
        if (target.tagName === "BUTTON") {
          button = target as HTMLButtonElement;
          // Check if button is in sidebar or has navigation-related attributes
          const isInSidebar = target.closest('[class*="sidebar"]') !== null;
          const hasNavIntent = target.getAttribute("data-navigate") === "true";
          if (isInSidebar || hasNavIntent) {
            break;
          }
          button = null;
        }
        target = target.parentElement as HTMLElement;
      }

      // Check if it's a navigation link
      if (link) {
        const href = link.getAttribute("href");
        if (!href) return;

        // Skip if it's an external link, mailto, tel, or hash link
        if (
          href.startsWith("http") ||
          href.startsWith("mailto:") ||
          href.startsWith("tel:") ||
          href.startsWith("#") ||
          link.hasAttribute("download") ||
          (link.hasAttribute("target") && link.getAttribute("target") !== "_self")
        ) {
          return;
        }

        // Check if it's a same-origin link
        try {
          const url = new URL(href, window.location.href);
          if (url.origin !== window.location.origin) return;
        } catch {
          // Relative URL, assume same origin
        }

        // Skip if clicking the same page
        const currentPath = window.location.pathname + window.location.search;
        if (href === currentPath || href === window.location.pathname) {
          return;
        }

        // Start navigation
        pendingNavigationRef.current = true;
        navigationStartTimeRef.current = Date.now();
        startNavigating();
        
        // Fallback: ensure overlay disappears after max 5 seconds
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          if (pendingNavigationRef.current) {
            pendingNavigationRef.current = false;
            stopNavigating();
          }
        }, 5000);
      } else if (button) {
        // For navigation buttons (sidebar items), start navigation
        pendingNavigationRef.current = true;
        navigationStartTimeRef.current = Date.now();
        startNavigating();
        
        // Fallback: ensure overlay disappears after max 5 seconds
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          if (pendingNavigationRef.current) {
            pendingNavigationRef.current = false;
            stopNavigating();
          }
        }, 5000);
      }
    };

    // Listen for browser back/forward buttons
    const handlePopState = () => {
      pendingNavigationRef.current = true;
      navigationStartTimeRef.current = Date.now();
      startNavigating();
      
      // Fallback timeout
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        if (pendingNavigationRef.current) {
          pendingNavigationRef.current = false;
          stopNavigating();
        }
      }, 5000);
    };

    // Listen for page load events as additional fallback
    const handleLoad = () => {
      if (pendingNavigationRef.current) {
        // Small delay to ensure pathname has updated
        setTimeout(() => {
          if (pendingNavigationRef.current) {
            pendingNavigationRef.current = false;
            stopNavigating();
          }
        }, 100);
      }
    };

    // Check if document is already ready
    if (document.readyState === "complete" || document.readyState === "interactive") {
      // If page is already loaded and we're navigating, set a short timeout
      if (pendingNavigationRef.current) {
        setTimeout(() => {
          if (pendingNavigationRef.current) {
            pendingNavigationRef.current = false;
            stopNavigating();
          }
        }, 200);
      }
    }

    // Use capture phase to catch clicks early, before React handlers
    document.addEventListener("click", handleClick, true);
    window.addEventListener("popstate", handlePopState);
    window.addEventListener("load", handleLoad);

    return () => {
      document.removeEventListener("click", handleClick, true);
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("load", handleLoad);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [startNavigating, stopNavigating]);

  // Stop navigation when pathname changes (navigation completed)
  useEffect(() => {
    const currentPath = pathname || "";
    const lastPath = lastPathnameRef.current || "";
    
    // Check if pathname actually changed
    if (currentPath !== lastPath && pendingNavigationRef.current) {
      // Clear any pending timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      pendingNavigationRef.current = false;
      
      // Small delay to ensure smooth transition and DOM is ready
      const timer = setTimeout(() => {
        stopNavigating();
      }, 150);
      
      lastPathnameRef.current = currentPath;
      
      return () => clearTimeout(timer);
    } else if (currentPath !== lastPath) {
      // Pathname changed but navigation wasn't pending - update ref
      lastPathnameRef.current = currentPath;
    }
  }, [pathname, currentLocation, stopNavigating]);

  if (!isNavigating) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center animate-in fade-in duration-300">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0083d3] via-[#0066a8] to-[#004d7f] opacity-90" />
      
      {/* Animated overlay patterns */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Large floating circles */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: "3s" }} />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDuration: "4s", animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-300/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: "5s", animationDelay: "0.5s" }} />
        
        {/* Mesh gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
      </div>

      {/* Backdrop blur */}
      <div className="absolute inset-0 backdrop-blur-md" />

      {/* Main content - centered, no card */}
      <div className="relative z-10 flex flex-col items-center justify-center space-y-8">
        {/* Large animated spinner */}
        <div className="relative">
          {/* Outer rotating ring */}
          <div className="w-24 h-24 rounded-full border-4 border-transparent border-t-white/30 border-r-white/30 animate-spin" style={{ animationDuration: "1.5s" }} />
          
          {/* Middle ring */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full border-4 border-transparent border-b-cyan-300/50 border-l-cyan-300/50 animate-spin" style={{ animationDuration: "1s", animationDirection: "reverse" }} />
          
          {/* Inner pulsing circle */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-gradient-to-br from-white/20 to-cyan-200/20 animate-pulse" />
          
          {/* Center dot */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-lg" />
        </div>

        {/* Loading text with gradient */}
        <div className="text-center space-y-3">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-white via-cyan-100 to-white bg-clip-text text-transparent animate-pulse">
            جاري تحميل الصفحة
          </h2>
          <p className="text-white/80 text-sm font-medium">
            لحظة واحدة من فضلك...
          </p>
        </div>

        {/* Animated progress dots */}
        <div className="flex items-center space-x-2 rtl:space-x-reverse">
          <div className="w-3 h-3 bg-white rounded-full animate-bounce shadow-lg" style={{ animationDelay: "0s", animationDuration: "1.4s" }} />
          <div className="w-3 h-3 bg-cyan-200 rounded-full animate-bounce shadow-lg" style={{ animationDelay: "0.2s", animationDuration: "1.4s" }} />
          <div className="w-3 h-3 bg-white rounded-full animate-bounce shadow-lg" style={{ animationDelay: "0.4s", animationDuration: "1.4s" }} />
        </div>

        {/* Subtle progress bar with pulsing effect */}
        <div className="w-64 h-1 bg-white/20 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-white/40 via-white to-white/40 w-full animate-pulse" />
        </div>
      </div>
    </div>
  );
};

