import { useState } from "react";
import { InteractiveMap } from "@/components/dashboard/InteractiveMap";
import { SidebarControls } from "@/components/dashboard/SidebarControls";
import { StatisticsPanel } from "@/components/dashboard/StatisticsPanel";
import { CompareMapContainer } from "@/components/dashboard/CompareMapContainer";
import { useSpatialData } from "@/hooks/useSpatialData";
import { useMapStore } from "@/store/mapStore";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

export default function MapDashboard() {
  const spatialData = useSpatialData();
  const store = useMapStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden relative">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Kiri */}
      <div
        className={`fixed md:relative h-full shrink-0 border-r bg-card z-50 shadow-sm transition-all duration-300 ease-in-out ${
          isSidebarOpen
            ? "w-[300px] translate-x-0"
            : "w-[300px] -translate-x-full md:translate-x-0"
        } flex flex-col`}
      >
        <SidebarControls spatialData={spatialData} />
      </div>

      {/* Kontainer Utama Full Screen Peta */}
      <div className="flex-1 h-full relative overflow-hidden flex flex-col">
        {/* Mobile Header / Toggle Button */}
        {!isSidebarOpen && (
          <div className="md:hidden absolute top-4 left-4 z-40">
            <Button
              variant="secondary"
              size="icon"
              className="shadow-md rounded-md"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        )}

        {/* Top Section: Kontainer Peta Interactive Full Screen */}
        <div className="w-full h-full relative flex-1">
          <InteractiveMap spatialData={spatialData} />
        </div>

        {/* Mode Komparasi Overlay */}
        {store.isCompareMode && (
          <CompareMapContainer
            onClose={() => store.setCompareMode(false)}
          />
        )}

        {/* Bottom Section: Panel Statistik Melayang / Collapsible Drawer */}
        <StatisticsPanel spatialData={spatialData} />
      </div>
    </div>
  );
}
