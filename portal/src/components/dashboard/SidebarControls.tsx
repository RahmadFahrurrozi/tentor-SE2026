import { useMapStore } from "@/store/mapStore";
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
import { useAuthStore } from "@/store/auth-store";
import { Button } from "@/components/ui/button";
import { Eraser, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { useEffect } from "react";

export function SidebarControls({ spatialData }: { spatialData: any }) {
  const store = useMapStore();
  const { profile, user } = useAuthStore();
  const { logout, isLoggingOut } = useAuth();

  const {
    wilayahManifest,
    isLoadingManifest,
    assignments,
    isLoadingAssignments,
  } = spatialData;

  const role = profile?.role ?? "ppl";

  const assignedKecs = Array.from(
    new Set(assignments.map((a: any) => a.idkec).filter(Boolean)),
  ) as string[];

  const assignedDesas = Array.from(
    new Set(assignments.map((a: any) => a.iddesa).filter(Boolean)),
  ) as string[];

  const allKecamatans = wilayahManifest?.kecamatan || [];
  const kecOptions = allKecamatans.filter((k: any) => {
    if (role === "admin") return true;
    return assignedKecs.includes(k.idkec);
  });

  const selectedKecObj = allKecamatans.find(
    (k: any) => k.idkec === store.filterKecamatan,
  );
  const rawDesaOptions = selectedKecObj?.desa || [];
  const desaOptions = rawDesaOptions.filter((d: any) => {
    if (role !== "ppl") return true;
    return assignedDesas.includes(d.iddesa);
  });

  useEffect(() => {
    if (
      role === "ppl" &&
      store.filterKecamatan &&
      store.filterKecamatan !== "Semua"
    ) {
      const kecamatan = allKecamatans.find(
        (k: any) => k.idkec === store.filterKecamatan,
      );
      if (kecamatan && kecamatan.desa) {
        const firstAssignedDesa = kecamatan.desa.find((d: any) =>
          assignedDesas.includes(d.iddesa),
        );
        if (
          firstAssignedDesa &&
          store.filterDesa !== firstAssignedDesa.iddesa
        ) {
          store.setFilter("filterDesa", firstAssignedDesa.iddesa);
        }
      }
    }
  }, [store.filterKecamatan, role, allKecamatans, assignedDesas]);

  const handleResetFilter = () => {
    if (role === "ppl") {
      if (assignedDesas.length > 0 && allKecamatans.length > 0) {
        let firstKecamatan = null;
        let firstDesa = null;
        for (const kec of allKecamatans) {
          const desaTugas = kec.desa?.find((d: any) =>
            assignedDesas.includes(d.iddesa),
          );
          if (desaTugas) {
            firstKecamatan = kec.idkec;
            firstDesa = desaTugas.iddesa;
            break;
          }
        }
        store.setFilter("filterKecamatan", firstKecamatan);
        store.setFilter("filterDesa", firstDesa);
        store.setFilter("filterNama", "");
      } else {
        store.resetFilter(role, assignedDesas, allKecamatans);
      }
    } else if (role === "pml") {
      if (kecOptions.length > 0) {
        store.setFilter("filterKecamatan", kecOptions[0].idkec);
        store.setFilter("filterDesa", "Semua");
        store.setFilter("filterNama", "");
      } else {
        store.resetFilter(role, assignedDesas, allKecamatans);
      }
    } else {
      store.resetFilter(role, assignedDesas, allKecamatans);
    }
  };

  const userEmail = profile?.email || user?.email || "";
  const userFullName = profile?.full_name || "PML User";
  const userInitials = userFullName
    .split(" ")
    .filter(Boolean)
    .map((n: string) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase() || "U";

  const displayRole = role === "admin"
    ? "Admin"
    : role === "pml"
      ? "PML"
      : role === "ppl"
        ? "PPL"
        : role?.toUpperCase();

  return (
    <Card className="h-full w-full max-w-[300px] flex flex-col rounded-none border-y-0 border-l-0">
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
            <Label htmlFor="enable3d" className="text-sm">
              Mode 3D Peta
            </Label>
            <Switch
              id="enable3d"
              checked={store.enable3d}
              onCheckedChange={() => store.toggleLayer("enable3d")}
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

          {/* ── BARU: Titik Usaha Pertanian ───────────────────── */}
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
          {/* ─────────────────────────────────────────────────── */}

          <div className="flex items-center justify-between">
            <Label htmlFor="showRt" className="text-sm">
              Titik Keluarga (Rumah Tangga)
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
            <Label className="text-xs">Kecamatan</Label>
            <Select
              value={store.filterKecamatan || undefined}
              onValueChange={(val) => {
                store.setFilter("filterKecamatan", val);
                if (role !== "ppl") store.setFilter("filterDesa", "Semua");
              }}
              disabled={isLoadingManifest || isLoadingAssignments}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    isLoadingManifest ? "Memuat..." : "Pilih Kecamatan"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {role === "admin" && (
                  <SelectItem value="Semua">Semua Kecamatan</SelectItem>
                )}
                {kecOptions.map((k: any) => (
                  <SelectItem key={k.idkec} value={k.idkec}>
                    {k.nama}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Desa / Kelurahan</Label>
            <Select
              value={store.filterDesa || undefined}
              onValueChange={(val) => store.setFilter("filterDesa", val)}
              disabled={
                !store.filterKecamatan ||
                store.filterKecamatan === "Semua" ||
                isLoadingManifest
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih Desa" />
              </SelectTrigger>
              <SelectContent>
                {role !== "ppl" && (
                  <SelectItem value="Semua">Semua Desa</SelectItem>
                )}
                {desaOptions.map((d: any) => (
                  <SelectItem key={d.iddesa} value={d.iddesa}>
                    {d.nama}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

        <div className="pt-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handleResetFilter}
          >
            <Eraser className="mr-2 h-4 w-4" />
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
            <p className="text-sm font-semibold text-foreground truncate" title={userFullName}>
              {userFullName}
            </p>
            <p className="text-xs text-muted-foreground truncate" title={userEmail}>
              {userEmail}
            </p>
            <div className="mt-1">
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${
                role === "admin"
                  ? "bg-red-500/10 text-red-500 border-red-500/20"
                  : role === "pml"
                    ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                    : "bg-green-500/10 text-green-500 border-green-500/20"
              }`}>
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
