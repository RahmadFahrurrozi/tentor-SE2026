import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search,
  Building2,
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
import { ENTITY_TABS } from "@/constants/entity-tabs";

export type { EntityItem };

export interface EntityDetailTableProps {
  /** Dataset spasial yang dipasok dari layer utama dashboard (tipe diambil dari hook, tanpa `any`) */
  spatialData: Parameters<typeof useEntityDetailTable>[0];
}

// Angka pakai font mono + tabular-nums biar sejajar rapi
const NUM = "font-mono tabular-nums";

const fmt = (n: number): string => n.toLocaleString();

/**
 * Tabel Rincian Entitas & Bangunan Terdata.
 *
 * Daftar entitas usaha (biasa, digital, pertanian), rumah tangga, dan bangunan fisik
 * di wilayah terpilih. Ada filter kategori, pencarian, pagination, dan export CSV/Excel (Admin).
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

  // Batas nomor baris yang sedang ditampilkan (untuk footer)
  const rangeStart =
    filteredList.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const rangeEnd = Math.min(currentPage * itemsPerPage, filteredList.length);

  return (
    <div className="mt-4 rounded-lg border bg-background overflow-hidden">
      {/* ── Header: judul kiri, ekspor + counter kanan ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-b">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-8 w-8 rounded-md border bg-primary/5 text-primary flex items-center justify-center shrink-0">
            <Building2 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-semibold tracking-tight">
              Rincian entitas & bangunan terdata
            </h4>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Daftar nama usaha, KK, dan bangunan di wilayah terpilih
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Ekspor (khusus Admin) */}
          {isAdmin && (
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="outline"
                onClick={handleExportCSV}
                className="h-7 text-xs gap-1.5 px-2.5"
                title="Export rincian tabel ke CSV"
              >
                <Download className="w-3.5 h-3.5" /> CSV
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleExportExcel}
                className="h-7 text-xs gap-1.5 px-2.5"
                title="Export rincian tabel ke Excel"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-primary" /> Excel
              </Button>
            </div>
          )}

          {/* Counter hasil filter */}
          <span
            className={`${NUM} rounded-md border bg-muted/40 px-2 py-1 text-[11px] font-medium text-muted-foreground whitespace-nowrap`}
          >
            {fmt(filteredList.length)} / {fmt(allEntities.length)} entitas
          </span>
        </div>
      </div>

      {/* ── Toolbar: filter kategori kiri, search kanan ── */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 px-4 py-3 border-b bg-muted/20">
        {/* Filter kategori (pill). Warna dari ENTITY_TABS sengaja diabaikan, semua pakai primary */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {ENTITY_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            const count = counts[tab.key];
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleTabChange(tab.key)}
                aria-pressed={isActive}
                className={`shrink-0 inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                  isActive
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                }`}
              >
                <Icon
                  className={`w-3.5 h-3.5 ${isActive ? "text-primary" : "text-muted-foreground"}`}
                />
                {tab.label}
                <span
                  className={`${NUM} rounded px-1 text-[10px] leading-4 ${
                    isActive
                      ? "bg-primary/15 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72 shrink-0">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Cari nama usaha / alamat..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="pl-8 pr-8 text-xs h-8 bg-background"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              aria-label="Hapus pencarian"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── Tabel ── */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="border-b bg-muted/40 text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 w-12 text-center font-medium">#</th>
              <th className="px-4 py-2.5 min-w-[180px] font-medium">
                Nama entitas / usaha
              </th>
              <th className="px-4 py-2.5 min-w-[200px] font-medium">
                Alamat & lokasi
              </th>
              <th className="px-4 py-2.5 min-w-[120px] font-medium">
                Kategori / jenis
              </th>
              <th className="px-4 py-2.5 min-w-[120px] font-medium">
                Tipe entitas
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {paginatedData.length > 0 ? (
              paginatedData.map((item, idx) => {
                const rowIndex = (currentPage - 1) * itemsPerPage + idx + 1;
                return (
                  <tr
                    key={item.id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td
                      className={`${NUM} px-4 py-2.5 text-center text-[11px] text-muted-foreground`}
                    >
                      {rowIndex}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-foreground">
                      {item.nama}
                    </td>
                    <td className="px-4 py-2.5 text-[11px] leading-snug text-muted-foreground">
                      <div className="flex items-start gap-1.5">
                        <MapPin className="w-3 h-3 shrink-0 mt-0.5" />
                        <span>{item.alamat}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="inline-block rounded border bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {item.detail || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      {/* Badge netral + dot primary (badgeClass dari hook yang warna-warni tidak dipakai) */}
                      <span className="inline-flex items-center gap-1.5 rounded-md border bg-background px-2 py-0.5 text-[10px] font-medium text-foreground">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                        {item.typeLabel}
                      </span>
                    </td>
                  </tr>
                );
              })
            ) : (
              // Empty state
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center">
                  <div className="mx-auto mb-3 h-10 w-10 rounded-md border bg-muted/40 flex items-center justify-center text-muted-foreground">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-medium text-foreground">
                    {searchQuery
                      ? "Tidak ada hasil"
                      : "Belum ada data entitas"}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {searchQuery
                      ? `Tidak ada entitas yang cocok dengan "${searchQuery}".`
                      : "Tidak ada data entitas di wilayah terpilih ini."}
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Footer: info range + pagination ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-4 py-2.5 border-t bg-muted/20 text-xs">
        <span className="text-[11px] text-muted-foreground">
          Menampilkan{" "}
          <strong className={`${NUM} font-medium text-foreground`}>
            {fmt(rangeStart)}
          </strong>
          {" – "}
          <strong className={`${NUM} font-medium text-foreground`}>
            {fmt(rangeEnd)}
          </strong>{" "}
          dari{" "}
          <strong className={`${NUM} font-medium text-foreground`}>
            {fmt(filteredList.length)}
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

            <span
              className={`${NUM} text-[11px] font-medium px-2 text-muted-foreground`}
            >
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
    </div>
  );
}