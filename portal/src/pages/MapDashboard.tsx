import { InteractiveMap } from "@/components/dashboard/InteractiveMap";
import { SidebarControls } from "@/components/dashboard/SidebarControls";

export default function MapDashboard() {
  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* Sidebar Kiri */}
      <div className="w-[300px] h-full shrink-0 border-r bg-card z-10 shadow-sm relative">
        <SidebarControls />
      </div>

      {/* Kontainer Peta Utama */}
      <div className="flex-1 h-full relative p-4">
        <InteractiveMap />
      </div>
    </div>
  );
}
