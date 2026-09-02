import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Search,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  X,
  Building,
  ShieldCheck,
  Building2,
  Store,
  Laptop,
  Sprout,
  Home,
  Layers,
  Eye,
} from "lucide-react";
import {
  useSlsDetailTable,
  type SlsRowItem,
} from "@/hooks/use-sls-detail-table";

export type { SlsRowItem };

export interface SlsDetailTableProps {
  /** Dataset spasial dari layer utama dashboard */
  spatialData: any;
}

/**
 * Komponen Tabel Data Spasial Per SLS (Satuan Lingkungan Setempat).
 *
 * Menampilkan rekapitulasi data entitas per SLS beserta progress pendataan.
 * Memungkinkan pengklik baris SLS untuk membuka Pop-Up Dialog Modal rincian entitas objek di dalamnya.
 */
export function SlsDetailTable({ spatialData }: SlsDetailTableProps) {
  const {
    filteredSls,
    paginatedSls,
    searchQuery,
    currentPage,
    totalPages,
    itemsPerPage,
    selectedSls,
    modalSearchQuery,
    modalActiveTab,
    slsEntities,
    modalFilteredEntities,
    isAdmin,
    setSearchQuery,
    handleSearchChange,
    setModalSearchQuery,
    setModalActiveTab,
    setCurrentPage,
    handleOpenSlsModal,
    handleCloseSlsModal,
    handleExportCSV,
    handleExportExcel,
  } = useSlsDetailTable(spatialData);

  return (
    <Card className="border-border bg-card/80 backdrop-blur-md shadow-xs space-y-4 p-4 sm:p-5 mt-4">
      {/* Header Section */}
      <CardHeader className="p-0 pb-2 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2">
            <Building className="w-4 h-4 text-emerald-500" />
            Tabel Data Spasial Per SLS (Satuan Lingkungan Setempat)
          </CardTitle>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Klik pada SLS untuk melihat pop-up rincian daftar entitas di
            dalamnya
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Admin-only Export Buttons vs Read-Only Badge for PML/PPL */}
          {isAdmin ? (
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="outline"
                onClick={handleExportCSV}
                className="h-7 text-xs gap-1 px-2"
                title="Export data per SLS ke CSV"
              >
                <Download className="w-3.5 h-3.5" /> CSV
              </Button>
              <Button
                size="sm"
                onClick={handleExportExcel}
                className="h-7 text-xs gap-1 px-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                title="Export data per SLS ke Excel"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
              </Button>
            </div>
          ) : (
            <Badge
              variant="outline"
              className="text-[10px] bg-muted/60 text-muted-foreground border flex items-center gap-1 py-1"
            >
              <ShieldCheck className="w-3 h-3 text-blue-500" /> Read Only
              (PML/PPL)
            </Badge>
          )}

          <Badge
            variant="outline"
            className="w-fit text-xs font-semibold px-3 py-1"
          >
            {filteredSls.length.toLocaleString()} SLS Terdata
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-0 space-y-4">
        {/* Search Bar */}
        <div className="flex items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Cari kode/nama SLS atau Desa..."
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
                <th className="p-2.5 w-10 text-center">#</th>
                <th className="p-2.5 min-w-45">Nama / Kode SLS</th>
                <th className="p-2.5 min-w-45">Desa / Kelurahan</th>
                <th className="p-2.5 text-center text-amber-500">
                  Usaha Biasa
                </th>
                <th className="p-2.5 text-center text-pink-500">Digital</th>
                <th className="p-2.5 text-center text-emerald-500">
                  Pertanian
                </th>
                <th className="p-2.5 text-center text-blue-500">
                  Rumah Tangga
                </th>
                <th className="p-2.5 text-center">Total Bangunan</th>
                <th className="p-2.5 text-center min-w-27.5">
                  Progress Kunjungan
                </th>
                <th className="p-2.5 text-center w-12">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y text-foreground">
              {paginatedSls.length > 0 ? (
                paginatedSls.map((r, idx) => {
                  const rowIndex = (currentPage - 1) * itemsPerPage + idx + 1;
                  return (
                    <tr
                      key={r.id}
                      onClick={() => handleOpenSlsModal(r)}
                      className="hover:bg-primary/5 transition-colors cursor-pointer group"
                    >
                      <td className="p-2.5 text-center text-muted-foreground font-mono text-[11px]">
                        {rowIndex}
                      </td>
                      <td className="p-2.5 font-semibold text-foreground group-hover:text-primary transition-colors">
                        <div className="flex items-center gap-1.5">
                          <span>{r.namaSls}</span>
                        </div>
                        <div className="text-[10px] font-mono text-muted-foreground font-normal">
                          {r.idslsStr}
                        </div>
                      </td>
                      <td className="p-2.5 text-muted-foreground text-[11px]">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                          <span>{r.namaDesa}</span>
                        </div>
                      </td>

                      {/* BADGE COUNT USAHA BIASA */}
                      <td className="p-2.5 text-center">
                        <Badge
                          variant="outline"
                          className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 font-semibold px-2 py-0.5"
                        >
                          {r.totalUsaha.toLocaleString()}
                        </Badge>
                      </td>

                      {/* BADGE COUNT DIGITAL */}
                      <td className="p-2.5 text-center">
                        <Badge
                          variant="outline"
                          className="bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/30 font-semibold px-2 py-0.5"
                        >
                          {r.totalUsahaDigital.toLocaleString()}
                        </Badge>
                      </td>

                      {/* BADGE COUNT PERTANIAN */}
                      <td className="p-2.5 text-center">
                        <Badge
                          variant="outline"
                          className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-semibold px-2 py-0.5"
                        >
                          {r.totalUsahaPertanian.toLocaleString()}
                        </Badge>
                      </td>

                      {/* BADGE COUNT RUMAH TANGGA */}
                      <td className="p-2.5 text-center">
                        <Badge
                          variant="outline"
                          className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 font-semibold px-2 py-0.5"
                        >
                          {r.totalRt.toLocaleString()}
                        </Badge>
                      </td>

                      {/* TOTAL BANGUNAN */}
                      <td className="p-2.5 text-center font-bold">
                        {r.totalBangunan.toLocaleString()}
                      </td>

                      {/* PROGRESS KUNJUNGAN */}
                      <td className="p-2.5 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                            {r.progressPct}% ({r.sudahTerdata}/{r.totalBangunan}
                            )
                          </span>
                          <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                              style={{ width: `${r.progressPct}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* AKSI / DETAIL BUTTON */}
                      <td className="p-2.5 text-center">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 rounded-lg"
                          title="Lihat Rincian Entitas SLS Ini"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={10}
                    className="p-8 text-center text-muted-foreground space-y-2"
                  >
                    <Building className="w-8 h-8 mx-auto text-muted-foreground/40" />
                    <p className="font-medium text-xs">
                      {searchQuery
                        ? `Tidak ada SLS yang cocok dengan kata kunci "${searchQuery}"`
                        : "Pilih Kecamatan terlebih dahulu untuk memuat daftar SLS di wilayah ini."}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t text-xs">
          <span className="text-[11px] text-muted-foreground">
            Menampilkan{" "}
            <strong className="text-foreground">
              {filteredSls.length > 0
                ? (currentPage - 1) * itemsPerPage + 1
                : 0}
            </strong>{" "}
            -{" "}
            <strong className="text-foreground">
              {Math.min(currentPage * itemsPerPage, filteredSls.length)}
            </strong>{" "}
            dari{" "}
            <strong className="text-foreground">
              {filteredSls.length.toLocaleString()}
            </strong>{" "}
            SLS
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

      {/* POP-UP MODAL (DIALOG SHADCN) FOR DETAILED SLS ENTITY LIST */}
      <Dialog
        open={!!selectedSls}
        onOpenChange={(open) => {
          if (!open) handleCloseSlsModal();
        }}
      >
        <DialogContent className="sm:max-w-4xl max-w-[95vw] w-full max-h-[88vh] flex flex-col p-4 sm:p-6 overflow-hidden">
          {selectedSls && (
            <>
              <DialogHeader className="pb-3 border-b shrink-0">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {selectedSls.idslsStr}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                  >
                    Desa {selectedSls.namaDesa}, {selectedSls.namaKec}
                  </Badge>
                </div>
                <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2 mt-1">
                  <Building2 className="w-5 h-5 text-primary" />
                  Rincian Entitas & Usaha {selectedSls.namaSls}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Daftar nama usaha, rumah tangga, dan objek terdata di SLS ini
                  ({slsEntities.length} Total Objek)
                </DialogDescription>
              </DialogHeader>

              {/* KPI Badges Summary for SLS */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 my-2 shrink-0">
                <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center">
                  <span className="text-[10px] text-muted-foreground block">
                    Usaha Biasa
                  </span>
                  <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                    {selectedSls.totalUsaha}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-pink-500/10 border border-pink-500/20 text-center">
                  <span className="text-[10px] text-muted-foreground block">
                    Usaha Digital
                  </span>
                  <span className="text-sm font-bold text-pink-600 dark:text-pink-400">
                    {selectedSls.totalUsahaDigital}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center">
                  <span className="text-[10px] text-muted-foreground block">
                    Pertanian
                  </span>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    {selectedSls.totalUsahaPertanian}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-center">
                  <span className="text-[10px] text-muted-foreground block">
                    Rumah Tangga
                  </span>
                  <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                    {selectedSls.totalRt}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-center col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-muted-foreground block">
                    Bangunan
                  </span>
                  <span className="text-sm font-bold text-primary">
                    {selectedSls.totalBangunan}
                  </span>
                </div>
              </div>

              {/* Modal Filters & Search */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 my-1 shrink-0">
                <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                  <Button
                    size="sm"
                    variant={modalActiveTab === "all" ? "default" : "outline"}
                    onClick={() => setModalActiveTab("all")}
                    className="h-7 text-xs px-2 gap-1"
                  >
                    <Layers className="w-3 h-3" /> Semua ({slsEntities.length})
                  </Button>
                  <Button
                    size="sm"
                    variant={modalActiveTab === "usaha" ? "default" : "outline"}
                    onClick={() => setModalActiveTab("usaha")}
                    className="h-7 text-xs px-2 gap-1 border-amber-500/30 text-amber-600 dark:text-amber-400"
                  >
                    <Store className="w-3 h-3" /> Usaha
                  </Button>
                  <Button
                    size="sm"
                    variant={
                      modalActiveTab === "usaha-digital" ? "default" : "outline"
                    }
                    onClick={() => setModalActiveTab("usaha-digital")}
                    className="h-7 text-xs px-2 gap-1 border-pink-500/30 text-pink-600 dark:text-pink-400"
                  >
                    <Laptop className="w-3 h-3" /> Digital
                  </Button>
                  <Button
                    size="sm"
                    variant={
                      modalActiveTab === "usaha-pertanian"
                        ? "default"
                        : "outline"
                    }
                    onClick={() => setModalActiveTab("usaha-pertanian")}
                    className="h-7 text-xs px-2 gap-1 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                  >
                    <Sprout className="w-3 h-3" /> Tani
                  </Button>
                  <Button
                    size="sm"
                    variant={modalActiveTab === "rt" ? "default" : "outline"}
                    onClick={() => setModalActiveTab("rt")}
                    className="h-7 text-xs px-2 gap-1 border-blue-500/30 text-blue-600 dark:text-blue-400"
                  >
                    <Home className="w-3 h-3" /> KRT
                  </Button>
                </div>

                <div className="relative w-full sm:w-56">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Cari entitas di SLS..."
                    value={modalSearchQuery}
                    onChange={(e) => setModalSearchQuery(e.target.value)}
                    className="pl-8 pr-8 text-xs h-7 bg-background/80"
                  />
                  {modalSearchQuery && (
                    <button
                      onClick={() => setModalSearchQuery("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Modal Table Container */}
              <div className="overflow-y-auto border rounded-xl flex-1 bg-background/50 my-1">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/60 text-muted-foreground font-bold sticky top-0 border-b z-10 backdrop-blur-xs">
                    <tr>
                      <th className="p-2.5 w-10 text-center">#</th>
                      <th className="p-2.5 min-w-45">Nama Entitas / KRT</th>
                      <th className="p-2.5 min-w-45">Alamat Lengkap</th>
                      <th className="p-2.5 min-w-30">Kategori / Detail</th>
                      <th className="p-2.5 min-w-30">Tipe Entitas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-foreground">
                    {modalFilteredEntities.length > 0 ? (
                      modalFilteredEntities.map((item, idx) => (
                        <tr
                          key={item.id}
                          className="hover:bg-muted/40 transition-colors"
                        >
                          <td className="p-2.5 text-center text-muted-foreground font-mono text-[11px]">
                            {idx + 1}
                          </td>
                          <td className="p-2.5 font-semibold text-foreground">
                            {item.nama}
                          </td>
                          <td className="p-2.5 text-muted-foreground text-[11px]">
                            <div className="flex items-start gap-1">
                              <MapPin className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5" />
                              <span>{item.alamat}</span>
                            </div>
                          </td>
                          <td className="p-2.5 text-muted-foreground text-[11px]">
                            <span className="bg-muted/70 px-2 py-0.5 rounded text-[10px] font-medium border">
                              {item.detail}
                            </span>
                          </td>
                          <td className="p-2.5">
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-semibold px-2 py-0.5 border ${item.badgeClass}`}
                            >
                              {item.typeLabel}
                            </Badge>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={5}
                          className="p-8 text-center text-muted-foreground"
                        >
                          {modalSearchQuery
                            ? `Tidak ada entitas yang cocok dengan "${modalSearchQuery}"`
                            : "Tidak ada entitas ditemukan untuk kategori ini di SLS terpilih."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
