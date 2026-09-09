import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useClusterAnalysis } from "@/hooks/use-cluster-analysis";
import type { SlsClusterSummary } from "@/utils/clusterDetector";

export interface ClusterAnalysisTabProps {
  spatialData: any;
}

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

  const handleOpenSlsDetail = (sls: SlsClusterSummary) => {
    setSelectedSlsId(sls.idsls);
    if (sls.clusters.length > 0) {
      setSelectedClusterId(sls.clusters[0].clusterId);
    } else {
      setSelectedClusterId(null);
    }
    setIsDetailDialogOpen(true);
  };

  const handleCloseDetailDialog = () => {
    setIsDetailDialogOpen(false);
    setSelectedSlsId(null);
    setSelectedClusterId(null);
  };

  return (
    <div className="space-y-4">
      {/* ── 1. KPI Metric Summary Cards ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        {/* Total SLS */}
        <Card className="bg-card/70 border">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              {scope === "all_kabupaten" ? "Total SLS Se-Kabupaten" : "Total SLS Dianalisis"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-xl sm:text-2xl font-bold text-foreground">
              {clusterKpi.totalSls.toLocaleString()}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {scope === "all_kabupaten" ? "Seluruh kecamatan se-kabupaten" : "Kecamatan yang sedang dipilih"}
            </p>
          </CardContent>
        </Card>

        {/* SLS Status Bergerombol */}
        <Card className="bg-rose-500/5 border-rose-500/25">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-[11px] font-semibold text-rose-500 uppercase tracking-wider">
              SLS Bergerombol
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-xl sm:text-2xl font-bold text-rose-500">
              {clusterKpi.slsBergerombolCount.toLocaleString()}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Proporsi kluster &ge; 20%
            </p>
          </CardContent>
        </Card>

        {/* Total Titik Bergerombol */}
        <Card className="bg-amber-500/5 border-amber-500/25">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-[11px] font-semibold text-amber-500 uppercase tracking-wider">
              Titik Bergerombol
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-xl sm:text-2xl font-bold text-amber-500">
              {clusterKpi.totalClusteredPoints.toLocaleString()}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {clusterKpi.overallClusterPercent}% dari total titik
            </p>
          </CardContent>
        </Card>

        {/* Titik Normal / Menyebar */}
        <Card className="bg-emerald-500/5 border-emerald-500/25">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-[11px] font-semibold text-emerald-500 uppercase tracking-wider">
              Titik Normal (Menyebar)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-xl sm:text-2xl font-bold text-emerald-500">
              {clusterKpi.totalNoisePoints.toLocaleString()}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Sebaran wajar (mandiri)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── 2. Parameter Notice, Scope Switch & Admin Export Bar ────────────── */}
      <div className="p-3 rounded-lg border bg-muted/30 text-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="font-semibold text-foreground flex items-center gap-2">
            <span>Kriteria Deteksi Kluster Spasial (DBSCAN)</span>
            <Badge
              variant="outline"
              className={`text-[10px] font-bold px-2 py-0 border ${
                scope === "all_kabupaten"
                  ? "bg-primary/10 text-primary border-primary/30"
                  : "bg-muted text-muted-foreground border-border"
              }`}
            >
              {scope === "all_kabupaten" ? "Mode: Seluruh Kabupaten" : "Mode: Kecamatan Aktif"}
            </Badge>
          </div>
          <div className="text-[11px] text-muted-foreground">
            Radius: <strong>5 meter</strong> | Min titik: <strong>5 titik</strong> | Status: <strong>&ge; 20% bergerombol</strong> | Kluster Terbesar: <strong className="text-foreground">{clusterKpi.largestClusterOverall} titik</strong>
          </div>
        </div>

        {/* Action Controls: Scope Switch & Admin Exports */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {scope === "current_kecamatan" ? (
            <Button
              size="sm"
              variant="default"
              disabled={isLoadingAllKab}
              onClick={() => loadAllKabupatenClusters()}
              className="h-7 text-xs px-3 font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
            >
              {isLoadingAllKab ? "Memproses Se-Kabupaten..." : "Muat Rekap Se-Kabupaten"}
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
                className="h-7 text-xs px-2.5 font-medium border-primary/40 text-primary"
              >
                Kembali ke Kecamatan Aktif
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={isLoadingAllKab}
                onClick={() => loadAllKabupatenClusters(true)}
                className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground"
                title="Muat ulang seluruh data se-kabupaten"
              >
                Muat Ulang
              </Button>
            </div>
          )}

          {/* Admin Export Buttons */}
          {isAdmin && (
            <div className="flex items-center gap-1.5 pl-2 border-l border-border/60">
              <Button
                size="sm"
                variant="outline"
                onClick={handleExportCsv}
                className="h-7 text-xs px-2.5 font-medium hover:border-primary"
                title="Ekspor detail titik bergerombol ke file CSV"
              >
                Ekspor CSV
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleExportExcel}
                className="h-7 text-xs px-2.5 font-medium bg-emerald-500/10 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20"
                title="Ekspor rekap SLS dan rincian detail titik ke Excel multi-sheet"
              >
                Ekspor Excel (.xlsx)
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ── Progress Bar Saat Loading Seluruh Kabupaten ─────────────────────── */}
      {isLoadingAllKab && loadProgress && (
        <div className="p-3 rounded-lg border border-primary/30 bg-primary/5 text-xs space-y-1.5 animate-pulse">
          <div className="flex items-center justify-between font-semibold text-foreground">
            <span>Menganalisis Titik Bergerombol Se-Kabupaten...</span>
            <span className="text-primary font-mono font-bold">
              {loadProgress.current} / {loadProgress.total} Kecamatan
            </span>
          </div>
          <div className="text-[11px] text-muted-foreground">
            Sedang memproses: <strong className="text-foreground">{loadProgress.kecName}</strong> (Menjalankan algoritma DBSCAN 5 meter)...
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

      {/* ── 3. Controls & Filter Bar ───────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Cari nama SLS, RT/RW, Dusun, atau Desa..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="h-8 text-xs bg-background"
          />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <Button
            size="sm"
            variant={statusFilter === "SEMUA" ? "default" : "outline"}
            className="h-7 text-xs px-2.5 font-medium"
            onClick={() => {
              setStatusFilter("SEMUA");
              setCurrentPage(1);
            }}
          >
            Semua SLS ({filteredSummaries.length})
          </Button>
          <Button
            size="sm"
            variant={statusFilter === "BERGEROMBOL" ? "default" : "outline"}
            className="h-7 text-xs px-2.5 font-medium border-rose-500/30 text-rose-500"
            onClick={() => {
              setStatusFilter("BERGEROMBOL");
              setCurrentPage(1);
            }}
          >
            Hanya Bergerombol ({clusterKpi.slsBergerombolCount})
          </Button>
          <Button
            size="sm"
            variant={statusFilter === "MENYEBAR" ? "default" : "outline"}
            className="h-7 text-xs px-2.5 font-medium border-emerald-500/30 text-emerald-500"
            onClick={() => {
              setStatusFilter("MENYEBAR");
              setCurrentPage(1);
            }}
          >
            Hanya Menyebar ({clusterKpi.slsMenyebarCount})
          </Button>
        </div>
      </div>

      {/* ── 4. Main SLS Clustering Table ───────────────────────────────────── */}
      <Card className="overflow-hidden border">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="border-b bg-muted/60 font-semibold text-muted-foreground">
              <tr>
                <th className="p-2.5 pl-3">Identitas SLS & Wilayah</th>
                <th className="p-2.5 text-right">Total Titik</th>
                <th className="p-2.5 text-right">Titik Bergerombol</th>
                <th className="p-2.5 text-right">Persentase</th>
                <th className="p-2.5 text-right">Jml Kluster</th>
                <th className="p-2.5 text-right">Kluster Terbesar</th>
                <th className="p-2.5 text-center">Status SLS</th>
                <th className="p-2.5 pr-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {paginatedSummaries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-muted-foreground text-xs">
                    Tidak ada data SLS yang sesuai dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                paginatedSummaries.map((sls) => {
                  const isBergerombol = sls.status === "BERGEROMBOL";
                  return (
                    <tr
                      key={sls.idsls}
                      className={`transition-colors hover:bg-muted/40 ${
                        isBergerombol ? "bg-rose-500/[0.03]" : ""
                      }`}
                    >
                      {/* Wilayah */}
                      <td className="p-2.5 pl-3">
                        <div className="font-semibold text-foreground">
                          {sls.slsName}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          {sls.desaName ? `${sls.desaName}, ` : ""}
                          {sls.kecName ? `${sls.kecName} • ` : ""}
                          <span className="font-mono text-[10px]">ID: {sls.idsls}</span>
                        </div>
                      </td>

                      {/* Total Titik */}
                      <td className="p-2.5 text-right font-medium">
                        {sls.jumlahTitik.toLocaleString()}
                      </td>

                      {/* Titik Bergerombol */}
                      <td className="p-2.5 text-right font-bold text-amber-500">
                        {sls.titikBergerombol > 0
                          ? sls.titikBergerombol.toLocaleString()
                          : "0"}
                      </td>

                      {/* Persentase */}
                      <td className="p-2.5 text-right font-medium">
                        <span
                          className={
                            sls.persenBergerombol >= 20
                              ? "text-rose-500 font-bold"
                              : "text-muted-foreground"
                          }
                        >
                          {sls.persenBergerombol}%
                        </span>
                      </td>

                      {/* Jumlah Kluster */}
                      <td className="p-2.5 text-right font-medium">
                        {sls.jumlahCluster}
                      </td>

                      {/* Kluster Terbesar */}
                      <td className="p-2.5 text-right font-medium">
                        {sls.clusterTerbesar > 0 ? (
                          <span className="text-foreground font-semibold">
                            {sls.clusterTerbesar} titik
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>

                      {/* Status SLS */}
                      <td className="p-2.5 text-center">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold px-2 py-0.5 border ${
                            isBergerombol
                              ? "bg-rose-500/10 text-rose-500 border-rose-500/40"
                              : "bg-emerald-500/10 text-emerald-500 border-emerald-500/40"
                          }`}
                        >
                          {sls.status}
                        </Badge>
                      </td>

                      {/* Aksi */}
                      <td className="p-2.5 pr-3 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs px-2.5 font-medium hover:border-primary"
                          onClick={() => handleOpenSlsDetail(sls)}
                        >
                          Rincian Titik
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginasi Footer */}
        {totalPages > 1 && (
          <div className="p-3 border-t bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
            <div>
              Menampilkan {paginatedSummaries.length} dari {filteredSummaries.length} SLS
            </div>
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
              <span className="px-2 font-medium text-foreground">
                Halaman {currentPage} dari {totalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-xs"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                Berikutnya
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* ── 5. Modal Dialog Rincian Kluster & Titik Bergerombol ────────────── */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-4 sm:p-6 overflow-hidden">
          <DialogHeader className="pb-3 border-b shrink-0">
            <div className="flex items-center justify-between gap-3">
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  Rincian Titik Bergerombol Per SLS
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  {activeSlsSummary?.slsName} • Desa {activeSlsSummary?.desaName}, Kec. {activeSlsSummary?.kecName} (ID: {activeSlsSummary?.idsls})
                </DialogDescription>
              </div>
              <Badge
                variant="outline"
                className={`text-[11px] font-bold px-2.5 py-0.5 border shrink-0 ${
                  activeSlsSummary?.status === "BERGEROMBOL"
                    ? "bg-rose-500/10 text-rose-500 border-rose-500/40"
                    : "bg-emerald-500/10 text-emerald-500 border-emerald-500/40"
                }`}
              >
                {activeSlsSummary?.status}
              </Badge>
            </div>
          </DialogHeader>

          {/* Dialog Body */}
          <div className="flex-1 overflow-y-auto space-y-4 py-3">
            {/* Ringkasan SLS Terpilih */}
            <div className="grid grid-cols-3 gap-2.5 text-xs p-3 rounded-lg bg-muted/40 border">
              <div>
                <span className="text-muted-foreground">Total Titik SLS:</span>
                <div className="font-bold text-sm text-foreground">
                  {activeSlsSummary?.jumlahTitik} titik
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Titik Bergerombol:</span>
                <div className="font-bold text-sm text-amber-500">
                  {activeSlsSummary?.titikBergerombol} titik ({activeSlsSummary?.persenBergerombol}%)
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Jumlah Kelompok Kluster:</span>
                <div className="font-bold text-sm text-foreground">
                  {activeSlsSummary?.jumlahCluster} kelompok
                </div>
              </div>
            </div>

            {/* Jika tidak ada kluster */}
            {(!activeSlsSummary?.clusters || activeSlsSummary.clusters.length === 0) ? (
              <div className="p-8 text-center border rounded-lg bg-card text-muted-foreground text-xs space-y-1">
                <div className="font-semibold text-emerald-500 text-sm">
                  Tidak Ditemukan Titik Bergerombol
                </div>
                <p>
                  Seluruh titik dalam SLS ini menyebar secara normal (tidak ada kelompok &ge; 5 titik dalam radius 5 meter).
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>Daftar Kelompok Tumpukan Titik (Kluster):</span>
                  <span className="text-[11px] font-normal text-muted-foreground">
                    Pilih kelompok untuk melihat daftar titiknya
                  </span>
                </div>

                {/* Tombol Pemilih Kelompok Kluster */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {activeSlsSummary.clusters.map((c, idx) => {
                    const isSelected = selectedClusterId === c.clusterId;
                    return (
                      <button
                        key={c.clusterId}
                        type="button"
                        onClick={() => setSelectedClusterId(c.clusterId)}
                        className={`px-3 py-2 rounded-lg border text-xs text-left transition-all shrink-0 cursor-pointer ${
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary font-semibold shadow-xs"
                            : "bg-card hover:bg-muted/60 text-foreground border-border"
                        }`}
                      >
                        <div className="leading-tight">
                          Kelompok #{idx + 1}
                        </div>
                        <div className={`text-[10px] mt-0.5 ${isSelected ? "text-primary-foreground/80" : "text-amber-500 font-bold"}`}>
                          {c.pointCount} Titik Menumpuk
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Rincian Kelompok Terpilih */}
                {activeClusterGroup && (
                  <div className="space-y-2 border rounded-lg p-3 bg-card/80">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b">
                      <div>
                        <span className="font-bold text-xs text-foreground">
                          Kelompok Kluster (ID: {activeClusterGroup.clusterId + 1}) • {activeClusterGroup.pointCount} Titik
                        </span>
                        <div className="text-[11px] font-mono text-muted-foreground mt-0.5">
                          Koordinat Pusat: Lat {activeClusterGroup.centroid[1].toFixed(6)}, Lng {activeClusterGroup.centroid[0].toFixed(6)}
                        </div>
                      </div>

                      {/* Tombol Utama: Lihat di Peta */}
                      <Button
                        size="sm"
                        className="h-8 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs shrink-0"
                        onClick={() => {
                          handleCloseDetailDialog();
                          handleFlyToCluster(activeClusterGroup.centroid, {
                            count: activeClusterGroup.pointCount,
                            slsId: activeClusterGroup.slsId,
                            title: `${activeSlsSummary?.slsName} (Kelompok #${activeClusterGroup.clusterId + 1})`,
                            idkec: (activeSlsSummary as any)?.idkec,
                          });
                        }}
                      >
                        Lihat di Peta (Fly To)
                      </Button>
                    </div>

                    {/* Tabel Titik di Dalam Kluster */}
                    <div className="overflow-x-auto max-h-56">
                      <table className="w-full text-xs text-left">
                        <thead className="border-b bg-muted/40 font-semibold text-muted-foreground sticky top-0 bg-card">
                          <tr>
                            <th className="p-2 pl-2.5">ID Titik / Kuesioner</th>
                            <th className="p-2">Kategori Entitas</th>
                            <th className="p-2">Nama / Keterangan</th>
                            <th className="p-2">Koordinat (Lat, Lng)</th>
                            <th className="p-2 pr-2.5 text-right">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {activeClusterGroup.points.map((pt) => (
                            <tr key={pt.id} className="hover:bg-muted/30">
                              <td className="p-2 pl-2.5 font-mono text-[11px]">
                                {pt.id}
                              </td>
                              <td className="p-2">
                                <Badge variant="secondary" className="text-[10px] py-0">
                                  {pt.category}
                                </Badge>
                              </td>
                              <td className="p-2 max-w-[180px] truncate font-medium">
                                {pt.name}
                              </td>
                              <td className="p-2 font-mono text-[10px] text-muted-foreground">
                                {pt.lat.toFixed(6)}, {pt.lng.toFixed(6)}
                              </td>
                              <td className="p-2 pr-2.5 text-right">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 text-[11px] px-2 text-primary hover:bg-primary/10"
                                  onClick={() => {
                                    handleCloseDetailDialog();
                                    handleFlyToCluster([pt.lng, pt.lat], {
                                      count: 1,
                                      slsId: pt.slsId,
                                      title: `${pt.name} (${pt.id})`,
                                      idkec: (activeSlsSummary as any)?.idkec,
                                    });
                                  }}
                                >
                                  Ke Titik Ini
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

          <div className="pt-3 border-t flex justify-end shrink-0">
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
