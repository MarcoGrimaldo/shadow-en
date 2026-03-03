"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, X, Smartphone } from "lucide-react";

export default function MobileWarningBanner() {
  const [isMobile, setIsMobile] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if mobile device
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor;
      const isMobileDevice =
        /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
          userAgent.toLowerCase()
        ) || window.innerWidth < 768;
      setIsMobile(isMobileDevice);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    // Check if already dismissed in this session
    const dismissed = sessionStorage.getItem("mobileWarningDismissed");
    if (dismissed === "true") {
      setIsDismissed(true);
    }

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem("mobileWarningDismissed", "true");
  };

  if (!isMobile || isDismissed) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 bg-white/20 rounded-full p-2">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Smartphone className="w-4 h-4" />
              <span className="font-bold text-sm">
                Mobile Browser Not Fully Supported
              </span>
            </div>
            <p className="text-sm text-white/90 leading-snug">
              This web app works best on <strong>desktop browsers</strong>.
              Voice recording requires <strong>Safari on iOS</strong> or{" "}
              <strong>Chrome on Android</strong>.
            </p>
            <p className="text-sm mt-1 font-medium flex items-center gap-1">
              📱 Native mobile app coming soon!
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1.5 hover:bg-white/20 rounded-full transition-colors"
            aria-label="Dismiss warning"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
