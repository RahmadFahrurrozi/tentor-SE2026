import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableCombobox } from "@/components/ui/searchable-combobox";
import { Button } from "@/components/ui/button";
import { Eraser, LogOut, ArrowLeftRight, Database } from "lucide-react";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { useSidebarControls } from "@/hooks/use-sidebar-controls";

export function SidebarControls({ spatialData }: { spatialData: any }) {
  const {
    store,
    role,
    desaOptions,
    kecOptions,
    dusunOptions,
    slsOptions,
    handleResetFilter,
    logout,
    isLoggingOut,
    userEmail,
    userFullName,
    userInitials,
    displayRole,
  } = useSidebarControls(spatialData);

  const kecamatanOptions = useMemo(() => [
    ...(role === "admin" ? [{ value: "Semua", label: "Semua Kecamatan" }] : []),
    ...kecOptions.map((k: any) => ({
      value: k.idkec,
      label: k.nmkec || k.nama || k.name || k.idkec,
    })),
  ], [role, kecOptions]);

  const desaListOptions = useMemo(() => [
    { value: "Semua", label: "Semua Desa" },
    ...desaOptions.map((d: any) => ({
      value: d.iddesa,
      label: d.nmdesa || d.nama || d.name || d.iddesa,
    })),
  ], [desaOptions]);

  return (
    <Card className="h-full w-full max-w-75 flex flex-col rounded-none border-y-0 border-l-0">
      <CardHeader className="pb-4 shrink-0 flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-3">
          <img
            src="/logo.svg"
            alt="BPS Logo"
            className="w-8 h-8 object-contain"
          />
          <CardTitle className="text-xl font-bold">TENTORING</CardTitle>
        </div>
        <ModeToggle />
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto space-y-6">
        {/* Dataset Switcher & Quick Tools */}
        <div className="space-y-3 p-3 bg-muted/40 rounded-lg border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-primary" /> Versi Dataset
            </span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                store.activeDatasetVersion === "se2026"
                  ? "bg-emerald-500/15 text-emerald-500"
                  : "bg-amber-500/15 text-amber-500"
              }`}
            >
              {store.activeDatasetVersion === "se2026" ? "SE 2026" : "Prelist"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1 bg-background p-1 rounded-md border">
            <Button
              size="sm"
              variant={
                store.activeDatasetVersion === "prelist" ? "default" : "ghost"
              }
              className="text-[11px] h-7 px-1"
              onClick={() => store.setDatasetVersion("prelist")}
              disabled={store.selectedKabupaten === "3515"}
            >
              Baseline Prelist
            </Button>
            <Button
              size="sm"
              variant={
                store.activeDatasetVersion === "se2026" ? "default" : "ghost"
              }
              className="text-[11px] h-7 px-1"
              onClick={() => store.setDatasetVersion("se2026")}
            >
              SE 2026 Baru
            </Button>
          </div>

          {store.selectedKabupaten === "3515" && (
            <p className="text-[10px] text-amber-500 font-medium italic">
              * Kabupaten Sidoarjo hanya menyediakan data SE 2026 terbaru (tanpa
              Prelist).
            </p>
          )}

          <div className="pt-1">
            <Button
              size="sm"
              variant="outline"
              className="w-full text-xs h-8 gap-1.5 border-primary/40 text-primary"
              onClick={() => store.setCompareMode(!store.isCompareMode)}
              disabled={store.selectedKabupaten === "3515"}
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              {store.isCompareMode ? "Tutup Komparasi" : "Mode Komparasi"}
            </Button>
          </div>
        </div>

        {/* Layer Visibility */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="showKab" className="text-sm">
              Batas Kabupaten
            </Label>
            <Switch
              id="showKab"
              checked={store.showKab}
              onCheckedChange={() => store.toggleLayer("showKab")}
            />
          </div>

          <div
            className="flex items-center justify-between"
            style={{
              cursor: "not-allowed",
              opacity: 0.5,
              pointerEvents: "none",
            }}
          >
            <Label htmlFor="showSls" className="text-sm">
              Batas SLS
            </Label>
            <Switch
              id="showSls"
              checked={store.showSls}
              onCheckedChange={() => store.toggleLayer("showSls")}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="enable3d" className="text-sm text-muted-foreground">
              ↳ Mode 3D Extrusion
            </Label>
            <Switch
              id="enable3d"
              checked={store.enable3d}
              onCheckedChange={() => store.toggleLayer("enable3d")}
              disabled={!store.showBuild}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label
              htmlFor="showSyntheticBuildings"
              className="text-sm font-medium cursor-pointer"
            >
              Bangunan Sintetis
            </Label>
            <Switch
              id="showSyntheticBuildings"
              checked={store.showSyntheticBuildings}
              onCheckedChange={() =>
                store.toggleLayer("showSyntheticBuildings")
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="showUsaha" className="text-sm">
              Titik Usaha Biasa
            </Label>
            <Switch
              id="showUsaha"
              checked={store.showUsaha}
              onCheckedChange={() => store.toggleLayer("showUsaha")}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="showUsahaDigital" className="text-sm">
              Titik Usaha Digital
            </Label>
            <Switch
              id="showUsahaDigital"
              checked={store.showUsahaDigital}
              onCheckedChange={() => store.toggleLayer("showUsahaDigital")}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label htmlFor="showUsahaPertanian" className="text-sm">
                Titik Usaha Pertanian
              </Label>
            </div>
            <Switch
              id="showUsahaPertanian"
              checked={store.showUsahaPertanian}
              onCheckedChange={() => store.toggleLayer("showUsahaPertanian")}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="showRt" className="text-sm">
              Titik Rumah Tangga
            </Label>
            <Switch
              id="showRt"
              checked={store.showRt}
              onCheckedChange={() => store.toggleLayer("showRt")}
            />
          </div>
        </div>

        <hr />

        {/* Filter Wilayah */}
        <div className="space-y-4">
          <h4 className="font-semibold text-sm">Filter Wilayah</h4>

          <div className="space-y-2">
            <Label className="text-xs font-semibold flex items-center gap-1">
              Kabupaten / Kota
            </Label>
            <Select
              value={store.selectedKabupaten}
              onValueChange={(val) =>
                store.setKabupaten(val as "3510" | "3515")
              }
            >
              <SelectTrigger className="w-full font-medium">
                <SelectValue placeholder="Pilih Kabupaten" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3510">Kab. Banyuwangi (3510)</SelectItem>
                <SelectItem value="3515">Kab. Sidoarjo (3515)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Kecamatan</Label>
            <SearchableCombobox
              options={kecamatanOptions}
              value={store.filterKecamatan || undefined}
              placeholder="Pilih Kecamatan..."
              emptyText="Kecamatan tidak ditemukan."
              onValueChange={(val) => {
                store.setFilter("filterKecamatan", val);
                store.setFilter("filterDesa", "Semua");
                store.setFilter("filterDusun", "Semua");
                store.setFilter("filterSls", "Semua");
              }}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Desa / Kelurahan</Label>
            <SearchableCombobox
              options={desaListOptions}
              value={store.filterDesa || undefined}
              placeholder="Pilih Desa..."
              emptyText="Desa tidak ditemukan."
              disabled={
                !store.filterKecamatan ||
                store.filterKecamatan === "Semua" ||
                desaOptions.length === 0
              }
              onValueChange={(val) => {
                store.setFilter("filterDesa", val);
                store.setFilter("filterDusun", "Semua");
                store.setFilter("filterSls", "Semua");
              }}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Dusun / Lingkungan</Label>
            <SearchableCombobox
              options={dusunOptions}
              value={store.filterDusun || undefined}
              placeholder="Pilih Dusun..."
              emptyText="Dusun tidak ditemukan."
              disabled={
                !store.filterDesa ||
                store.filterDesa === "Semua" ||
                dusunOptions.length <= 1
              }
              onValueChange={(val) => {
                store.setFilter("filterDusun", val);
                store.setFilter("filterSls", "Semua");
              }}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">RT / RW (SLS)</Label>
            <SearchableCombobox
              options={slsOptions}
              value={store.filterSls || undefined}
              placeholder="Pilih RT / RW..."
              emptyText="RT / RW tidak ditemukan."
              disabled={
                !store.filterDesa ||
                store.filterDesa === "Semua" ||
                slsOptions.length <= 1
              }
              onValueChange={(val) => store.setFilter("filterSls", val)}
            />
          </div>
        </div>

        <hr />

        {/* Pencarian */}
        <div className="space-y-2">
          <Label className="text-xs">Cari Nama Usaha</Label>
          <Input
            placeholder="contoh: BAKSO"
            value={store.filterNama}
            onChange={(e) => store.setFilter("filterNama", e.target.value)}
          />
        </div>

        <div className="pt-2 space-y-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            onClick={handleResetFilter}
          >
            <Eraser className="mr-2 h-3.5 w-3.5" />
            Reset Filter
          </Button>
        </div>
      </CardContent>

      {/* Footer Profil & Logout */}
      <div className="shrink-0 p-6 border-t bg-card space-y-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm border border-primary/20 shrink-0">
            {userInitials}
          </div>
          <div className="flex-1 min-w-0">
            <p
              className="text-sm font-semibold text-foreground truncate"
              title={userFullName}
            >
              {userFullName}
            </p>
            <p
              className="text-xs text-muted-foreground truncate"
              title={userEmail}
            >
              {userEmail}
            </p>
            <div className="mt-1">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${
                  role === "admin"
                    ? "bg-red-500/10 text-red-500 border-red-500/20"
                    : role === "pml"
                      ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                      : "bg-green-500/10 text-green-500 border-green-500/20"
                }`}
              >
                {displayRole}
              </span>
            </div>
          </div>
        </div>

        <Button
          variant="destructive"
          className="w-full text-xs h-9"
          onClick={() => logout()}
          disabled={isLoggingOut}
        >
          <LogOut className="mr-2 h-3.5 w-3.5" />
          {isLoggingOut ? "Keluar..." : "Logout"}
        </Button>
      </div>
    </Card>
  );
}
