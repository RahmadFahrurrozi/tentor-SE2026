import { useMemo, type ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SearchableCombobox } from "@/components/ui/searchable-combobox";
import { KecamatanComparisonView } from "./KecamatanComparisonView";
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
  type LucideIcon,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AVAILABLE_BASEMAPS } from "@/config/mapStyles";
import { EntityDetailTable } from "./EntityDetailTable";
import { SlsDetailTable } from "./SlsDetailTable";
import { ClusterAnalysisTab } from "./ClusterAnalysisTab";
import { useStatisticsPanel } from "@/hooks/use-statistics-panel";

/* ────────────────────────────── Types ────────────────────────────── */

// Tipe spatialData diambil langsung dari hook, jadi nggak perlu `any`
type SpatialData = Parameters<typeof useStatisticsPanel>[0];

interface StatisticsPanelProps {
  /** Objek data spasial yang berisi layer GeoJSON, data tabular, dan manifest wilayah */
  spatialData: SpatialData;
}

// Bentuk data opsi wilayah (field nama bisa beda-beda antar sumber data)
interface KecRow {
  idkec: string;
  nmkec?: string;
  nama?: string;
  name?: string;
}

interface DesaRow {
  iddesa: string;
  nmdesa?: string;
  nama?: string;
  name?: string;
}

type FilterKey =
  | "filterKecamatan"
  | "filterDesa"
  | "filterDusun"
  | "filterSls";

type ComboOptions = ComponentProps<typeof SearchableCombobox>["options"];

// Konfigurasi satu level filter wilayah
interface FilterLevel {
  key: FilterKey;
  label: string;
  options: ComboOptions;
  placeholder: string;
  emptyText: string;
  disabled: boolean;
}

interface KpiItem {
  label: string;
  value: number;
  hint: string;
  icon: LucideIcon;
  highlight?: boolean;
}

interface RekapRow {
  label: string;
  value: number;
  pct: number;
  dotClass: string;
  strong?: boolean;
}

/* ────────────────────────────── Constants ────────────────────────────── */

// Warna chart pakai class fill-primary (mengikuti theme), bukan hex, jadi tetap biru & tanpa hijau
const PIE_CLASSES = ["fill-primary", "fill-primary/20"];
const BAR_CLASSES = [
  "fill-primary",
  "fill-primary/75",
  "fill-primary/50",
  "fill-primary/30",
];

// Angka pakai font mono + tabular-nums biar rapi sejajar (ala dashboard Supabase)
const NUM = "font-mono tabular-nums";

const fmt = (n: number): string => n.toLocaleString();

/* ────────────────────────────── Small pieces ────────────────────────────── */

// Header kecil di dalam card: judul kiri, badge/aksi kanan, dipisah hairline
function CardHead({
  icon: Icon,
  title,
  right,
}: {
  icon: LucideIcon;
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2 px-4 py-3 border-b">
      <h4 className="text-xs font-semibold flex items-center gap-2">
        <Icon className="w-3.5 h-3.5 text-primary" />
        {title}
      </h4>
      {right}
    </div>
  );
}

// Chip kecil untuk angka ringkas (mis. "62% Selesai")
function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span
      className={`${NUM} inline-flex items-center rounded-md border bg-muted/40 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground`}
    >
      {children}
    </span>
  );
}

/* ────────────────────────────── Component ────────────────────────────── */

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

  const kecamatanOptions = useMemo(
    () => [
      ...(isAdmin ? [{ value: "Semua", label: "Semua Kecamatan" }] : []),
      ...kecOptions.map((k: KecRow) => ({
        value: k.idkec,
        label: k.nmkec || k.nama || k.name || k.idkec,
      })),
    ],
    [isAdmin, kecOptions],
  );

  const desaListOptions = useMemo(
    () => [
      { value: "Semua", label: "Semua Desa" },
      ...desaOptions.map((d: DesaRow) => ({
        value: d.iddesa,
        label: d.nmdesa || d.nama || d.name || d.iddesa,
      })),
    ],
    [desaOptions],
  );

  // Empat level filter dalam satu array, urutannya = hirarki wilayah
  const levels: FilterLevel[] = [
    {
      key: "filterKecamatan",
      label: "Kecamatan",
      options: kecamatanOptions,
      placeholder: "Pilih Kecamatan...",
      emptyText: "Kecamatan tidak ditemukan.",
      disabled: false,
    },
    {
      key: "filterDesa",
      label: "Desa / Kelurahan",
      options: desaListOptions,
      placeholder: "Pilih Desa...",
      emptyText: "Desa tidak ditemukan.",
      disabled:
        !store.filterKecamatan ||
        store.filterKecamatan === "Semua" ||
        desaOptions.length === 0,
    },
    {
      key: "filterDusun",
      label: "Dusun / Lingkungan",
      options: dusunOptions,
      placeholder: "Pilih Dusun...",
      emptyText: "Dusun tidak ditemukan.",
      disabled:
        !store.filterDesa ||
        store.filterDesa === "Semua" ||
        dusunOptions.length <= 1,
    },
    {
      key: "filterSls",
      label: "RT / RW (Unit SLS)",
      options: slsOptions,
      placeholder: "Pilih RT / RW...",
      emptyText: "RT / RW tidak ditemukan.",
      disabled:
        !store.filterDesa ||
        store.filterDesa === "Semua" ||
        slsOptions.length <= 1,
    },
  ];

  // Ubah satu level, lalu reset semua level di bawahnya ke "Semua"
  const handleLevelChange = (index: number, val: string): void => {
    store.setFilter(levels[index].key, val);
    levels.slice(index + 1).forEach((l) => store.setFilter(l.key, "Semua"));
  };

  const resetAllFilters = (): void => {
    levels.forEach((l) => store.setFilter(l.key, "Semua"));
  };

  // Label level aktif untuk badge di tombol filter
  const activeLevelLabel =
    store.filterSls !== "Semua"
      ? "RT/RW"
      : store.filterDusun !== "Semua"
        ? "Dusun"
        : store.filterDesa !== "Semua"
          ? "Desa"
          : "Kecamatan";

  const pctOf = (n: number): number =>
    stats.totalEntitas > 0 ? Math.round((n / stats.totalEntitas) * 100) : 0;

  // Data KPI (satu array → satu grid)
  const kpis: KpiItem[] = [
    {
      label: "Total Bangunan",
      value: stats.totalBangunan,
      hint: `${stats.progressPct}% terkunjungi`,
      icon: Building2,
    },
    {
      label: "Usaha Biasa",
      value: stats.totalUsaha,
      hint: "Non-pertanian",
      icon: Store,
    },
    {
      label: "Usaha Digital",
      value: stats.totalUsahaDigital,
      hint: "E-commerce & online",
      icon: Laptop,
    },
    {
      label: "Usaha Pertanian",
      value: stats.totalUsahaPertanian,
      hint: "Agrikultur & tani",
      icon: Sprout,
    },
    {
      label: "Keluarga (KK)",
      value: stats.totalRt,
      hint: "Kepala keluarga",
      icon: Home,
    },
    {
      label: "Total Entitas",
      value: stats.totalEntitas,
      hint: "Spasial terdata",
      icon: Layers,
      highlight: true,
    },
  ];

  // Baris tabel rekap indikator
  const rekapRows: RekapRow[] = [
    {
      label: "Bangunan dikunjungi",
      value: stats.sudahKunjung,
      pct: stats.progressPct,
      dotClass: "bg-primary",
    },
    {
      label: "Bangunan belum dikunjungi",
      value: stats.belumKunjung,
      pct: 100 - stats.progressPct,
      dotClass: "bg-muted-foreground/40",
    },
    {
      label: "Total bangunan fisik",
      value: stats.totalBangunan,
      pct: 100,
      dotClass: "bg-foreground",
      strong: true,
    },
    {
      label: "Titik usaha biasa (non-tani)",
      value: stats.totalUsaha,
      pct: pctOf(stats.totalUsaha),
      dotClass: "bg-primary/80",
    },
    {
      label: "Titik usaha digital (online)",
      value: stats.totalUsahaDigital,
      pct: pctOf(stats.totalUsahaDigital),
      dotClass: "bg-primary/55",
    },
    {
      label: "Titik usaha pertanian",
      value: stats.totalUsahaPertanian,
      pct: pctOf(stats.totalUsahaPertanian),
      dotClass: "bg-primary/35",
    },
    {
      label: "Keluarga (KK)",
      value: stats.totalRt,
      pct: pctOf(stats.totalRt),
      dotClass: "bg-primary/20",
    },
    {
      label: "Total entitas terdata",
      value: stats.totalEntitas,
      pct: 100,
      dotClass: "bg-primary",
      strong: true,
    },
  ];

  // Style tab: underline ala Supabase (tanpa pill background)
  const tabTrigger =
    "rounded-none border-b-2 border-transparent bg-transparent px-3 py-2 text-xs font-medium text-muted-foreground shadow-none transition-colors hover:text-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none";

  return (
    <>
      {/* ── 1. MINI SUMMARY BAR (kiri-bawah saat panel terlipat) ── */}
      <div
        className={`absolute bottom-3 left-3 right-16 sm:bottom-4 sm:right-auto sm:left-6 sm:max-w-lg md:max-w-xl bg-background/95 backdrop-blur-md border rounded-lg p-2.5 sm:p-3 shadow-lg z-30 transition-all duration-300 ease-in-out transform ${
          !store.isStatisticsOpen
            ? "translate-y-0 opacity-100 pointer-events-auto"
            : "translate-y-6 opacity-0 pointer-events-none"
        } flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3`}
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* Ikon dalam kotak hairline */}
          <div className="h-8 w-8 rounded-md border bg-primary/5 flex items-center justify-center text-primary shrink-0">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold truncate max-w-[150px] xs:max-w-[220px] sm:max-w-[260px] md:max-w-[340px]">
                {regionLabel}
              </span>
              <span
                className={`${NUM} shrink-0 rounded-md bg-primary/10 text-primary px-1.5 py-0.5 text-[10px] font-semibold`}
              >
                {stats.progressPct}% terdata
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground mt-0.5">
              <span>
                Bangunan{" "}
                <strong className={`${NUM} text-foreground font-medium`}>
                  {fmt(stats.totalBangunan)}
                </strong>
              </span>
              <span>
                Usaha{" "}
                <strong className={`${NUM} text-foreground font-medium`}>
                  {fmt(stats.totalUsaha)}
                </strong>
              </span>
              <span>
                Keluarga{" "}
                <strong className={`${NUM} text-foreground font-medium`}>
                  {fmt(stats.totalRt)}
                </strong>
              </span>
            </div>
          </div>
        </div>

        <Button
          size="sm"
          onClick={() => store.setStatisticsOpen(true)}
          className="w-full sm:w-auto h-8 text-xs gap-1.5 shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground justify-center"
        >
          <ChevronUp className="w-4 h-4" /> Buka statistik
        </Button>
      </div>

      {/* ── 2. PANEL UTAMA (bottom sheet / fullscreen) ── */}
      <div
        className={`absolute bottom-0 left-0 right-0 w-full bg-background border-t shadow-2xl transition-all duration-300 ease-in-out transform ${
          isExpanded
            ? "h-full max-h-full rounded-none z-50"
            : "h-[75vh] sm:h-[60vh] md:h-[58vh] max-h-[75vh] sm:max-h-[60vh] md:max-h-[58vh] rounded-t-xl z-30"
        } ${
          store.isStatisticsOpen
            ? "translate-y-0 opacity-100 pointer-events-auto"
            : "translate-y-full opacity-0 pointer-events-none"
        } flex flex-col overflow-hidden`}
      >
        {/* ── Toolbar atas: judul kiri, aksi kanan ── */}
        <div className="px-3.5 py-3 sm:px-6 border-b bg-background shrink-0 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold tracking-tight">
                Statistik & Insight Spasial
              </h3>
              {/* Badge role: netral dengan dot biru */}
              <span className="inline-flex items-center gap-1.5 rounded-md border bg-muted/40 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                {roleName}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              Agregasi data spasial:{" "}
              <span className="font-medium text-foreground">{regionLabel}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            {/* Filter wilayah 4 level */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-2 px-3 text-xs font-medium"
                >
                  <Filter className="w-3.5 h-3.5 text-primary" />
                  Filter wilayah
                  {store.filterKecamatan !== "Semua" &&
                    store.filterKecamatan && (
                      <span className="rounded bg-primary/10 text-primary px-1.5 text-[10px] font-semibold leading-4">
                        {activeLevelLabel}
                      </span>
                    )}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-80 sm:w-96 p-0 shadow-xl border bg-background rounded-lg z-50"
                align="end"
              >
                {/* Header popover */}
                <div className="flex items-center justify-between px-4 py-3 border-b">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-primary" />
                    <div>
                      <h4 className="text-xs font-semibold leading-none">
                        Filter wilayah
                      </h4>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Kecamatan → Desa → Dusun → RT/RW
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                    onClick={resetAllFilters}
                  >
                    <Eraser className="w-3 h-3 mr-1" />
                    Reset
                  </Button>
                </div>

                {/* Empat combobox, dirender dari array levels */}
                <div className="p-4 space-y-3">
                  {levels.map((level, i) => {
                    const current = store[level.key];
                    const selected = !!current && current !== "Semua";
                    return (
                      <div key={level.key} className="space-y-1.5">
                        <label className="text-[11px] font-medium text-muted-foreground flex items-center justify-between">
                          <span>
                            {i + 1}. {level.label}
                          </span>
                          {selected && (
                            <span className="text-[10px] text-primary font-medium">
                              Terpilih
                            </span>
                          )}
                        </label>
                        <SearchableCombobox
                          options={level.options}
                          value={current || undefined}
                          placeholder={level.placeholder}
                          emptyText={level.emptyText}
                          disabled={level.disabled}
                          onValueChange={(val) => handleLevelChange(i, val)}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Footer: wilayah aktif */}
                <div className="px-4 py-2.5 border-t bg-muted/30 text-[11px] text-muted-foreground truncate rounded-b-lg">
                  <span className="font-medium text-foreground">Aktif:</span>{" "}
                  {regionLabel}
                </div>
              </PopoverContent>
            </Popover>

            {/* Ekspor (hanya yang punya izin) */}
            {canExport && (
              <div className="flex items-center gap-1.5 ml-auto sm:ml-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleExportCSV}
                  className="h-8 text-xs gap-1.5 px-2.5"
                  title="Export data ke CSV"
                >
                  <Download className="w-3.5 h-3.5" /> CSV
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleExportExcel}
                  className="h-8 text-xs gap-1.5 px-2.5"
                  title="Export data ke Excel"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-primary" />{" "}
                  Excel
                </Button>
                {isAdmin && (
                  <Button
                    size="sm"
                    onClick={handleExportGeoJSON}
                    className="h-8 text-xs gap-1.5 px-2.5 bg-primary hover:bg-primary/90 text-primary-foreground"
                    title="Export data spasial ter-filter ke GeoJSON (khusus Admin)"
                  >
                    <Globe className="w-3.5 h-3.5" /> GeoJSON
                  </Button>
                )}
              </div>
            )}

            {/* Pilihan basemap (hanya saat fullscreen) */}
            {isExpanded && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs gap-1.5 px-2.5 shrink-0"
                    title="Pilihan peta dasar (basemap)"
                  >
                    <Layers className="w-3.5 h-3.5 text-primary" />
                    <span className="hidden sm:inline">
                      {AVAILABLE_BASEMAPS.find(
                        (b) => b.id === store.selectedBasemap,
                      )?.name || "Basemap"}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-60 bg-background border shadow-xl p-1 rounded-lg z-50"
                >
                  <DropdownMenuLabel className="text-[11px] font-medium text-muted-foreground px-2 py-1">
                    Peta dasar (basemap)
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {AVAILABLE_BASEMAPS.map((bm) => {
                    const isSelected = store.selectedBasemap === bm.id;
                    return (
                      <DropdownMenuItem
                        key={bm.id}
                        onClick={() => store.setBasemap(bm.id)}
                        className={`flex flex-col items-start gap-0.5 cursor-pointer px-2.5 py-2 rounded-md transition-colors ${
                          isSelected
                            ? "bg-primary/10 text-primary"
                            : "hover:bg-muted/60"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-xs font-medium">{bm.name}</span>
                          {isSelected && (
                            <span className="text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded font-semibold">
                              Aktif
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground leading-tight">
                          {bm.description}
                        </span>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Dokumentasi */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate("/documentation")}
              className="h-8 text-xs gap-1.5 px-2.5 shrink-0"
              title="Buka halaman panduan & dokumentasi"
            >
              <BookOpen className="w-3.5 h-3.5 text-primary" />
              <span className="hidden sm:inline">Dokumentasi</span>
            </Button>

            {/* Fullscreen toggle */}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsExpanded((prev) => !prev)}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground shrink-0"
              title={
                isExpanded
                  ? "Kecilkan tampilan (restore)"
                  : "Perluas layar penuh (fullscreen)"
              }
            >
              {isExpanded ? (
                <Minimize2 className="w-4 h-4 text-primary" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </Button>

            {/* Tutup panel */}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setIsExpanded(false);
                store.setStatisticsOpen(false);
              }}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground shrink-0"
              title="Sembunyikan panel"
            >
              <ChevronDown className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* ── 3. BODY (scrollable) ── */}
        <div className="flex-1 overflow-y-auto bg-muted/20 p-3.5 sm:p-5 md:p-6 space-y-4 sm:space-y-5">
          {/* KPI: satu kotak berhairline, sel dipisah garis (trik gap-px) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px bg-border border rounded-lg overflow-hidden">
            {kpis.map((kpi) => (
              <div
                key={kpi.label}
                className={`p-3 sm:p-4 ${kpi.highlight ? "bg-primary/5" : "bg-background"}`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[11px] font-medium truncate ${
                      kpi.highlight ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {kpi.label}
                  </span>
                  <kpi.icon className="w-3.5 h-3.5 text-primary shrink-0" />
                </div>
                <div
                  className={`${NUM} mt-2 text-xl sm:text-2xl font-semibold tracking-tight ${
                    kpi.highlight ? "text-primary" : "text-foreground"
                  }`}
                >
                  {fmt(kpi.value)}
                </div>
                <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5">
                  {kpi.hint}
                </p>
              </div>
            ))}
          </div>

          {/* Insight: tiga sel horizontal dalam satu kotak */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-border border rounded-lg overflow-hidden">
            {[
              {
                icon: Laptop2,
                title: "Adopsi usaha digital",
                value: `${stats.rasioDigital}%`,
                note: `${stats.totalUsahaDigital} dari ${stats.totalEntitasUsaha} usaha`,
              },
              {
                icon: TrendingUp,
                title: "Kepadatan spasial entitas",
                value: String(stats.rasioKepadatan),
                note: "entitas / unit bangunan",
              },
              {
                icon: MapPin,
                title: "Cakupan SLS spasial",
                value: `${stats.slsCount} SLS`,
                note: "di wilayah ini",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="bg-background p-3.5 flex items-center gap-3"
              >
                <div className="h-9 w-9 rounded-md border bg-primary/5 text-primary flex items-center justify-center shrink-0">
                  <item.icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-medium text-muted-foreground truncate">
                    {item.title}
                  </div>
                  <div className="flex items-baseline gap-2 mt-0.5 flex-wrap">
                    <span
                      className={`${NUM} text-base font-semibold text-foreground`}
                    >
                      {item.value}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {item.note}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Tab: underline style */}
          <Tabs defaultValue="visual" className="w-full">
            <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-none border-b bg-transparent p-0 mb-4">
              <TabsTrigger value="visual" className={tabTrigger}>
                Visual chart & insight
              </TabsTrigger>
              <TabsTrigger value="komparasi" className={tabTrigger}>
                Komparasi kecamatan
              </TabsTrigger>
              <TabsTrigger value="sls" className={tabTrigger}>
                Tabel data SLS
              </TabsTrigger>
              <TabsTrigger value="cluster" className={tabTrigger}>
                Titik bergerombol
              </TabsTrigger>
              <TabsTrigger value="table" className={tabTrigger}>
                Rekap indikator
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

            {/* Tab chart */}
            <TabsContent value="visual">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {/* Donut status kunjungan */}
                <div className="rounded-lg border bg-background overflow-hidden">
                  <CardHead
                    icon={CheckCircle2}
                    title="Status kunjungan bangunan"
                    right={<Chip>{stats.progressPct}% selesai</Chip>}
                  />
                  <div className="h-56 sm:h-60 w-full p-3">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={52}
                          outerRadius={76}
                          paddingAngle={3}
                          dataKey="value"
                          stroke="none"
                        >
                          {pieData.map((_entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              className={PIE_CLASSES[index % PIE_CLASSES.length]}
                            />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                        <Legend
                          iconType="circle"
                          iconSize={8}
                          wrapperStyle={{ fontSize: "11px" }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Bar sebaran entitas */}
                <div className="rounded-lg border bg-background overflow-hidden">
                  <CardHead
                    icon={BarChart3}
                    title="Sebaran entitas spasial terdata"
                    right={<Chip>{fmt(stats.totalEntitas)} entitas</Chip>}
                  />
                  <div className="h-56 sm:h-60 w-full p-3">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={barData}>
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 11 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 11 }}
                          axisLine={false}
                          tickLine={false}
                          width={36}
                        />
                        <RechartsTooltip cursor={{ fillOpacity: 0.06 }} />
                        <Bar dataKey="jumlah" radius={[4, 4, 0, 0]}>
                          {barData.map((_entry, index) => (
                            <Cell
                              key={`bar-${index}`}
                              className={BAR_CLASSES[index % BAR_CLASSES.length]}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Tab rekap indikator */}
            <TabsContent value="table">
              <div className="rounded-lg border bg-background overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="border-b bg-muted/40 text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2.5 font-medium">
                        Kategori indikator spasial
                      </th>
                      <th className="px-4 py-2.5 font-medium text-right">
                        Jumlah terdata
                      </th>
                      <th className="px-4 py-2.5 font-medium text-right">
                        Proporsi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {rekapRows.map((row) => (
                      <tr
                        key={row.label}
                        className={
                          row.strong
                            ? "bg-muted/30"
                            : "hover:bg-muted/20 transition-colors"
                        }
                      >
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`h-2 w-2 rounded-full shrink-0 ${row.dotClass}`}
                            />
                            <span
                              className={
                                row.strong ? "font-semibold" : "font-medium"
                              }
                            >
                              {row.label}
                            </span>
                          </div>
                        </td>
                        <td
                          className={`${NUM} px-4 py-2.5 text-right ${
                            row.strong ? "font-semibold" : ""
                          }`}
                        >
                          {fmt(row.value)}
                        </td>
                        <td className="px-4 py-2.5">
                          {/* Mini progress bar + persen */}
                          <div className="flex items-center justify-end gap-2.5">
                            <div className="hidden sm:block h-1.5 w-20 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full bg-primary"
                                style={{ width: `${row.pct}%` }}
                              />
                            </div>
                            <span
                              className={`${NUM} w-10 text-right ${
                                row.strong
                                  ? "font-semibold"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {row.pct}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          </Tabs>

          {/* ── 4. Tabel rincian entitas ── */}
          <EntityDetailTable spatialData={spatialData} />
        </div>
      </div>
    </>
  );
}