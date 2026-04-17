import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
  minDisplayTime?: number;
}

export function LoadingOverlay({
  isVisible,
  message = "Loading",
  minDisplayTime = 300,
}: LoadingOverlayProps) {
  const [show, setShow] = useState(false);
  const [dots, setDots] = useState("");

  useEffect(() => {
    if (isVisible) {
      setShow(true);
    } else {
      const timer = setTimeout(() => setShow(false), minDisplayTime);
      return () => clearTimeout(timer);
    }
  }, [isVisible, minDisplayTime]);

  useEffect(() => {
    if (!show) return;

    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 400);

    return () => clearInterval(interval);
  }, [show]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-black/80 backdrop-blur-sm transition-all duration-200">
      <div className="relative">
        {/* Animated gradient ring */}
        <div className="absolute inset-0 rounded-full bg-linear-to-r from-primary/20 via-primary/40 to-primary/20 blur-2xl animate-pulse" />

        {/* Clean spinner */}
        <Loader2 className="relative h-10 w-10 animate-spin text-primary" />

        {/* Typing animation text */}
        <div className="absolute top-full left-1/2 mt-4 -translate-x-1/2 text-center whitespace-nowrap">
          <span className="text-sm font-mono text-muted-foreground/70">
            {message}
            <span className="inline-block w-4 text-left">{dots}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
