import { Loader2 } from "lucide-react";

interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
}

export function LoadingOverlay({
  isVisible,
  message = "Menyiapkan Dashboard...",
}: LoadingOverlayProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm transition-all duration-300">
      <div className="flex flex-col items-center p-8 bg-card border border-border shadow-lg rounded-2xl animate-in fade-in zoom-in duration-300">
        <Loader2 className="w-12 h-12 mb-6 text-primary animate-spin" />
        <h2 className="text-xl font-bold tracking-tight text-foreground text-center">
          {message}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground text-center max-w-xs">
          Mohon tunggu sebentar, Anda sedang dialihkan secara aman...
        </p>
      </div>
    </div>
  );
}
