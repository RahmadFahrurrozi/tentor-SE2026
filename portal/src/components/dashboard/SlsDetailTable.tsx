import { Input } from "@/components/ui/input";
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
  Building2,
  Store,
  Laptop,
  Sprout,
  Home,
  Layers,
  Eye,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";
import {
  useSlsDetailTable,
  type SlsRowItem,
} from "@/hooks/use-sls-detail-table";

export type { SlsRowItem };

export interface SlsDetailTableProps {
  /** Dataset spasial dari layer utama dashboard (tipe diambil dari hook, tanpa `any`) */
  spatialData: Parameters<typeof useSlsDetailTable>[0];
}

// Satu tab filter di dalam modal
interface ModalTab {
  key: "all" | "usaha" | "usaha-digital" | "usaha-pertanian" | "rt";
  label: string;
  icon: LucideIcon;
}

const MODAL_TABS: ModalTab[] = [
  { key: "all", label: "Semua", icon: Layers },
  { key: "usaha", label: "Usaha", icon: Store },
  { key: "usaha-digital", label: "Digital", icon: Laptop },
  { key: "usaha-pertanian", label: "Tani", icon: Sprout },
  { key: "rt", label: "KK", icon: Home },
];

// Angka pakai font mono + tabular-nums
const NUM = "font-mono tabular-nums";

const fmt = (n: number): string => n.toLocaleString();

// Style pill filter (aktif = primary muda)
const pillClass = (active: boolean): string =>
  `shrink-0 inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
    active
      ? "border-primary/40 bg-primary/10 text-primary"
      : "border-border bg-background text-muted-foreground hover:bg-muted/60 hover:text-foreground"
  }`;

/**
 * Tabel Data Spasial Per SLS (Satuan Lingkungan Setempat).
 *
 * Rekap entitas per SLS beserta progress pendataan. Klik baris untuk membuka
 * dialog rincian entitas di dalam SLS tersebut.
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

  const rangeStart =
    filteredSls.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const rangeEnd = Math.min(currentPage * itemsPerPage, filteredSls.length);
  const anomalyCount = slsEntities.filter((e) => e.isAnomaly).length;

  return (
    <div className="mt-4 rounded-lg border bg-background overflow-hidden">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-b">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-8 w-8 rounded-md border bg-primary/5 text-primary flex items-center justify-center shrink-0">
            <Building className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-semibold tracking-tight">
              Tabel data spasial per SLS (Satuan Lingkungan Setempat)
            </h4>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Klik baris SLS untuk melihat rincian entitas di dalamnya
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
                title="Export data per SLS ke CSV"
              >
                <Download className="w-3.5 h-3.5" /> CSV
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleExportExcel}
                className="h-7 text-xs gap-1.5 px-2.5"
                title="Export data per SLS ke Excel"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-primary" /> Excel
              </Button>
            </div>
          )}

          <span
            className={`${NUM} rounded-md border bg-muted/40 px-2 py-1 text-[11px] font-medium text-muted-foreground whitespace-nowrap`}
          >
            {fmt(filteredSls.length)} SLS
          </span>
        </div>
      </div>

      {/* ── Toolbar: search ── */}
      <div className="px-4 py-3 border-b bg-muted/20">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Cari kode/nama SLS atau desa..."
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

      {/* ── Tabel utama ── */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="border-b bg-muted/40 text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 w-10 text-center font-medium">#</th>
              <th className="px-4 py-2.5 min-w-[180px] font-medium">
                Nama / kode SLS
              </th>
              <th className="px-4 py-2.5 min-w-[160px] font-medium">
                Desa / kelurahan
              </th>
              <th className="px-4 py-2.5 text-right font-medium">
                Usaha biasa
              </th>
              <th className="px-4 py-2.5 text-right font-medium">Digital</th>
              <th className="px-4 py-2.5 text-right font-medium">Pertanian</th>
              <th className="px-4 py-2.5 text-right font-medium">KK</th>
              <th className="px-4 py-2.5 text-right font-medium text-foreground">
                Bangunan
              </th>
              <th className="px-4 py-2.5 min-w-[160px] font-medium">
                Progress kunjungan
              </th>
              <th className="px-4 py-2.5 w-12 text-center font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {paginatedSls.length > 0 ? (
              paginatedSls.map((r, idx) => {
                const rowIndex = (currentPage - 1) * itemsPerPage + idx + 1;
                return (
                  <tr
                    key={r.id}
                    onClick={() => handleOpenSlsModal(r)}
                    className="group cursor-pointer hover:bg-primary/5 transition-colors"
                  >
                    <td
                      className={`${NUM} px-4 py-2.5 text-center text-[11px] text-muted-foreground`}
                    >
                      {rowIndex}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-foreground group-hover:text-primary transition-colors">
                        {r.namaSls}
                      </div>
                      <div
                        className={`${NUM} text-[10px] text-muted-foreground`}
                      >
                        {r.idslsStr}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-[11px] text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span>{r.namaDesa}</span>
                      </div>
                    </td>
                    <td className={`${NUM} px-4 py-2.5 text-right`}>
                      {fmt(r.totalUsaha)}
                    </td>
                    <td className={`${NUM} px-4 py-2.5 text-right`}>
                      {fmt(r.totalUsahaDigital)}
                    </td>
                    <td className={`${NUM} px-4 py-2.5 text-right`}>
                      {fmt(r.totalUsahaPertanian)}
                    </td>
                    <td className={`${NUM} px-4 py-2.5 text-right`}>
                      {fmt(r.totalRt)}
                    </td>
                    <td
                      className={`${NUM} px-4 py-2.5 text-right font-semibold text-primary`}
                    >
                      {fmt(r.totalBangunan)}
                    </td>
                    <td className="px-4 py-2.5">
                      {/* Mini progress bar + angka */}
                      <div className="flex items-center gap-2.5">
                        <div className="h-1.5 w-20 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary transition-all duration-300"
                            style={{
                              width: `${Math.min(100, Math.max(0, r.progressPct))}%`,
                            }}
                          />
                        </div>
                        <span
                          className={`${NUM} text-[11px] text-muted-foreground whitespace-nowrap`}
                        >
                          {r.progressPct}% ({r.sudahTerdata}/{r.totalBangunan})
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                        <Eye className="w-3.5 h-3.5" />
                      </span>
                    </td>
                  </tr>
                );
              })
            ) : (
              // Empty state
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center">
                  <div className="mx-auto mb-3 h-10 w-10 rounded-md border bg-muted/40 flex items-center justify-center text-muted-foreground">
                    <Building className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-medium text-foreground">
                    {searchQuery ? "Tidak ada hasil" : "Belum ada data SLS"}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {searchQuery
                      ? `Tidak ada SLS yang cocok dengan "${searchQuery}".`
                      : "Pilih Kecamatan terlebih dahulu untuk memuat daftar SLS di wilayah ini."}
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Footer pagination ── */}
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
            {fmt(filteredSls.length)}
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

      {/* ── Dialog rincian entitas per SLS ── */}
      <Dialog
        open={!!selectedSls}
        onOpenChange={(open) => {
          if (!open) handleCloseSlsModal();
        }}
      >
        <DialogContent className="sm:max-w-4xl max-w-[95vw] w-full max-h-[88vh] flex flex-col gap-0 p-0 overflow-hidden rounded-lg">
          {selectedSls && (
            <>
              {/* Header dialog */}
              <DialogHeader className="px-5 py-4 border-b shrink-0 space-y-2 text-left">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`${NUM} rounded-md border bg-muted/40 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground`}
                  >
                    {selectedSls.idslsStr}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-md border bg-primary/5 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                    <MapPin className="w-3 h-3" />
                    Desa {selectedSls.namaDesa}, {selectedSls.namaKec}
                  </span>
                </div>
                <DialogTitle className="text-base font-semibold tracking-tight flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary" />
                  Rincian entitas & usaha {selectedSls.namaSls}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Daftar nama usaha, KK, dan objek terdata di SLS ini (
                  {slsEntities.length} total objek)
                </DialogDescription>
              </DialogHeader>

              {/* Ringkasan: satu kotak bersekat garis */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-px bg-border border-b shrink-0">
                {[
                  { label: "Usaha biasa", value: selectedSls.totalUsaha },
                  {
                    label: "Usaha digital",
                    value: selectedSls.totalUsahaDigital,
                  },
                  {
                    label: "Pertanian",
                    value: selectedSls.totalUsahaPertanian,
                  },
                  { label: "KK", value: selectedSls.totalRt },
                  {
                    label: "Bangunan",
                    value: selectedSls.totalBangunan,
                    highlight: true,
                  },
                ].map((kpi, i, arr) => (
                  <div
                    key={kpi.label}
                    className={`px-4 py-3 ${
                      kpi.highlight ? "bg-primary/5" : "bg-background"
                    } ${i === arr.length - 1 ? "col-span-2 sm:col-span-1" : ""}`}
                  >
                    <span
                      className={`text-[11px] font-medium block ${
                        kpi.highlight ? "text-primary" : "text-muted-foreground"
                      }`}
                    >
                      {kpi.label}
                    </span>
                    <span
                      className={`${NUM} text-lg font-semibold tracking-tight ${
                        kpi.highlight ? "text-primary" : "text-foreground"
                      }`}
                    >
                      {fmt(kpi.value)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Filter & search dalam dialog */}
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 px-5 py-3 border-b bg-muted/20 shrink-0">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
                  {MODAL_TABS.map((tab) => {
                    const isActive = modalActiveTab === tab.key;
                    return (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setModalActiveTab(tab.key)}
                        aria-pressed={isActive}
                        className={pillClass(isActive)}
                      >
                        <tab.icon className="w-3 h-3" />
                        {tab.label}
                        {tab.key === "all" && (
                          <span
                            className={`${NUM} rounded px-1 text-[10px] leading-4 ${
                              isActive
                                ? "bg-primary/15 text-primary"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {slsEntities.length}
                          </span>
                        )}
                      </button>
                    );
                  })}

                  {/* Pill anomali: satu-satunya yang pakai warna merah (penanda peringatan) */}
                  {anomalyCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setModalActiveTab("anomali")}
                      aria-pressed={modalActiveTab === "anomali"}
                      className={`shrink-0 inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40 ${
                        modalActiveTab === "anomali"
                          ? "border-red-500/50 bg-red-500/10 text-red-600 dark:text-red-400"
                          : "border-red-500/30 bg-background text-red-600 dark:text-red-400 hover:bg-red-500/10"
                      }`}
                    >
                      <AlertTriangle className="w-3 h-3" />
                      Luar batas
                      <span
                        className={`${NUM} rounded bg-red-500/10 px-1 text-[10px] leading-4`}
                      >
                        {anomalyCount}
                      </span>
                    </button>
                  )}
                </div>

                <div className="relative w-full md:w-60 shrink-0">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Cari entitas di SLS..."
                    value={modalSearchQuery}
                    onChange={(e) => setModalSearchQuery(e.target.value)}
                    className="pl-8 pr-8 text-xs h-8 bg-background"
                  />
                  {modalSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setModalSearchQuery("")}
                      aria-label="Hapus pencarian"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Tabel entitas (scroll di dalam dialog, header sticky) */}
              <div className="overflow-y-auto flex-1 min-h-0">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/60 text-muted-foreground sticky top-0 z-10 backdrop-blur-sm border-b">
                    <tr>
                      <th className="px-4 py-2.5 w-10 text-center font-medium">
                        #
                      </th>
                      <th className="px-4 py-2.5 min-w-[180px] font-medium">
                        Nama entitas / KRT
                      </th>
                      <th className="px-4 py-2.5 min-w-[180px] font-medium">
                        Alamat lengkap
                      </th>
                      <th className="px-4 py-2.5 min-w-[120px] font-medium">
                        Kategori / detail
                      </th>
                      <th className="px-4 py-2.5 min-w-[120px] font-medium">
                        Tipe entitas
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {modalFilteredEntities.length > 0 ? (
                      modalFilteredEntities.map((item, idx) => (
                        <tr
                          key={item.id}
                          className="hover:bg-muted/30 transition-colors"
                        >
                          <td
                            className={`${NUM} px-4 py-2.5 text-center text-[11px] text-muted-foreground`}
                          >
                            {idx + 1}
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="font-medium text-foreground">
                              {item.nama}
                            </div>
                            {item.isAnomaly && (
                              <span className="mt-1 inline-flex items-center gap-1 rounded border border-red-500/30 bg-red-500/10 px-1.5 py-0.5 text-[10px] font-medium text-red-600 dark:text-red-400">
                                <AlertTriangle className="w-3 h-3" />
                                Luar batas (fisik di:{" "}
                                {item.actualSlsName ||
                                  item.actualSlsId ||
                                  "Luar SLS"}
                                )
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-[11px] text-muted-foreground">
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
                            {/* Badge netral + dot primary (badgeClass dari hook tidak dipakai) */}
                            <span className="inline-flex items-center gap-1.5 rounded-md border bg-background px-2 py-0.5 text-[10px] font-medium text-foreground">
                              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                              {item.typeLabel}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-4 py-12 text-center">
                          <div className="mx-auto mb-3 h-10 w-10 rounded-md border bg-muted/40 flex items-center justify-center text-muted-foreground">
                            <Building2 className="w-5 h-5" />
                          </div>
                          <p className="text-xs font-medium text-foreground">
                            {modalSearchQuery
                              ? "Tidak ada hasil"
                              : "Belum ada entitas"}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-1">
                            {modalSearchQuery
                              ? `Tidak ada entitas yang cocok dengan "${modalSearchQuery}".`
                              : "Tidak ada entitas untuk kategori ini di SLS terpilih."}
                          </p>
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
    </div>
  );
}