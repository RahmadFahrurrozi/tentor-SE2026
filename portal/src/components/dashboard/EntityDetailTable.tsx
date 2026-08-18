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
import {
  useEntityDetailTable,
  type EntityItem,
} from "@/hooks/use-entity-detail-table";

export type { EntityItem };

export interface EntityDetailTableProps {
  /** Dataset spasial yang dipasok dari layer utama dashboard */
  spatialData: any;
}

/**
 * Komponen Tabel Rincian Entitas & Bangunan Terdata.
 *
 * Menampilkan daftar rincian entitas usaha (biasa, digital, pertanian), rumah tangga,
 * dan bangunan fisik yang terdaftar di wilayah terpilih (Kecamatan / Desa).
 * Dilengkapi dengan filter pencarian, filter kategori tab, pagination, serta fitur ekspor CSV/Excel untuk Admin.
 */
export function EntityDetailTable({ spatialData }: EntityDetailTableProps) {
  const {
    allEntities,
    filteredList,
    paginatedData,
    counts,
    activeTab,
    searchQuery,
    currentPage,
    totalPages,
    itemsPerPage,
    isAdmin,
    handleTabChange,
    handleSearchChange,
    setSearchQuery,
    setCurrentPage,
    handleExportCSV,
    handleExportExcel,
  } = useEntityDetailTable(spatialData);

  return (
    <Card className="border-border bg-card/80 backdrop-blur-md shadow-xs space-y-4 p-4 sm:p-5 mt-4">
      {/* Header Section */}
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
          <Badge
            variant="outline"
            className="w-fit text-xs font-semibold px-3 py-1"
          >
            {filteredList.length.toLocaleString()} Dari{" "}
            {allEntities.length.toLocaleString()} Entitas
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
                <th className="p-3 min-w-30">Kategori / Jenis</th>
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
            dari{" "}
            <strong className="text-foreground">
              {filteredList.length.toLocaleString()}
            </strong>{" "}
            entitas
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
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
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
