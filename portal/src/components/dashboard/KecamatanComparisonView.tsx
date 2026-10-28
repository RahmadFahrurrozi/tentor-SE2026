import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import {
  BarChart3,
  Search,
  Sprout,
  Store,
  Home,
  Laptop,
  ArrowUpDown,
  X,
  Layers,
  Download,
  FileSpreadsheet,
  ShieldCheck,
  Maximize2,
  Minimize2,
  type LucideIcon,
} from "lucide-react";
import { useKecamatanComparison } from "@/hooks/use-kecamatan-comparison";
import { useMapStore } from "@/store/mapStore";
import { REGIONS } from "@/config/regionConfig";

/* ────────────────────────────── Types ────────────────────────────── */

interface KecamatanComparisonViewProps {
  /** Tipe diambil dari hook, jadi tanpa `any` */
  spatialData: Parameters<typeof useKecamatanComparison>[0];
}

// Satu seri di chart: kunci data, label, class warna bar, dan class dot legend
interface Series {
  dataKey: string;
  label: string;
  barClass: string;
  dotClass: string;
}

// Satu pill pengurutan
interface SortOption {
  key: "total" | "pertanian" | "usaha" | "digital" | "rt";
  label: string;
  icon?: LucideIcon;
}

/* ────────────────────────────── Constants ────────────────────────────── */

// Empat seri = empat tingkat biru (gelap ke terang) dari token primary, tanpa hijau/pink/amber.
// Class ditulis lengkap supaya Tailwind bisa mendeteksinya.
const SERIES: Series[] = [
  {
    dataKey: "Usaha Pertanian",
    label: "Pertanian",
    barClass: "fill-primary",
    dotClass: "bg-primary",
  },
  {
    dataKey: "Usaha Biasa",
    label: "Usaha biasa",
    barClass: "fill-primary/70",
    dotClass: "bg-primary/70",
  },
  {
    dataKey: "KK",
    label: "KK",
    barClass: "fill-primary/45",
    dotClass: "bg-primary/45",
  },
  {
    dataKey: "Usaha Digital",
    label: "Digital",
    barClass: "fill-primary/25",
    dotClass: "bg-primary/25",
  },
];

const SORT_OPTIONS: SortOption[] = [
  { key: "total", label: "Total", icon: Layers },
  { key: "pertanian", label: "Pertanian", icon: Sprout },
  { key: "usaha", label: "Usaha biasa", icon: Store },
  { key: "digital", label: "Digital", icon: Laptop },
  { key: "rt", label: "KK", icon: Home },
];

const NUM = "font-mono tabular-nums";

const fmt = (n: number): string => n.toLocaleString();

/* ────────────────────────────── Component ────────────────────────────── */

export function KecamatanComparisonView({
  spatialData,
}: KecamatanComparisonViewProps) {
  const selectedKabupaten = useMapStore((s) => s.selectedKabupaten);
  const regName = REGIONS[selectedKabupaten]?.name || "Wilayah";

  const {
    isAdmin,
    searchQuery,
    setSearchQuery,
    sortBy,
    sortOrder,
    showAll25,
    setShowAll25,
    processedData,
    chartData,
    toggleSort,
    handleExportCSV,
    handleExportExcel,
  } = useKecamatanComparison(spatialData);

  // Bar tiap seri dirender dari array SERIES; warna per-batang lewat <Cell className>
  const renderBars = (radius: [number, number, number, number]) =>
    SERIES.map((s) => (
      <Bar key={s.dataKey} dataKey={s.dataKey} radius={radius}>
        {chartData.map((_row, i) => (
          <Cell key={`${s.dataKey}-${i}`} className={s.barClass} />
        ))}
      </Bar>
    ));

  return (
    <div className="mt-4 rounded-lg border bg-background overflow-hidden">
      {/* ── Header: judul kiri, ekspor / badge kanan ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-b">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-8 w-8 rounded-md border bg-primary/5 text-primary flex items-center justify-center shrink-0">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-semibold tracking-tight">
              Komparasi spasial entitas antar-kecamatan
            </h4>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Perbandingan usaha pertanian, usaha biasa, rumah tangga, dan usaha
              digital se-{regName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin ? (
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="outline"
                onClick={handleExportCSV}
                className="h-7 text-xs gap-1.5 px-2.5"
                title="Export data komparasi kecamatan ke CSV"
              >
                <Download className="w-3.5 h-3.5" /> CSV
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleExportExcel}
                className="h-7 text-xs gap-1.5 px-2.5"
                title="Export data komparasi kecamatan ke Excel"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-primary" /> Excel
              </Button>
            </div>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-md border bg-muted/40 px-2 py-1 text-[11px] font-medium text-muted-foreground">
              <ShieldCheck className="w-3 h-3 text-primary" /> Read only
              (PML/PPL)
            </span>
          )}

          <span
            className={`${NUM} rounded-md border bg-muted/40 px-2 py-1 text-[11px] font-medium text-muted-foreground whitespace-nowrap`}
          >
            {processedData.length} kecamatan
          </span>
        </div>
      </div>

      {/* ── Chart ── */}
      <div className="border-b">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <h5 className="text-xs font-semibold flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-primary" />
              Visualisasi komparasi spasial
              <span className="rounded border bg-muted/40 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                {showAll25 ? "Seluruh 25 kecamatan" : "Top 12 kecamatan"}
              </span>
            </h5>

            {/* Legend custom (bukan Legend recharts) supaya warnanya pasti sama dengan bar */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
              {SERIES.map((s) => (
                <span
                  key={s.dataKey}
                  className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground"
                >
                  <span className={`h-2 w-2 rounded-sm ${s.dotClass}`} />
                  {s.label}
                </span>
              ))}
            </div>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowAll25((prev) => !prev)}
            className="h-7 text-xs gap-1.5 px-2.5 self-start sm:self-auto"
          >
            {showAll25 ? (
              <>
                <Minimize2 className="w-3.5 h-3.5 text-primary" /> Top 12
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-primary" /> Tampilkan 25
                kecamatan
              </>
            )}
          </Button>
        </div>

        {/* Tinggi chart menyesuaikan mode */}
        <div
          className={`${showAll25 ? "h-[720px]" : "h-64 sm:h-72"} w-full px-3 pb-3 transition-all duration-300`}
        >
          <ResponsiveContainer width="100%" height="100%">
            {showAll25 ? (
              // Layout horizontal untuk 25 kecamatan
              <BarChart
                layout="vertical"
                data={chartData}
                margin={{ top: 4, right: 20, left: 60, bottom: 4 }}
              >
                <XAxis
                  type="number"
                  tick={{ fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fontSize: 10 }}
                  width={90}
                  axisLine={false}
                  tickLine={false}
                />
                <RechartsTooltip cursor={{ fillOpacity: 0.06 }} />
                {renderBars([0, 3, 3, 0])}
              </BarChart>
            ) : (
              // Layout vertikal standar
              <BarChart
                data={chartData}
                margin={{ top: 4, right: 10, left: -10, bottom: 20 }}
              >
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10 }}
                  angle={-25}
                  textAnchor="end"
                  interval={0}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <RechartsTooltip cursor={{ fillOpacity: 0.06 }} />
                {renderBars([3, 3, 0, 0])}
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Toolbar: search kiri, sort kanan ── */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 px-4 py-3 border-b bg-muted/20">
        <div className="relative w-full lg:w-72 shrink-0">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Cari nama kecamatan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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

        {/* Pill pengurutan: aktif = primary muda, bukan solid */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
          <span className="text-[11px] text-muted-foreground shrink-0 mr-1">
            Urutkan:
          </span>
          {SORT_OPTIONS.map((opt) => {
            const isActive = sortBy === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => toggleSort(opt.key)}
                aria-pressed={isActive}
                className={`shrink-0 inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                  isActive
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                }`}
              >
                {opt.icon && <opt.icon className="w-3 h-3" />}
                {opt.label}
                {isActive && opt.key === "total" && (
                  <ArrowUpDown className="w-3 h-3" />
                )}
              </button>
            );
          })}

          {/* Penunjuk arah urutan */}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => toggleSort(sortBy)}
            className={`${NUM} h-7 text-xs px-2 text-muted-foreground hover:text-foreground shrink-0`}
            title="Ganti urutan (terbesar / terkecil)"
          >
            {sortOrder === "desc" ? "DESC ↓" : "ASC ↑"}
          </Button>
        </div>
      </div>

      {/* ── Tabel ── */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="border-b bg-muted/40 text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 w-10 text-center font-medium">#</th>
              <th className="px-4 py-2.5 min-w-[150px] font-medium">
                Nama kecamatan
              </th>
              {/* Header kolom angka diberi dot sesuai warna seri chart */}
              {SERIES.map((s) => (
                <th
                  key={s.dataKey}
                  className="px-4 py-2.5 text-right font-medium whitespace-nowrap"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-sm ${s.dotClass}`} />
                    {s.dataKey}
                  </span>
                </th>
              ))}
              <th className="px-4 py-2.5 text-right font-medium text-foreground whitespace-nowrap">
                Total entitas
              </th>
              <th className="px-4 py-2.5 min-w-[150px] font-medium">
                Adopsi digital
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {processedData.length > 0 ? (
              processedData.map((k, idx) => {
                // Lebar mini bar dibatasi 0–100
                const adopsi = Math.min(100, Math.max(0, Number(k.rasioDigitalPct)));
                return (
                  <tr
                    key={k.idkec}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td
                      className={`${NUM} px-4 py-2.5 text-center text-[11px] text-muted-foreground`}
                    >
                      {idx + 1}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-foreground">
                      {k.nmkec}
                    </td>
                    <td className={`${NUM} px-4 py-2.5 text-right`}>
                      {fmt(k.usahaPertanian)}
                    </td>
                    <td className={`${NUM} px-4 py-2.5 text-right`}>
                      {fmt(k.usahaBiasa)}
                    </td>
                    <td className={`${NUM} px-4 py-2.5 text-right`}>
                      {fmt(k.rumahTangga)}
                    </td>
                    <td className={`${NUM} px-4 py-2.5 text-right`}>
                      {fmt(k.usahaDigital)}
                    </td>
                    <td
                      className={`${NUM} px-4 py-2.5 text-right font-semibold text-primary`}
                    >
                      {fmt(k.totalEntitas)}
                    </td>
                    <td className="px-4 py-2.5">
                      {/* Mini progress bar + persen */}
                      <div className="flex items-center gap-2.5">
                        <div className="h-1.5 w-20 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${adopsi}%` }}
                          />
                        </div>
                        <span
                          className={`${NUM} text-[11px] text-muted-foreground`}
                        >
                          {k.rasioDigitalPct}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
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
                    Tidak ada kecamatan yang cocok dengan "{searchQuery}".
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}