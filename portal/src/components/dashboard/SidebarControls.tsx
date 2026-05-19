import { useMapStore } from '@/store/mapStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function SidebarControls() {
  const store = useMapStore();

  return (
    <Card className="h-full w-full max-w-[300px] flex flex-col rounded-none border-y-0 border-l-0 overflow-y-auto">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-bold">Layer Control</CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Layer Visibility */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="showSls" className="text-sm">Batas SLS</Label>
            <Switch id="showSls" checked={store.showSls} onCheckedChange={() => store.toggleLayer('showSls')} />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="showCounting" className="text-sm text-muted-foreground">↳ Mode Choropleth</Label>
            <Switch id="showCounting" checked={store.showCounting} onCheckedChange={() => store.toggleLayer('showCounting')} disabled={!store.showSls} />
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
            <Select value={store.filterKecamatan} onValueChange={(val) => store.setFilter('filterKecamatan', val)}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih Kecamatan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Semua">Semua</SelectItem>
                {/* Opsi dinamis nanti diisi dari data */}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Desa / Kelurahan</Label>
            <Select value={store.filterDesa} onValueChange={(val) => store.setFilter('filterDesa', val)}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih Desa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Semua">Semua</SelectItem>
                {/* Opsi dinamis nanti diisi dari data */}
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

      </CardContent>
    </Card>
  );
}
