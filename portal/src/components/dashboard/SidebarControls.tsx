import { useMapStore } from '@/store/mapStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { ModeToggle } from '@/components/ui/mode-toggle';

export function SidebarControls({ spatialData }: { spatialData: any }) {
  const store = useMapStore();
  const { profile } = useAuthStore();
  const { logout, isLoggingOut } = useAuth();

  const {
    wilayahManifest,
    isLoadingManifest,
    assignments,
    isLoadingAssignments
  } = spatialData;

  const role = profile?.role ?? 'ppl';

  // 1. Dapatkan daftar kecamatan & desa yang diizinkan berdasarkan tugas (jika bukan admin)
  const assignedKecs = Array.from(
    new Set(assignments.map((a: any) => a.idkec).filter(Boolean))
  ) as string[];

  const assignedDesas = Array.from(
    new Set(assignments.map((a: any) => a.iddesa).filter(Boolean))
  ) as string[];

  // 2. Filter kecamatan yang ditampilkan di dropdown
  const allKecamatans = wilayahManifest?.kecamatan || [];
  const kecOptions = allKecamatans.filter((k: any) => {
    if (role === 'admin') return true;
    return assignedKecs.includes(k.idkec);
  });

  // 3. Filter desa berdasarkan kecamatan yang terpilih
  const selectedKecObj = allKecamatans.find((k: any) => k.idkec === store.filterKecamatan);
  const rawDesaOptions = selectedKecObj?.desa || [];
  const desaOptions = rawDesaOptions.filter((d: any) => {
    if (role !== 'ppl') return true; // PML dan Admin bisa melihat semua desa di kecamatan ini
    return assignedDesas.includes(d.iddesa);
  });

  return (
    <Card className="h-full w-full max-w-[300px] flex flex-col rounded-none border-y-0 border-l-0 overflow-y-auto">
      <CardHeader className="pb-4 flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-3">
          <img src="/logo.svg" alt="BPS Logo" className="w-8 h-8 object-contain" />
          <CardTitle className="text-xl font-bold">Layer Control</CardTitle>
        </div>
        <ModeToggle />
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Layer Visibility */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="showKab" className="text-sm">Batas Kabupaten</Label>
            <Switch id="showKab" checked={store.showKab} onCheckedChange={() => store.toggleLayer('showKab')} />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="showSls" className="text-sm">Batas SLS</Label>
            <Switch id="showSls" checked={store.showSls} onCheckedChange={() => store.toggleLayer('showSls')} />
          </div>

          
          <div className="flex items-center justify-between">
            <Label htmlFor="showBuild" className="text-sm">Bangunan Fisik</Label>
            <Switch id="showBuild" checked={store.showBuild} onCheckedChange={() => store.toggleLayer('showBuild')} />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="enable3d" className="text-sm text-muted-foreground">↳ Mode 3D Extrusion</Label>
            <Switch id="enable3d" checked={store.enable3d} onCheckedChange={() => store.toggleLayer('enable3d')} disabled={!store.showBuild} />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="showUsaha" className="text-sm">Titik Usaha Biasa</Label>
            <Switch id="showUsaha" checked={store.showUsaha} onCheckedChange={() => store.toggleLayer('showUsaha')} />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="showUsahaDigital" className="text-sm">Titik Usaha Digital</Label>
            <Switch id="showUsahaDigital" checked={store.showUsahaDigital} onCheckedChange={() => store.toggleLayer('showUsahaDigital')} />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="showRt" className="text-sm">Titik Rumah Tangga</Label>
            <Switch id="showRt" checked={store.showRt} onCheckedChange={() => store.toggleLayer('showRt')} />
          </div>
        </div>

        <hr />

        {/* Filter Wilayah */}
        <div className="space-y-4">
          <h4 className="font-semibold text-sm">Filter Wilayah</h4>
          
          <div className="space-y-2">
            <Label className="text-xs">Kecamatan</Label>
            <Select 
              value={store.filterKecamatan} 
              onValueChange={(val) => {
                store.setFilter('filterKecamatan', val);
                // Reset desa ke "Semua" untuk admin/PML, tetapi untuk PPL pilih desa pertama tugasnya
                if (role === 'ppl') {
                  const allowedDesasForKec = allKecamatans
                    .find((k: any) => k.idkec === val)
                    ?.desa.filter((d: any) => assignedDesas.includes(d.iddesa)) || [];
                  if (allowedDesasForKec.length > 0) {
                    store.setFilter('filterDesa', allowedDesasForKec[0].iddesa);
                  } else {
                    store.setFilter('filterDesa', 'Semua');
                  }
                } else {
                  store.setFilter('filterDesa', 'Semua');
                }
              }}
              disabled={isLoadingManifest || isLoadingAssignments}
            >
              <SelectTrigger>
                <SelectValue placeholder={isLoadingManifest ? "Memuat..." : "Pilih Kecamatan"} />
              </SelectTrigger>
              <SelectContent>
                {role === 'admin' && <SelectItem value="Semua">Semua Kecamatan</SelectItem>}
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
              value={store.filterDesa} 
              onValueChange={(val) => store.setFilter('filterDesa', val)}
              disabled={store.filterKecamatan === 'Semua' || isLoadingManifest}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih Desa" />
              </SelectTrigger>
              <SelectContent>
                {role !== 'ppl' && <SelectItem value="Semua">Semua Desa</SelectItem>}
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
            onChange={(e) => store.setFilter('filterNama', e.target.value)} 
          />
        </div>

        <hr />

        {/* Logout */}
        <div className="pt-2">
          <Button 
            variant="destructive" 
            className="w-full" 
            onClick={() => logout()}
            disabled={isLoggingOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            {isLoggingOut ? "Keluar..." : "Logout"}
          </Button>
        </div>

      </CardContent>
    </Card>
  );
}
