import { useState } from "react";
import { InteractiveMap } from "@/components/dashboard/InteractiveMap";
import { SidebarControls } from "@/components/dashboard/SidebarControls";
import { useSpatialData } from "@/hooks/useSpatialData";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

export default function MapDashboard() {
  const spatialData = useSpatialData();
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

      {/* Kontainer Peta Utama */}
      <div className="flex-1 h-full relative p-0 md:p-4 flex flex-col">
        {/* Mobile Header / Toggle Button */}
        {!isSidebarOpen && (
          <div className="md:hidden absolute top-4 left-4 z-50">
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

        <div className="h-full w-full relative">
          <InteractiveMap spatialData={spatialData} />
        </div>
      </div>
    </div>
  );
}
