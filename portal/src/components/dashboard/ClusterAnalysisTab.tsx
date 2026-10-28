import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Search, X, AlertTriangle, CheckCircle2, LocateFixed } from "lucide-react";
import { useClusterAnalysis } from "@/hooks/use-cluster-analysis";
import type { SlsClusterSummary } from "@/utils/clusterDetector";

/* ────────────────────────────── Types ────────────────────────────── */

export interface ClusterAnalysisTabProps {
  /** Tipe diambil dari hook, jadi tanpa `any` */
  spatialData: Parameters<typeof useClusterAnalysis>[0]["spatialData"];
}

// Ringkasan SLS yang mungkin membawa idkec (dulu di-cast ke `any`)
type SlsWithKec = SlsClusterSummary & { idkec?: string };

interface KpiItem {
  label: string;
  value: number;
  hint: string;
  /** "danger" = penanda merah untuk titik/SLS bergerombol */
  tone: "default" | "danger";
}

/* ────────────────────────────── Constants ────────────────────────────── */

const NUM = "font-mono tabular-nums";

const fmt = (n: number): string => n.toLocaleString();

// Pill filter: aktif = primary muda (atau merah muda untuk filter bergerombol)
const pillClass = (active: boolean, danger = false): string => {
  const base =
    "shrink-0 inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2";
  if (danger) {
    return `${base} focus-visible:ring-red-500/40 ${
      active
        ? "border-red-500/50 bg-red-500/10 text-red-600 dark:text-red-400"
        : "border-red-500/30 bg-background text-red-600 dark:text-red-400 hover:bg-red-500/10"
    }`;
  }
  return `${base} focus-visible:ring-primary/40 ${
    active
      ? "border-primary/40 bg-primary/10 text-primary"
      : "border-border bg-background text-muted-foreground hover:bg-muted/60 hover:text-foreground"
  }`;
};

// Chip status SLS: BERGEROMBOL = merah, lainnya = netral dengan dot primary
function StatusChip({ status }: { status: string }) {
  const isDanger = status === "BERGEROMBOL";
  return isDanger ? (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold text-red-600 dark:text-red-400">
      <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
      {status}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-md border bg-background px-2 py-0.5 text-[10px] font-medium text-foreground">
      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
      {status}
    </span>
  );
}

/* ────────────────────────────── Component ────────────────────────────── */

export function ClusterAnalysisTab({ spatialData }: ClusterAnalysisTabProps) {
  const {
    isAdmin,
    scope,
    setScope,
    isLoadingAllKab,
    loadProgress,
    loadAllKabupatenClusters,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    currentPage,
    setCurrentPage,
    totalPages,
    clusterKpi,
    filteredSummaries,
    paginatedSummaries,
    setSelectedSlsId,
    selectedClusterId,
    setSelectedClusterId,
    activeSlsSummary,
    activeClusterGroup,
    handleFlyToCluster,
    handleExportExcel,
    handleExportCsv,
  } = useClusterAnalysis({ spatialData });

  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  // idkec diambil sekali dengan tipe aman (tanpa `as any`)
  const activeIdkec = (activeSlsSummary as SlsWithKec | null | undefined)
    ?.idkec;

  const handleOpenSlsDetail = (sls: SlsClusterSummary): void => {
    setSelectedSlsId(sls.idsls);
    if (sls.clusters.length > 0) {
      setSelectedClusterId(sls.clusters[0].clusterId);
    } else {
      setSelectedClusterId(null);
    }
    setIsDetailDialogOpen(true);
  };

  const handleCloseDetailDialog = (): void => {
    setIsDetailDialogOpen(false);
    setSelectedSlsId(null);
    setSelectedClusterId(null);
  };

  const isAllKab = scope === "all_kabupaten";

  // Empat KPI: dua yang bergerombol bertanda merah
  const kpis: KpiItem[] = [
    {
      label: isAllKab ? "Total SLS se-kabupaten" : "Total SLS dianalisis",
      value: clusterKpi.totalSls,
      hint: isAllKab
        ? "Seluruh kecamatan se-kabupaten"
        : "Kecamatan yang sedang dipilih",
      tone: "default",
    },
    {
      label: "SLS bergerombol",
      value: clusterKpi.slsBergerombolCount,
      hint: "Proporsi kluster ≥ 20%",
      tone: "danger",
    },
    {
      label: "Titik bergerombol",
      value: clusterKpi.totalClusteredPoints,
      hint: `${clusterKpi.overallClusterPercent}% dari total titik`,
      tone: "danger",
    },
    {
      label: "Titik normal (menyebar)",
      value: clusterKpi.totalNoisePoints,
      hint: "Sebaran wajar (mandiri)",
      tone: "default",
    },
  ];

  return (
    <div className="mt-4 rounded-lg border bg-background overflow-hidden">
      {/* ── 1. KPI: satu kotak bersekat garis ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border border-b">
        {kpis.map((kpi) => {
          const danger = kpi.tone === "danger";
          return (
            <div
              key={kpi.label}
              className={`p-3 sm:p-4 ${danger ? "bg-red-500/5" : "bg-background"}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`text-[11px] font-medium truncate ${
                    danger
                      ? "text-red-600 dark:text-red-400"
                      : "text-muted-foreground"
                  }`}
                >
                  {kpi.label}
                </span>
                {danger && (
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                )}
              </div>
              <div
                className={`${NUM} mt-2 text-xl sm:text-2xl font-semibold tracking-tight ${
                  danger ? "text-red-600 dark:text-red-400" : "text-foreground"
                }`}
              >
                {fmt(kpi.value)}
              </div>
              <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5">
                {kpi.hint}
              </p>
            </div>
          );
        })}
      </div>

      {/* ── 2. Kriteria, pilihan cakupan, ekspor ── */}
      <div className="px-4 py-3 border-b bg-muted/20 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-semibold tracking-tight">
              Kriteria deteksi kluster spasial (DBSCAN)
            </h4>
            <span
              className={`rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${
                isAllKab
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "bg-muted/40 text-muted-foreground"
              }`}
            >
              {isAllKab ? "Mode: seluruh kabupaten" : "Mode: kecamatan aktif"}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Radius <strong className={`${NUM} text-foreground`}>5 m</strong>
            {" · "}Min. titik{" "}
            <strong className={`${NUM} text-foreground`}>5</strong>
            {" · "}Status{" "}
            <strong className={`${NUM} text-foreground`}>≥ 20%</strong>{" "}
            bergerombol{" · "}Kluster terbesar{" "}
            <strong className={`${NUM} text-red-600 dark:text-red-400`}>
              {clusterKpi.largestClusterOverall} titik
            </strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {scope === "current_kecamatan" ? (
            <Button
              size="sm"
              disabled={isLoadingAllKab}
              onClick={() => loadAllKabupatenClusters()}
              className="h-7 text-xs px-3 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isLoadingAllKab
                ? "Memproses se-kabupaten..."
                : "Muat rekap se-kabupaten"}
            </Button>
          ) : (
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setScope("current_kecamatan");
                  setCurrentPage(1);
                }}
                className="h-7 text-xs px-2.5"
              >
                Kembali ke kecamatan aktif
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={isLoadingAllKab}
                onClick={() => loadAllKabupatenClusters(true)}
                className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground"
                title="Muat ulang seluruh data se-kabupaten"
              >
                Muat ulang
              </Button>
            </div>
          )}

          {isAdmin && (
            <div className="flex items-center gap-1.5 pl-2 border-l">
              <Button
                size="sm"
                variant="outline"
                onClick={handleExportCsv}
                className="h-7 text-xs px-2.5"
                title="Ekspor detail titik bergerombol ke file CSV"
              >
                Ekspor CSV
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleExportExcel}
                className="h-7 text-xs px-2.5"
                title="Ekspor rekap SLS dan rincian detail titik ke Excel multi-sheet"
              >
                Ekspor Excel (.xlsx)
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ── 3. Progress saat memuat se-kabupaten ── */}
      {isLoadingAllKab && loadProgress && (
        <div className="px-4 py-3 border-b bg-primary/5 text-xs space-y-2">
          <div className="flex items-center justify-between gap-2 font-medium text-foreground">
            <span>Menganalisis titik bergerombol se-kabupaten...</span>
            <span className={`${NUM} text-primary font-semibold`}>
              {loadProgress.current} / {loadProgress.total} kecamatan
            </span>
          </div>
          <div className="text-[11px] text-muted-foreground">
            Sedang memproses:{" "}
            <strong className="text-foreground">{loadProgress.kecName}</strong>{" "}
            (menjalankan algoritma DBSCAN 5 meter)
          </div>
          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-200"
              style={{
                width: `${Math.round((loadProgress.current / loadProgress.total) * 100)}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* ── 4. Toolbar: search + filter status ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 px-4 py-3 border-b">
        <div className="relative w-full lg:w-80 shrink-0">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari nama SLS, RT/RW, dusun, atau desa..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-8 pr-8 h-8 text-xs bg-background"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setCurrentPage(1);
              }}
              aria-label="Hapus pencarian"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
          <button
            type="button"
            aria-pressed={statusFilter === "SEMUA"}
            className={pillClass(statusFilter === "SEMUA")}
            onClick={() => {
              setStatusFilter("SEMUA");
              setCurrentPage(1);
            }}
          >
            Semua SLS
            <span className={`${NUM} rounded bg-muted px-1 text-[10px] leading-4`}>
              {filteredSummaries.length}
            </span>
          </button>
          <button
            type="button"
            aria-pressed={statusFilter === "BERGEROMBOL"}
            className={pillClass(statusFilter === "BERGEROMBOL", true)}
            onClick={() => {
              setStatusFilter("BERGEROMBOL");
              setCurrentPage(1);
            }}
          >
            <AlertTriangle className="w-3 h-3" />
            Hanya bergerombol
            <span
              className={`${NUM} rounded bg-red-500/10 px-1 text-[10px] leading-4`}
            >
              {clusterKpi.slsBergerombolCount}
            </span>
          </button>
          <button
            type="button"
            aria-pressed={statusFilter === "MENYEBAR"}
            className={pillClass(statusFilter === "MENYEBAR")}
            onClick={() => {
              setStatusFilter("MENYEBAR");
              setCurrentPage(1);
            }}
          >
            Hanya menyebar
            <span className={`${NUM} rounded bg-muted px-1 text-[10px] leading-4`}>
              {clusterKpi.slsMenyebarCount}
            </span>
          </button>
        </div>
      </div>

      {/* ── 5. Tabel SLS ── */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="border-b bg-muted/40 text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 font-medium">Identitas SLS & wilayah</th>
              <th className="px-4 py-2.5 text-right font-medium">Total titik</th>
              <th className="px-4 py-2.5 text-right font-medium">
                Titik bergerombol
              </th>
              <th className="px-4 py-2.5 text-right font-medium">Persentase</th>
              <th className="px-4 py-2.5 text-right font-medium">Jml kluster</th>
              <th className="px-4 py-2.5 text-right font-medium">
                Kluster terbesar
              </th>
              <th className="px-4 py-2.5 text-center font-medium">Status SLS</th>
              <th className="px-4 py-2.5 text-right font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {paginatedSummaries.length === 0 ? (
              // Empty state
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center">
                  <div className="mx-auto mb-3 h-10 w-10 rounded-md border bg-muted/40 flex items-center justify-center text-muted-foreground">
                    <Search className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-medium text-foreground">
                    Tidak ada hasil
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Tidak ada data SLS yang sesuai dengan filter pencarian.
                  </p>
                </td>
              </tr>
            ) : (
              paginatedSummaries.map((sls) => {
                const isBergerombol = sls.status === "BERGEROMBOL";
                return (
                  <tr
                    key={sls.idsls}
                    className={`transition-colors hover:bg-muted/30 ${
                      isBergerombol ? "bg-red-500/[0.03]" : ""
                    }`}
                  >
                    {/* Garis merah di kiri untuk SLS bergerombol */}
                    <td
                      className={`px-4 py-2.5 border-l-2 ${
                        isBergerombol ? "border-l-red-500" : "border-l-transparent"
                      }`}
                    >
                      <div className="font-medium text-foreground">
                        {sls.slsName}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {sls.desaName ? `${sls.desaName}, ` : ""}
                        {sls.kecName ? `${sls.kecName} · ` : ""}
                        <span className={`${NUM} text-[10px]`}>
                          ID: {sls.idsls}
                        </span>
                      </div>
                    </td>

                    <td className={`${NUM} px-4 py-2.5 text-right`}>
                      {fmt(sls.jumlahTitik)}
                    </td>

                    {/* Titik bergerombol: merah kalau > 0 */}
                    <td
                      className={`${NUM} px-4 py-2.5 text-right ${
                        sls.titikBergerombol > 0
                          ? "font-semibold text-red-600 dark:text-red-400"
                          : "text-muted-foreground"
                      }`}
                    >
                      {fmt(sls.titikBergerombol)}
                    </td>

                    <td
                      className={`${NUM} px-4 py-2.5 text-right ${
                        sls.persenBergerombol >= 20
                          ? "font-semibold text-red-600 dark:text-red-400"
                          : "text-muted-foreground"
                      }`}
                    >
                      {sls.persenBergerombol}%
                    </td>

                    <td className={`${NUM} px-4 py-2.5 text-right`}>
                      {sls.jumlahCluster}
                    </td>

                    <td className={`${NUM} px-4 py-2.5 text-right`}>
                      {sls.clusterTerbesar > 0 ? (
                        <span className="font-medium text-foreground">
                          {sls.clusterTerbesar} titik
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>

                    <td className="px-4 py-2.5 text-center">
                      <StatusChip status={sls.status} />
                    </td>

                    <td className="px-4 py-2.5 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs px-2.5 hover:border-primary/50 hover:text-primary"
                        onClick={() => handleOpenSlsDetail(sls)}
                      >
                        Rincian titik
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── 6. Footer pagination ── */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-4 py-2.5 border-t bg-muted/20 text-xs">
          <span className="text-[11px] text-muted-foreground">
            Menampilkan{" "}
            <strong className={`${NUM} font-medium text-foreground`}>
              {fmt(paginatedSummaries.length)}
            </strong>{" "}
            dari{" "}
            <strong className={`${NUM} font-medium text-foreground`}>
              {fmt(filteredSummaries.length)}
            </strong>{" "}
            SLS
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              Sebelumnya
            </Button>
            <span
              className={`${NUM} px-2 text-[11px] font-medium text-muted-foreground`}
            >
              {currentPage} / {totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs"
              disabled={currentPage >= totalPages}
              onClick={() =>
                setCurrentPage((p) => Math.min(totalPages, p + 1))
              }
            >
              Berikutnya
            </Button>
          </div>
        </div>
      )}

      {/* ── 7. Dialog rincian kluster per SLS ── */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden rounded-lg">
          <DialogHeader className="px-5 py-4 border-b shrink-0 text-left">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <DialogTitle className="text-base font-semibold tracking-tight">
                  Rincian titik bergerombol per SLS
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-1">
                  {activeSlsSummary?.slsName} · Desa{" "}
                  {activeSlsSummary?.desaName}, Kec. {activeSlsSummary?.kecName}{" "}
                  <span className={NUM}>(ID: {activeSlsSummary?.idsls})</span>
                </DialogDescription>
              </div>
              {activeSlsSummary && (
                <StatusChip status={activeSlsSummary.status} />
              )}
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto min-h-0">
            {/* Ringkasan SLS: tiga sel bersekat garis */}
            <div className="grid grid-cols-3 gap-px bg-border border-b">
              <div className="bg-background px-4 py-3">
                <span className="text-[11px] text-muted-foreground block">
                  Total titik SLS
                </span>
                <span
                  className={`${NUM} text-lg font-semibold tracking-tight text-foreground`}
                >
                  {activeSlsSummary?.jumlahTitik}
                  <span className="text-xs font-normal text-muted-foreground">
                    {" "}
                    titik
                  </span>
                </span>
              </div>
              <div className="bg-red-500/5 px-4 py-3">
                <span className="text-[11px] text-red-600 dark:text-red-400 block">
                  Titik bergerombol
                </span>
                <span
                  className={`${NUM} text-lg font-semibold tracking-tight text-red-600 dark:text-red-400`}
                >
                  {activeSlsSummary?.titikBergerombol}
                  <span className="text-xs font-normal">
                    {" "}
                    titik ({activeSlsSummary?.persenBergerombol}%)
                  </span>
                </span>
              </div>
              <div className="bg-background px-4 py-3">
                <span className="text-[11px] text-muted-foreground block">
                  Jumlah kelompok kluster
                </span>
                <span
                  className={`${NUM} text-lg font-semibold tracking-tight text-foreground`}
                >
                  {activeSlsSummary?.jumlahCluster}
                  <span className="text-xs font-normal text-muted-foreground">
                    {" "}
                    kelompok
                  </span>
                </span>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {!activeSlsSummary?.clusters ||
              activeSlsSummary.clusters.length === 0 ? (
                // Tidak ada kluster
                <div className="rounded-lg border p-8 text-center">
                  <div className="mx-auto mb-3 h-10 w-10 rounded-md border bg-primary/5 flex items-center justify-center text-primary">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    Tidak ditemukan titik bergerombol
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Seluruh titik dalam SLS ini menyebar secara normal (tidak
                    ada kelompok ≥ 5 titik dalam radius 5 meter).
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h5 className="text-xs font-semibold text-foreground">
                      Daftar kelompok tumpukan titik (kluster)
                    </h5>
                    <span className="text-[11px] text-muted-foreground">
                      Pilih kelompok untuk melihat daftar titiknya
                    </span>
                  </div>

                  {/* Pemilih kelompok */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {activeSlsSummary.clusters.map((c, idx) => {
                      const isSelected = selectedClusterId === c.clusterId;
                      return (
                        <button
                          key={c.clusterId}
                          type="button"
                          onClick={() => setSelectedClusterId(c.clusterId)}
                          aria-pressed={isSelected}
                          className={`shrink-0 rounded-md border px-3 py-2 text-left text-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                            isSelected
                              ? "border-primary/50 bg-primary/10"
                              : "border-border bg-background hover:bg-muted/60"
                          }`}
                        >
                          <div
                            className={`font-medium leading-tight ${
                              isSelected ? "text-primary" : "text-foreground"
                            }`}
                          >
                            Kelompok #{idx + 1}
                          </div>
                          <div
                            className={`${NUM} mt-0.5 text-[10px] font-semibold text-red-600 dark:text-red-400`}
                          >
                            {c.pointCount} titik menumpuk
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Rincian kelompok terpilih */}
                  {activeClusterGroup && (
                    <div className="rounded-lg border overflow-hidden">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3 border-b bg-muted/20">
                        <div className="min-w-0">
                          <span className="text-xs font-semibold text-foreground inline-flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                            Kelompok kluster (ID:{" "}
                            <span className={NUM}>
                              {activeClusterGroup.clusterId + 1}
                            </span>
                            ) ·{" "}
                            <span
                              className={`${NUM} text-red-600 dark:text-red-400`}
                            >
                              {activeClusterGroup.pointCount} titik
                            </span>
                          </span>
                          <div
                            className={`${NUM} text-[11px] text-muted-foreground mt-0.5`}
                          >
                            Koordinat pusat: Lat{" "}
                            {activeClusterGroup.centroid[1].toFixed(6)}, Lng{" "}
                            {activeClusterGroup.centroid[0].toFixed(6)}
                          </div>
                        </div>

                        <Button
                          size="sm"
                          className="h-8 text-xs gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shrink-0"
                          onClick={() => {
                            handleCloseDetailDialog();
                            handleFlyToCluster(activeClusterGroup.centroid, {
                              count: activeClusterGroup.pointCount,
                              slsId: activeClusterGroup.slsId,
                              title: `${activeSlsSummary?.slsName} (Kelompok #${activeClusterGroup.clusterId + 1})`,
                              idkec: activeIdkec,
                            });
                          }}
                        >
                          <LocateFixed className="w-3.5 h-3.5" /> Lihat di peta
                        </Button>
                      </div>

                      {/* Tabel titik dalam kluster */}
                      <div className="overflow-auto max-h-56">
                        <table className="w-full text-xs text-left">
                          <thead className="sticky top-0 z-10 border-b bg-muted/60 backdrop-blur-sm text-muted-foreground">
                            <tr>
                              <th className="px-4 py-2 font-medium">
                                ID titik / kuesioner
                              </th>
                              <th className="px-4 py-2 font-medium">
                                Kategori entitas
                              </th>
                              <th className="px-4 py-2 font-medium">
                                Nama / keterangan
                              </th>
                              <th className="px-4 py-2 font-medium">
                                Koordinat (lat, lng)
                              </th>
                              <th className="px-4 py-2 text-right font-medium">
                                Aksi
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {activeClusterGroup.points.map((pt) => (
                              <tr
                                key={pt.id}
                                className="hover:bg-muted/30 transition-colors"
                              >
                                <td className={`${NUM} px-4 py-2 text-[11px]`}>
                                  {pt.id}
                                </td>
                                <td className="px-4 py-2">
                                  <span className="inline-block rounded border bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                                    {pt.category}
                                  </span>
                                </td>
                                <td className="px-4 py-2 max-w-[180px] truncate font-medium">
                                  {pt.name}
                                </td>
                                <td
                                  className={`${NUM} px-4 py-2 text-[10px] text-muted-foreground`}
                                >
                                  {pt.lat.toFixed(6)}, {pt.lng.toFixed(6)}
                                </td>
                                <td className="px-4 py-2 text-right">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 text-[11px] px-2 text-primary hover:bg-primary/10 hover:text-primary"
                                    onClick={() => {
                                      handleCloseDetailDialog();
                                      handleFlyToCluster([pt.lng, pt.lat], {
                                        count: 1,
                                        slsId: pt.slsId,
                                        title: `${pt.name} (${pt.id})`,
                                        idkec: activeIdkec,
                                      });
                                    }}
                                  >
                                    Ke titik ini
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="px-5 py-3 border-t bg-muted/20 flex justify-end shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCloseDetailDialog}
              className="text-xs h-8"
            >
              Tutup
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}