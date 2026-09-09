import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SearchableCombobox } from "@/components/ui/searchable-combobox";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  Download,
  FileSpreadsheet,
  Building2,
  Store,
  Home,
  Laptop,
  Sprout,
  ShieldCheck,
  ChevronUp,
  ChevronDown,
  BarChart3,
  CheckCircle2,
  Layers,
  MapPin,
  TrendingUp,
  Laptop2,
  Maximize2,
  Minimize2,
  BookOpen,
  Globe,
  Filter,
  SlidersHorizontal,
  Eraser,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { EntityDetailTable } from "./EntityDetailTable";
import { SlsDetailTable } from "./SlsDetailTable";
import { KecamatanComparisonView } from "./KecamatanComparisonView";
import { ClusterAnalysisTab } from "./ClusterAnalysisTab";
import { useStatisticsPanel } from "@/hooks/use-statistics-panel";

/**
 * Interface Props untuk komponen StatisticsPanel
 */
interface StatisticsPanelProps {
  /** Objek data spasial yang berisi layer GeoJSON, data tabular, dan manifest wilayah */
  spatialData: any;
}

/**
 * Komponen Dashboard: StatisticsPanel
 *
 * Menampilkan panel overlay statistik spasial interaktif di atas peta dashboard:
 * 1. Floating Mini Summary Bar (Bottom-Left summary ketika panel terlipat)
 * 2. Header Control Bar (Inline Filter Kecamatan & Desa, Tombol Ekspor CSV/Excel/GeoJSON, Toggle Fullscreen)
 * 3. Ringkasan Kartu KPI (Bangunan, Usaha Biasa, Usaha Digital, Pertanian, Rumah Tangga, Total Entitas)
 * 4. Highlight Insight Cards (Rasio Adopsi Usaha Digital, Kepadatan Entitas per Bangunan, Jumlah SLS)
 * 5. Tabbed Insights (Visual Chart Status Visit & Sebaran Entitas, Komparasi Kecamatan, Tabel SLS, Rekap Indikator)
 * 6. Tabel Rincian Entitas Spasial (EntityDetailTable dengan fitur pencarian & penyaringan)
 */
export function StatisticsPanel({ spatialData }: StatisticsPanelProps) {
  const {
    navigate,
    store,
    isAdmin,
    canExport,
    roleName,
    isExpanded,
    setIsExpanded,
    kecOptions,
    desaOptions,
    dusunOptions,
    slsOptions,
    regionLabel,
    stats,
    pieData,
    barData,
    handleExportCSV,
    handleExportExcel,
    handleExportGeoJSON,
  } = useStatisticsPanel(spatialData);

  const kecamatanOptions = useMemo(() => [
    ...(isAdmin ? [{ value: "Semua", label: "Semua Kecamatan" }] : []),
    ...kecOptions.map((k: any) => ({
      value: k.idkec,
      label: k.nmkec || k.nama || k.name || k.idkec,
    })),
  ], [isAdmin, kecOptions]);

  const desaListOptions = useMemo(() => [
    { value: "Semua", label: "Semua Desa" },
    ...desaOptions.map((d: any) => ({
      value: d.iddesa,
      label: d.nmdesa || d.nama || d.name || d.iddesa,
    })),
  ], [desaOptions]);

  return (
    <>
      {/* ── 1. FLOATING MINI SUMMARY BAR (Bottom-Left saat Panel Terlipat) ── */}
      <div
        className={`absolute bottom-3 left-3 right-16 sm:bottom-4 sm:right-auto sm:left-6 sm:max-w-lg md:max-w-xl bg-card/95 backdrop-blur-md border rounded-xl p-2.5 sm:p-3 shadow-2xl z-30 transition-all duration-300 ease-in-out transform ${
          !store.isStatisticsOpen
            ? "translate-y-0 opacity-100 pointer-events-auto"
            : "translate-y-6 opacity-0 pointer-events-none"
        } flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3`}
      >
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="h-8 w-8 sm:h-9 sm:w-9 flex items-center justify-center text-primary shrink-0">
            <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-xs font-bold truncate max-w-[150px] xs:max-w-[220px] sm:max-w-[260px] md:max-w-[340px]">
                {regionLabel}
              </span>
              <Badge
                variant="outline"
                className="text-[9px] sm:text-[10px] font-semibold text-emerald-500 border-emerald-500/30 bg-emerald-500/10 shrink-0"
              >
                {stats.progressPct}% Terdata
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] sm:text-[11px] text-muted-foreground mt-0.5">
              <span>
                Bangunan:{" "}
                <strong className="text-foreground">
                  {stats.totalBangunan.toLocaleString()}
                </strong>
              </span>
              <span className="hidden sm:inline">•</span>
              <span>
                Usaha:{" "}
                <strong className="text-amber-500">
                  {stats.totalUsaha.toLocaleString()}
                </strong>
              </span>
              <span className="hidden sm:inline">•</span>
              <span>
                Keluarga:{" "}
                <strong className="text-blue-500">
                  {stats.totalRt.toLocaleString()}
                </strong>
              </span>
            </div>
          </div>
        </div>

        <Button
          size="sm"
          onClick={() => store.setStatisticsOpen(true)}
          className="w-full sm:w-auto h-8 text-xs gap-1.5 shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md justify-center"
        >
          <ChevronUp className="w-4 h-4" /> Buka Detail Statistik
        </Button>
      </div>

      {/* ── 2. EXPANDED FLOATING BOTTOM OVERLAY SHEET (Panel Terbuka) ──────── */}
      <div
        className={`absolute bottom-0 left-0 right-0 w-full bg-card/95 backdrop-blur-md border-t shadow-2xl z-30 transition-all duration-300 ease-in-out transform ${
          isExpanded
            ? "h-full max-h-full rounded-none"
            : "h-[75vh] sm:h-[60vh] md:h-[58vh] max-h-[75vh] sm:max-h-[60vh] md:max-h-[58vh] rounded-t-2xl"
        } ${
          store.isStatisticsOpen
            ? "translate-y-0 opacity-100 pointer-events-auto"
            : "translate-y-full opacity-0 pointer-events-none"
        } flex flex-col overflow-hidden`}
      >
        {/* ── Header Control Bar: Title, Selectors, Export & Actions ──────── */}
        <div className="px-3.5 py-3 sm:px-6 sm:py-3.5 border-b bg-card shrink-0 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center justify-between lg:justify-start gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm md:text-base font-bold flex items-center gap-1.5">
                  Statistik & Insight Spasial
                </h3>
                <Badge
                  variant="outline"
                  className="text-[10px] font-semibold bg-amber-500/10 text-amber-500 border-amber-500/30"
                >
                  Role: {roleName}
                </Badge>
              </div>
              <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 truncate">
                Agregasi Data Spasial:{" "}
                <span className="font-semibold text-foreground">
                  {regionLabel}
                </span>
              </p>
            </div>
          </div>

          {/* Actions & Filters Bar */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            {/* Popover Filter Wilayah 4-Level */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-2 px-3 border-dashed hover:border-primary/50 text-xs shadow-xs"
                >
                  <Filter className="w-3.5 h-3.5 text-primary" />
                  <span className="font-medium">Filter Wilayah</span>
                  {store.filterKecamatan !== "Semua" && store.filterKecamatan && (
                    <Badge
                      variant="secondary"
                      className="px-1.5 py-0 text-[10px] h-4 font-semibold bg-primary/15 text-primary border-0"
                    >
                      {store.filterSls !== "Semua"
                        ? "Level RT/RW"
                        : store.filterDusun !== "Semua"
                          ? "Level Dusun"
                          : store.filterDesa !== "Semua"
                            ? "Level Desa"
                            : "Level Kec"}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-80 sm:w-96 p-4 shadow-2xl border bg-card/98 backdrop-blur-md rounded-xl space-y-3.5 z-50"
                align="end"
              >
                <div className="flex items-center justify-between pb-2 border-b">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-primary" />
                    <div>
                      <h4 className="text-xs font-bold leading-none">
                        Filter Wilayah 4-Level
                      </h4>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Kecamatan ➔ Desa ➔ Dusun ➔ RT/RW
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      store.setFilter("filterKecamatan", "Semua");
                      store.setFilter("filterDesa", "Semua");
                      store.setFilter("filterDusun", "Semua");
                      store.setFilter("filterSls", "Semua");
                    }}
                  >
                    <Eraser className="w-3 h-3 mr-1" />
                    Reset
                  </Button>
                </div>

                <div className="space-y-3">
                  {/* Level 1: Kecamatan */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground flex items-center justify-between">
                      <span>1. Kecamatan</span>
                      {store.filterKecamatan !== "Semua" &&
                        store.filterKecamatan && (
                          <span className="text-[10px] text-primary font-normal">
                            Terpilih
                          </span>
                        )}
                    </label>
                    <SearchableCombobox
                      options={kecamatanOptions}
                      value={store.filterKecamatan || undefined}
                      placeholder="Pilih Kecamatan..."
                      emptyText="Kecamatan tidak ditemukan."
                      onValueChange={(val) => {
                        store.setFilter("filterKecamatan", val);
                        store.setFilter("filterDesa", "Semua");
                        store.setFilter("filterDusun", "Semua");
                        store.setFilter("filterSls", "Semua");
                      }}
                    />
                  </div>

                  {/* Level 2: Desa / Kelurahan */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground flex items-center justify-between">
                      <span>2. Desa / Kelurahan</span>
                      {store.filterDesa !== "Semua" && store.filterDesa && (
                        <span className="text-[10px] text-primary font-normal">
                          Terpilih
                        </span>
                      )}
                    </label>
                    <SearchableCombobox
                      options={desaListOptions}
                      value={store.filterDesa || undefined}
                      placeholder="Pilih Desa..."
                      emptyText="Desa tidak ditemukan."
                      disabled={
                        !store.filterKecamatan ||
                        store.filterKecamatan === "Semua" ||
                        desaOptions.length === 0
                      }
                      onValueChange={(val) => {
                        store.setFilter("filterDesa", val);
                        store.setFilter("filterDusun", "Semua");
                        store.setFilter("filterSls", "Semua");
                      }}
                    />
                  </div>

                  {/* Level 3: Dusun / Lingkungan */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground flex items-center justify-between">
                      <span>3. Dusun / Lingkungan</span>
                      {store.filterDusun !== "Semua" && store.filterDusun && (
                        <span className="text-[10px] text-primary font-normal">
                          Terpilih
                        </span>
                      )}
                    </label>
                    <SearchableCombobox
                      options={dusunOptions}
                      value={store.filterDusun || undefined}
                      placeholder="Pilih Dusun..."
                      emptyText="Dusun tidak ditemukan."
                      disabled={
                        !store.filterDesa ||
                        store.filterDesa === "Semua" ||
                        dusunOptions.length <= 1
                      }
                      onValueChange={(val) => {
                        store.setFilter("filterDusun", val);
                        store.setFilter("filterSls", "Semua");
                      }}
                    />
                  </div>

                  {/* Level 4: RT / RW (SLS) */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground flex items-center justify-between">
                      <span>4. RT / RW (Unit SLS)</span>
                      {store.filterSls !== "Semua" && store.filterSls && (
                        <span className="text-[10px] text-primary font-normal">
                          Terpilih
                        </span>
                      )}
                    </label>
                    <SearchableCombobox
                      options={slsOptions}
                      value={store.filterSls || undefined}
                      placeholder="Pilih RT / RW..."
                      emptyText="RT / RW tidak ditemukan."
                      disabled={
                        !store.filterDesa ||
                        store.filterDesa === "Semua" ||
                        slsOptions.length <= 1
                      }
                      onValueChange={(val) => store.setFilter("filterSls", val)}
                    />
                  </div>
                </div>

                <div className="pt-2 border-t text-[11px] text-muted-foreground flex items-center justify-between">
                  <span className="truncate max-w-[280px]">
                    <span className="font-semibold text-foreground">Aktif:</span> {regionLabel}
                  </span>
                </div>
              </PopoverContent>
            </Popover>

            {/* Tombol Ekspor (CSV, Excel, GeoJSON) */}
            {canExport ? (
              <div className="flex items-center gap-1.5 ml-auto sm:ml-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleExportCSV}
                  className="h-8 text-xs gap-1 px-2.5"
                  title="Export data ke CSV"
                >
                  <Download className="w-3.5 h-3.5" /> CSV
                </Button>
                <Button
                  size="sm"
                  onClick={handleExportExcel}
                  className="h-8 text-xs gap-1 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                  title="Export data ke Excel"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
                </Button>
                {isAdmin && (
                  <Button
                    size="sm"
                    variant="default"
                    onClick={handleExportGeoJSON}
                    className="h-8 text-xs gap-1 px-2.5 shadow-md font-semibold"
                    title="Export data spasial ter-filter ke format GeoJSON (Khusus Admin)"
                  >
                    <Globe className="w-3.5 h-3.5" /> GeoJSON
                  </Button>
                )}
              </div>
            ) : (
              <div className="text-[11px] text-muted-foreground flex items-center gap-1 bg-muted/60 px-2.5 py-1 rounded border ml-auto sm:ml-0">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-500" /> Export
                (Khusus Admin)
              </div>
            )}

            {/* Tombol Dokumentasi */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate("/documentation")}
              className="h-8 text-xs gap-1.5 px-2.5 border-primary/20 text-foreground hover:text-primary shrink-0"
              title="Buka Halaman Panduan & Dokumentasi"
            >
              <BookOpen className="w-3.5 h-3.5 text-primary" />
              <span className="hidden sm:inline">Dokumentasi</span>
            </Button>

            {/* Tombol Toggle Fullscreen / Layar Penuh */}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsExpanded((prev) => !prev)}
              className="h-8 w-8 p-0 ml-1 text-muted-foreground hover:text-foreground rounded-full shrink-0"
              title={
                isExpanded
                  ? "Kecilkan Tampilan (Restore)"
                  : "Perluas Layar Penuh (Fullscreen)"
              }
            >
              {isExpanded ? (
                <Minimize2 className="w-4 h-4 text-primary" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </Button>

            {/* Tombol Tutup / Collapse Panel */}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setIsExpanded(false);
                store.setStatisticsOpen(false);
              }}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground rounded-full shrink-0"
              title="Sembunyikan Panel"
            >
              <ChevronDown className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* ── 3. CONTENT BODY SCROLLABLE ─────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 md:p-6 space-y-4 sm:space-y-6">
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
            {/* KPI: Total Bangunan */}
            <Card className="bg-card/60 border-primary/20">
              <CardHeader className="p-2.5 sm:p-3 pb-1 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-[10px] sm:text-[11px] font-medium text-muted-foreground truncate">
                  Total Bangunan
                </CardTitle>
                <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary shrink-0" />
              </CardHeader>
              <CardContent className="p-2.5 sm:p-3 pt-0">
                <div className="text-lg sm:text-xl font-bold">
                  {stats.totalBangunan.toLocaleString()}
                </div>
                <p className="text-[9px] sm:text-[10px] font-medium text-emerald-500 mt-0.5 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 inline shrink-0" />{" "}
                  {stats.progressPct}% Terkunjungi
                </p>
              </CardContent>
            </Card>

            {/* KPI: Usaha Biasa */}
            <Card className="bg-card/60">
              <CardHeader className="p-2.5 sm:p-3 pb-1 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-[10px] sm:text-[11px] font-medium text-muted-foreground truncate">
                  Usaha Biasa
                </CardTitle>
                <Store className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 shrink-0" />
              </CardHeader>
              <CardContent className="p-2.5 sm:p-3 pt-0">
                <div className="text-lg sm:text-xl font-bold">
                  {stats.totalUsaha.toLocaleString()}
                </div>
                <p className="text-[9px] sm:text-[10px] text-muted-foreground mt-0.5">
                  Non-Pertanian
                </p>
              </CardContent>
            </Card>

            {/* KPI: Usaha Digital */}
            <Card className="bg-card/60">
              <CardHeader className="p-2.5 sm:p-3 pb-1 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-[10px] sm:text-[11px] font-medium text-muted-foreground truncate">
                  Usaha Digital
                </CardTitle>
                <Laptop className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-pink-500 shrink-0" />
              </CardHeader>
              <CardContent className="p-2.5 sm:p-3 pt-0">
                <div className="text-lg sm:text-xl font-bold text-pink-500">
                  {stats.totalUsahaDigital.toLocaleString()}
                </div>
                <p className="text-[9px] sm:text-[10px] text-muted-foreground mt-0.5">
                  E-Commerce & Online
                </p>
              </CardContent>
            </Card>

            {/* KPI: Usaha Pertanian */}
            <Card className="bg-card/60">
              <CardHeader className="p-2.5 sm:p-3 pb-1 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-[10px] sm:text-[11px] font-medium text-muted-foreground truncate">
                  Usaha Pertanian
                </CardTitle>
                <Sprout className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500 shrink-0" />
              </CardHeader>
              <CardContent className="p-2.5 sm:p-3 pt-0">
                <div className="text-lg sm:text-xl font-bold">
                  {stats.totalUsahaPertanian.toLocaleString()}
                </div>
                <p className="text-[9px] sm:text-[10px] text-muted-foreground mt-0.5">
                  Agrikultur & Tani
                </p>
              </CardContent>
            </Card>

            {/* KPI: KK */}
            <Card className="bg-card/60">
              <CardHeader className="p-2.5 sm:p-3 pb-1 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-[10px] sm:text-[11px] font-medium text-muted-foreground truncate">
                  Keluarga (KK)
                </CardTitle>
                <Home className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-500 shrink-0" />
              </CardHeader>
              <CardContent className="p-2.5 sm:p-3 pt-0">
                <div className="text-lg sm:text-xl font-bold">
                  {stats.totalRt.toLocaleString()}
                </div>
                <p className="text-[9px] sm:text-[10px] text-muted-foreground mt-0.5">
                  Kepala Keluarga (KK)
                </p>
              </CardContent>
            </Card>

            {/* KPI: Total Entitas */}
            <Card className="bg-primary/5 border-primary/30">
              <CardHeader className="p-2.5 sm:p-3 pb-1 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-[10px] sm:text-[11px] font-medium text-primary truncate">
                  Total Entitas
                </CardTitle>
                <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary shrink-0" />
              </CardHeader>
              <CardContent className="p-2.5 sm:p-3 pt-0">
                <div className="text-lg sm:text-xl font-bold text-primary">
                  {stats.totalEntitas.toLocaleString()}
                </div>
                <p className="text-[9px] sm:text-[10px] text-muted-foreground mt-0.5">
                  Total Spasial Terdata
                </p>
              </CardContent>
            </Card>
          </div>

          {/* ── 4. Highlight Insight Cards Bar ────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
            {/* Insight 1: Adopsi Usaha Digital */}
            <div className="p-3 sm:p-3.5 bg-muted/40 rounded-xl border flex items-center gap-3">
              <div className="p-2 sm:p-2.5 rounded-lg bg-pink-500/10 text-pink-500 shrink-0">
                <Laptop2 className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] sm:text-xs font-semibold text-muted-foreground truncate">
                  Adopsi Usaha Digital
                </div>
                <div className="text-sm sm:text-base font-bold flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <span>{stats.rasioDigital}%</span>
                  <span className="text-[10px] sm:text-[11px] font-normal text-muted-foreground">
                    ({stats.totalUsahaDigital} dari {stats.totalEntitasUsaha}{" "}
                    usaha)
                  </span>
                </div>
              </div>
            </div>

            {/* Insight 2: Kepadatan Spasial Entitas */}
            <div className="p-3 sm:p-3.5 bg-muted/40 rounded-xl border flex items-center gap-3">
              <div className="p-2 sm:p-2.5 rounded-lg bg-blue-500/10 text-blue-500 shrink-0">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] sm:text-xs font-semibold text-muted-foreground truncate">
                  Kepadatan Spasial Entitas
                </div>
                <div className="text-sm sm:text-base font-bold flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <span>{stats.rasioKepadatan}</span>
                  <span className="text-[10px] sm:text-[11px] font-normal text-muted-foreground">
                    entitas / unit bangunan
                  </span>
                </div>
              </div>
            </div>

            {/* Insight 3: Cakupan SLS Spasial */}
            <div className="p-3 sm:p-3.5 bg-muted/40 rounded-xl border flex items-center gap-3">
              <div className="p-2 sm:p-2.5 rounded-lg bg-emerald-500/10 text-emerald-500 shrink-0">
                <MapPin className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] sm:text-xs font-semibold text-muted-foreground truncate">
                  Cakupan SLS Spasial
                </div>
                <div className="text-sm sm:text-base font-bold flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <span>{stats.slsCount} SLS</span>
                  <span className="text-[10px] sm:text-[11px] font-normal text-muted-foreground">
                    di wilayah ini
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── 5. Visual Charts, Komparasi, & Table Tabs ─────────────────── */}
          <Tabs defaultValue="visual" className="w-full">
            <TabsList className="grid grid-cols-2 sm:grid-cols-5 max-w-3xl mb-4">
              <TabsTrigger value="visual" className="text-xs">
                Visual Chart & Insight
              </TabsTrigger>
              <TabsTrigger value="komparasi" className="text-xs">
                Komparasi Kecamatan
              </TabsTrigger>
              <TabsTrigger value="sls" className="text-xs">
                Tabel Data SLS
              </TabsTrigger>
              <TabsTrigger value="cluster" className="text-xs">
                Titik Bergerombol
              </TabsTrigger>
              <TabsTrigger value="table" className="text-xs">
                Rekap Indikator
              </TabsTrigger>
            </TabsList>

            <TabsContent value="komparasi">
              <KecamatanComparisonView spatialData={spatialData} />
            </TabsContent>

            <TabsContent value="sls">
              <SlsDetailTable spatialData={spatialData} />
            </TabsContent>

            <TabsContent value="cluster">
              <ClusterAnalysisTab spatialData={spatialData} />
            </TabsContent>

            <TabsContent value="visual" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {/* Visit Progress Pie Chart */}
                <Card className="p-3 sm:p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      Status Kunjungan Bangunan
                    </h4>
                    <Badge variant="outline" className="text-[10px]">
                      {stats.progressPct}% Selesai
                    </Badge>
                  </div>
                  <div className="h-56 sm:h-60 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={75}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                        <Legend wrapperStyle={{ fontSize: "11px" }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                {/* Category Breakdown Bar Chart */}
                <Card className="p-3 sm:p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-semibold flex items-center gap-1.5">
                      <BarChart3 className="w-4 h-4 text-amber-500" />
                      Sebaran Entitas Spasial Terdata
                    </h4>
                    <Badge variant="outline" className="text-[10px]">
                      {stats.totalEntitas} Entitas
                    </Badge>
                  </div>
                  <div className="h-56 sm:h-60 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={barData}>
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <RechartsTooltip />
                        <Bar dataKey="jumlah" radius={[6, 6, 0, 0]}>
                          {barData.map((entry, index) => (
                            <Cell key={`bar-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="table">
              <Card className="p-3 sm:p-4 overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="border-b bg-muted/50 font-semibold text-muted-foreground">
                    <tr>
                      <th className="p-2 sm:p-2.5">
                        Kategori Indikator Spasial
                      </th>
                      <th className="p-2 sm:p-2.5 text-right">
                        Jumlah Terdata
                      </th>
                      <th className="p-2 sm:p-2.5 text-right">Proporsi (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr>
                      <td className="p-2 sm:p-2.5 font-medium flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>{" "}
                        Bangunan Dikunjungi
                      </td>
                      <td className="p-2 sm:p-2.5 text-right font-bold text-emerald-600">
                        {stats.sudahKunjung.toLocaleString()}
                      </td>
                      <td className="p-2 sm:p-2.5 text-right font-medium">
                        {stats.progressPct}%
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 sm:p-2.5 font-medium flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></span>{" "}
                        Bangunan Belum Dikunjungi
                      </td>
                      <td className="p-2 sm:p-2.5 text-right font-bold text-rose-500">
                        {stats.belumKunjung.toLocaleString()}
                      </td>
                      <td className="p-2 sm:p-2.5 text-right font-medium">
                        {100 - stats.progressPct}%
                      </td>
                    </tr>
                    <tr className="bg-muted/30">
                      <td className="p-2 sm:p-2.5 font-semibold">
                        Total Bangunan Fisik
                      </td>
                      <td className="p-2 sm:p-2.5 text-right font-bold">
                        {stats.totalBangunan.toLocaleString()}
                      </td>
                      <td className="p-2 sm:p-2.5 text-right font-medium">
                        100%
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 sm:p-2.5 font-medium flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>{" "}
                        Titik Usaha Biasa (Non-Tani)
                      </td>
                      <td className="p-2 sm:p-2.5 text-right font-bold text-amber-500">
                        {stats.totalUsaha.toLocaleString()}
                      </td>
                      <td className="p-2 sm:p-2.5 text-right font-medium">
                        {stats.totalEntitas > 0
                          ? Math.round(
                              (stats.totalUsaha / stats.totalEntitas) * 100,
                            )
                          : 0}
                        %
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 sm:p-2.5 font-medium flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-pink-500 shrink-0"></span>{" "}
                        Titik Usaha Digital (Online)
                      </td>
                      <td className="p-2 sm:p-2.5 text-right font-bold text-pink-500">
                        {stats.totalUsahaDigital.toLocaleString()}
                      </td>
                      <td className="p-2 sm:p-2.5 text-right font-medium">
                        {stats.totalEntitas > 0
                          ? Math.round(
                              (stats.totalUsahaDigital / stats.totalEntitas) *
                                100,
                            )
                          : 0}
                        %
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 sm:p-2.5 font-medium flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>{" "}
                        Titik Usaha Pertanian
                      </td>
                      <td className="p-2 sm:p-2.5 text-right font-bold text-emerald-500">
                        {stats.totalUsahaPertanian.toLocaleString()}
                      </td>
                      <td className="p-2 sm:p-2.5 text-right font-medium">
                        {stats.totalEntitas > 0
                          ? Math.round(
                              (stats.totalUsahaPertanian / stats.totalEntitas) *
                                100,
                            )
                          : 0}
                        %
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 sm:p-2.5 font-medium flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0"></span>{" "}
                        Keluarga (KK)
                      </td>
                      <td className="p-2 sm:p-2.5 text-right font-bold text-blue-500">
                        {stats.totalRt.toLocaleString()}
                      </td>
                      <td className="p-2 sm:p-2.5 text-right font-medium">
                        {stats.totalEntitas > 0
                          ? Math.round(
                              (stats.totalRt / stats.totalEntitas) * 100,
                            )
                          : 0}
                        %
                      </td>
                    </tr>
                    <tr className="bg-primary/5">
                      <td className="p-2 sm:p-2.5 font-semibold text-primary">
                        Total Entitas Terdata
                      </td>
                      <td className="p-2 sm:p-2.5 text-right font-bold text-primary">
                        {stats.totalEntitas.toLocaleString()}
                      </td>
                      <td className="p-2 sm:p-2.5 text-right font-bold text-primary">
                        100%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </Card>
            </TabsContent>
          </Tabs>

          {/* ── 6. TABEL RINCIAN ENTITAS SPASIAL (Search & Filter) ───────────── */}
          <EntityDetailTable spatialData={spatialData} />
        </div>
      </div>
    </>
  );
}
