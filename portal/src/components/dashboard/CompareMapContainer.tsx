import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, ArrowLeftRight } from "lucide-react";
import { InteractiveMap } from "./InteractiveMap";
import { useSpatialData } from "@/hooks/useSpatialData";

interface CompareMapContainerProps {
  onClose: () => void;
}

export function CompareMapContainer({
  onClose,
}: CompareMapContainerProps) {
  const prelistSpatialData = useSpatialData('prelist');
  const se2026SpatialData = useSpatialData('se2026');

  return (
    <div className="absolute inset-0 bg-background z-40 flex flex-col">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-card border-b z-50 shrink-0">
        <div className="flex items-center gap-3">
          <Badge
            variant="outline"
            className="gap-1.5 px-3 py-1 font-semibold text-xs border-primary/40 bg-primary/10"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-primary" /> Mode
            Komparasi Spasial
          </Badge>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            Membandingkan Baseline Data Prelist (Kiri) vs Data Sensus Ekonomi
            2026 (Kanan)
          </span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={onClose}
          className="text-xs gap-1"
        >
          <X className="w-4 h-4" /> Keluar Mode Komparasi
        </Button>
      </div>

      {/* Side-by-Side Dual Map Display */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border relative">
        {/* Left Map: Data Prelist Baseline */}
        <div className="relative h-full w-full">
          <div className="absolute top-3 left-3 z-10 bg-background/90 backdrop-blur border px-3 py-1 rounded-md shadow-md">
            <p className="text-xs font-bold text-amber-500">
              Data Prelist ( Baseline )
            </p>
          </div>
          <InteractiveMap spatialData={prelistSpatialData} />
        </div>

        {/* Right Map: Data SE2026 Progressive */}
        <div className="relative h-full w-full">
          <div className="absolute top-3 left-3 z-10 bg-background/90 backdrop-blur border px-3 py-1 rounded-md shadow-md">
            <p className="text-xs font-bold text-emerald-500">
              Data Sensus Ekonomi 2026 ( Progressive )
            </p>
          </div>
          <InteractiveMap spatialData={se2026SpatialData} />
        </div>
      </div>
    </div>
  );
}
