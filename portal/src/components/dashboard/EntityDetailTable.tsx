import { useState, useMemo } from "react";
import { useMapStore } from "@/store/mapStore";
import { useAuthStore } from "@/store/auth-store";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Search,
  Building2,
  Store,
  Laptop,
  Sprout,
  Home,
  Layers,
  ChevronLeft,
  ChevronRight,
  X,
  MapPin,
  Download,
  FileSpreadsheet,
} from "lucide-react";
import * as XLSX from "xlsx";

interface EntityDetailTableProps {
  spatialData: any;
}

export interface EntityItem {
  id: string;
  nama: string;
  alamat: string;
  type: "usaha" | "usaha-digital" | "usaha-pertanian" | "rt" | "bangunan";
  typeLabel: string;
  badgeClass: string;
  iddesa?: string;
  idkec?: string;
  detail?: string;
}

export function EntityDetailTable({ spatialData }: EntityDetailTableProps) {
  const store = useMapStore();
  const { profile } = useAuthStore();
  const isAdmin = profile?.role === "admin";

  const [activeTab, setActiveTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  const {
    dataUsaha,
    dataUsahaDigital,
    dataUsahaPertanian,
    dataRumahTangga,
    dataBangunan,
  } = spatialData;

  // Filter helper by Kecamatan & Desa
  const filterByRegion = (item: any) => {
    const idslsStr = String(item.idsls_str || item.idsls_final || "");
    const iddesa = item.iddesa || item.id_desa || idslsStr.substring(0, 10);
    const idkec =
      item.idkec ||
      item.id_kec ||
      idslsStr.substring(0, 7) ||
      String(iddesa).substring(0, 7);

    if (store.filterKecamatan !== "Semua" && store.filterKecamatan) {
      if (String(idkec) !== String(store.filterKecamatan)) return false;
    }
    if (store.filterDesa !== "Semua" && store.filterDesa) {
      if (String(iddesa) !== String(store.filterDesa)) return false;
    }
    return true;
  };

  // Compile all entities into a unified array
  const allEntities = useMemo<EntityItem[]>(() => {
    const list: EntityItem[] = [];

    // 1. Usaha Biasa
    (dataUsaha || []).forEach((u: any, i: number) => {
      if (!filterByRegion(u)) return;
      list.push({
        id: `ub-${i}-${u.id || u.idsls_str || i}`,
        nama:
          u["nama final"] ||
          u.nama_final ||
          u["Nama usaha"] ||
          u["Nama Usaha"] ||
          u.nama_usaha_edit ||
          u.nama_komersial ||
          u.nama_usaha ||
          u.nama ||
          u.nm_project ||
          "Usaha Biasa",
        alamat:
          u["alamat final"] ||
          u.alamat_final ||
          u["Alamat"] ||
          u.alamat ||
          u.deskripsi_project ||
          "-",
        type: "usaha",
        typeLabel: "Usaha Biasa",
        badgeClass:
          "bg-amber-500/10 text-amber-500 border-amber-500/30 dark:bg-amber-500/20 dark:text-amber-400",
        iddesa: u.iddesa,
        idkec: u.idkec,
        detail: u.kategori || u.jenis_usaha || "Non-Pertanian",
      });
    });

    // 2. Usaha Digital
    (dataUsahaDigital || []).forEach((ud: any, i: number) => {
      if (!filterByRegion(ud)) return;
      list.push({
        id: `ud-${i}-${ud.id || ud.idsls_str || i}`,
        nama:
          ud["nama final"] ||
          ud.nama_final ||
          ud["Nama usaha"] ||
          ud["Nama Usaha"] ||
          ud.nama_usaha_edit ||
          ud.nama_komersial ||
          ud.nama_usaha ||
          ud.nama ||
          ud.nm_project ||
          "Usaha Digital",
        alamat:
          ud["alamat final"] ||
          ud.alamat_final ||
          ud["Alamat"] ||
          ud.alamat ||
          ud.deskripsi_project ||
          "-",
        type: "usaha-digital",
        typeLabel: "Usaha Digital",
        badgeClass:
          "bg-pink-500/10 text-pink-500 border-pink-500/30 dark:bg-pink-500/20 dark:text-pink-400",
        iddesa: ud.iddesa,
        idkec: ud.idkec,
        detail: ud.kategori || "E-Commerce / Online",
      });
    });

    // 3. Usaha Pertanian
    (dataUsahaPertanian || []).forEach((up: any, i: number) => {
      if (!filterByRegion(up)) return;
      list.push({
        id: `up-${i}-${up.id || up.idsls_str || i}`,
        nama:
          up.nama_krt ||
          up.nm_project ||
          up["nama final"] ||
          up.nama_final ||
          up.nama ||
          "Usaha Pertanian",
        alamat:
          up.deskripsi_project ||
          up.alamat_project ||
          up["alamat final"] ||
          up.alamat_final ||
          up.alamat ||
          "-",
        type: "usaha-pertanian",
        typeLabel: "Usaha Pertanian",
        badgeClass:
          "bg-emerald-500/10 text-emerald-500 border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-400",
        iddesa: up.iddesa,
        idkec: up.idkec,
        detail: up.komoditas || up.jenis_usaha || "Agrikultur",
      });
    });

    // 4. Rumah Tangga
    (dataRumahTangga || []).forEach((rt: any, i: number) => {
      if (!filterByRegion(rt)) return;
      list.push({
        id: `rt-${i}-${rt.id || rt.idsls_str || i}`,
        nama:
          rt["nama final"] ||
          rt.nama_final ||
          rt.nama_kk ||
          rt.nama ||
          rt.nama_kpl ||
          "Rumah Tangga",
        alamat:
          rt["alamat final"] ||
          rt.alamat_final ||
          rt.alamat_krt ||
          rt.alamat ||
          "-",
        type: "rt",
        typeLabel: "Rumah Tangga",
        badgeClass:
          "bg-blue-500/10 text-blue-500 border-blue-500/30 dark:bg-blue-500/20 dark:text-blue-400",
        iddesa: rt.iddesa,
        idkec: rt.idkec,
        detail: rt.jenis_rt || rt.status_rt || "Unit Keluarga",
      });
    });

    // 5. Bangunan Fisik
    (dataBangunan || []).forEach((b: any, i: number) => {
      if (!filterByRegion(b)) return;
      list.push({
        id: `b-${i}-${b.id_bangunan || i}`,
        nama:
          b.nama_bangunan ||
          b.nama ||
          `Bangunan #${b.id_bangunan || i + 1}`,
        alamat:
          b.alamat ||
          b.alamat_lengkap ||
          (b.idsls_str ? `SLS ${b.idsls_str}` : "-"),
        type: "bangunan",
        typeLabel: "Bangunan Fisik",
        badgeClass:
          "bg-indigo-500/10 text-indigo-500 border-indigo-500/30 dark:bg-indigo-500/20 dark:text-indigo-400",
        iddesa: b.iddesa,
        idkec: b.idkec,
        detail:
          b.status_kunjungan === "sudah"
            ? "Terkunjungi"
            : b.status_kunjungan === "belum"
              ? "Belum Dikunjungi"
              : "Bangunan Fisik",
      });
    });

    return list;
  }, [
    dataUsaha,
    dataUsahaDigital,
    dataUsahaPertanian,
    dataRumahTangga,
    dataBangunan,
    store.filterKecamatan,
    store.filterDesa,
  ]);

  // Filtered by activeTab & searchQuery
  const filteredList = useMemo(() => {
    return allEntities.filter((item) => {
      // Tab filter
      if (activeTab !== "all" && item.type !== activeTab) {
        return false;
      }
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNama = item.nama.toLowerCase().includes(q);
        const matchAlamat = item.alamat.toLowerCase().includes(q);
        const matchDetail = (item.detail || "").toLowerCase().includes(q);
        return matchNama || matchAlamat || matchDetail;
      }
      return true;
    });
  }, [allEntities, activeTab, searchQuery]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredList.length / itemsPerPage) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredList.slice(start, start + itemsPerPage);
  }, [filteredList, currentPage]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  // Export handlers for Admin
  const handleExportCSV = () => {
    if (!isAdmin) return;
    const rows = filteredList.map((item, idx) => ({
      No: idx + 1,
      "Nama Entitas / Usaha": item.nama,
      "Alamat / Lokasi": item.alamat,
      "Kategori / Detail": item.detail || "-",
      "Tipe Entitas": item.typeLabel,
    }));
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob([csvOutput], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Rincian_Entitas_${activeTab}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportExcel = () => {
    if (!isAdmin) return;
    const rows = filteredList.map((item, idx) => ({
      No: idx + 1,
      "Nama Entitas / Usaha": item.nama,
      "Alamat / Lokasi": item.alamat,
      "Kategori / Detail": item.detail || "-",
      "Tipe Entitas": item.typeLabel,
    }));
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Daftar Entitas");
    XLSX.writeFile(
      workbook,
      `Rincian_Entitas_${activeTab}_${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
  };

  // Counts per type
  const counts = useMemo(() => {
    const c = {
      all: allEntities.length,
      usaha: 0,
      "usaha-digital": 0,
      "usaha-pertanian": 0,
      rt: 0,
      bangunan: 0,
    };
    allEntities.forEach((item) => {
      if (c[item.type] !== undefined) c[item.type]++;
    });
    return c;
  }, [allEntities]);

  return (
    <Card className="border-border bg-card/80 backdrop-blur-md shadow-xs space-y-4 p-4 sm:p-5 mt-4">
      <CardHeader className="p-0 pb-2 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            Rincian Entitas & Bangunan Terdata
          </CardTitle>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Daftar nama usaha, rumah tangga, dan bangunan di wilayah terpilih
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Admin-only Export Buttons */}
          {isAdmin && (
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="outline"
                onClick={handleExportCSV}
                className="h-7 text-xs gap-1 px-2"
                title="Export rincian tabel ke CSV"
              >
                <Download className="w-3.5 h-3.5" /> CSV
              </Button>
              <Button
                size="sm"
                onClick={handleExportExcel}
                className="h-7 text-xs gap-1 px-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                title="Export rincian tabel ke Excel"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
              </Button>
            </div>
          )}

          {/* Global Count Badge */}
          <Badge variant="outline" className="w-fit text-xs font-semibold px-3 py-1">
            {filteredList.length.toLocaleString()} Dari {allEntities.length.toLocaleString()} Entitas
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-0 space-y-4">
        {/* Top Controls: Filter Pills & Search Input */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Entity Type Filter Tabs/Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            <button
              onClick={() => handleTabChange("all")}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all shrink-0 flex items-center gap-1.5 ${
                activeTab === "all"
                  ? "bg-primary text-primary-foreground border-primary shadow-xs"
                  : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Semua ({counts.all})
            </button>

            <button
              onClick={() => handleTabChange("usaha")}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all shrink-0 flex items-center gap-1.5 ${
                activeTab === "usaha"
                  ? "bg-amber-500 text-white border-amber-500 shadow-xs"
                  : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"
              }`}
            >
              <Store className="w-3.5 h-3.5 text-amber-500 group-hover:text-amber-500" />
              Usaha Biasa ({counts.usaha})
            </button>

            <button
              onClick={() => handleTabChange("usaha-digital")}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all shrink-0 flex items-center gap-1.5 ${
                activeTab === "usaha-digital"
                  ? "bg-pink-500 text-white border-pink-500 shadow-xs"
                  : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"
              }`}
            >
              <Laptop className="w-3.5 h-3.5 text-pink-500" />
              Digital ({counts["usaha-digital"]})
            </button>

            <button
              onClick={() => handleTabChange("usaha-pertanian")}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all shrink-0 flex items-center gap-1.5 ${
                activeTab === "usaha-pertanian"
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                  : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"
              }`}
            >
              <Sprout className="w-3.5 h-3.5 text-emerald-500" />
              Pertanian ({counts["usaha-pertanian"]})
            </button>

            <button
              onClick={() => handleTabChange("rt")}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all shrink-0 flex items-center gap-1.5 ${
                activeTab === "rt"
                  ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                  : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"
              }`}
            >
              <Home className="w-3.5 h-3.5 text-blue-500" />
              Rumah Tangga ({counts.rt})
            </button>

            <button
              onClick={() => handleTabChange("bangunan")}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all shrink-0 flex items-center gap-1.5 ${
                activeTab === "bangunan"
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                  : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"
              }`}
            >
              <Building2 className="w-3.5 h-3.5 text-indigo-500" />
              Bangunan ({counts.bangunan})
            </button>
          </div>

          {/* Live Search Input */}
          <div className="relative w-full md:w-64 shrink-0">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Cari nama usaha / alamat..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="pl-8 pr-8 text-xs h-8 bg-background/80"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto border rounded-xl bg-background/40">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/60 text-muted-foreground font-bold border-b">
              <tr>
                <th className="p-3 w-12 text-center">#</th>
                <th className="p-3 min-w-[180px]">Nama Entitas / Usaha</th>
                <th className="p-3 min-w-[200px]">Alamat & Lokasi</th>
                <th className="p-3 min-w-[120px]">Kategori / Jenis</th>
                <th className="p-3 min-w-[110px]">Tipe Entitas</th>
              </tr>
            </thead>
            <tbody className="divide-y text-foreground">
              {paginatedData.length > 0 ? (
                paginatedData.map((item, idx) => {
                  const rowIndex = (currentPage - 1) * itemsPerPage + idx + 1;
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-muted/40 transition-colors"
                    >
                      <td className="p-3 text-center text-muted-foreground font-mono text-[11px]">
                        {rowIndex}
                      </td>
                      <td className="p-3 font-semibold text-foreground">
                        <div className="flex items-center gap-2">
                          <span>{item.nama}</span>
                        </div>
                      </td>
                      <td className="p-3 text-muted-foreground text-[11px] leading-snug">
                        <div className="flex items-start gap-1">
                          <MapPin className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5" />
                          <span>{item.alamat}</span>
                        </div>
                      </td>
                      <td className="p-3 text-muted-foreground text-[11px]">
                        <span className="bg-muted/70 px-2 py-0.5 rounded text-[10px] font-medium border">
                          {item.detail || "-"}
                        </span>
                      </td>
                      <td className="p-3">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold px-2 py-0.5 border ${item.badgeClass}`}
                        >
                          {item.typeLabel}
                        </Badge>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="p-8 text-center text-muted-foreground space-y-2"
                  >
                    <Building2 className="w-8 h-8 mx-auto text-muted-foreground/40" />
                    <p className="font-medium text-xs">
                      {searchQuery
                        ? `Tidak ada entitas yang cocok dengan kata kunci "${searchQuery}"`
                        : "Tidak ada data entitas ditemukan di wilayah terpilih ini."}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer: Pagination & Info */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t text-xs">
          <span className="text-[11px] text-muted-foreground">
            Menampilkan{" "}
            <strong className="text-foreground">
              {filteredList.length > 0
                ? (currentPage - 1) * itemsPerPage + 1
                : 0}
            </strong>{" "}
            -{" "}
            <strong className="text-foreground">
              {Math.min(currentPage * itemsPerPage, filteredList.length)}
            </strong>{" "}
            dari <strong className="text-foreground">{filteredList.length.toLocaleString()}</strong> entitas
          </span>

          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-7 text-xs px-2 gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Prev
              </Button>

              <span className="text-[11px] font-medium px-2 text-muted-foreground">
                {currentPage} / {totalPages}
              </span>

              <Button
                size="sm"
                variant="outline"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-7 text-xs px-2 gap-1"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
