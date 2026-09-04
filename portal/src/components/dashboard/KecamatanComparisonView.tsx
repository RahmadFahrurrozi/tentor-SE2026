import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
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
} from "lucide-react";
import { useKecamatanComparison } from "@/hooks/use-kecamatan-comparison";

interface KecamatanComparisonViewProps {
  spatialData: any;
}

export function KecamatanComparisonView({
  spatialData,
}: KecamatanComparisonViewProps) {
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
  return (
    <Card className="border-border bg-card/80 backdrop-blur-md shadow-xs space-y-4 p-4 sm:p-5 mt-4">
      <CardHeader className="p-0 pb-2 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-amber-500" />
            Komparasi Spasial Entitas Antar-Kecamatan
          </CardTitle>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Perbandingan Usaha Pertanian, Usaha Biasa, Rumah Tangga, & Usaha
            Digital se-Kabupaten Banyuwangi
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Admin-only Export Buttons vs Read-Only Badge */}
          {isAdmin ? (
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="outline"
                onClick={handleExportCSV}
                className="h-7 text-xs gap-1 px-2"
                title="Export data komparasi kecamatan ke CSV"
              >
                <Download className="w-3.5 h-3.5" /> CSV
              </Button>
              <Button
                size="sm"
                onClick={handleExportExcel}
                className="h-7 text-xs gap-1 px-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                title="Export data komparasi kecamatan ke Excel"
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
            {processedData.length} Kecamatan Terdaftar
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-0 space-y-5">
        {/* Visual Comparison Chart Header & 25 Kecamatan Toggle */}
        <div className="bg-muted/30 p-3 sm:p-4 rounded-xl border space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-primary" /> Visualisasi Grafik
              Komparasi Spasial (
              {showAll25 ? "Seluruh 25 Kecamatan" : "Top 12 Kecamatan"})
            </h4>

            {/* Toggle View 25 Kecamatan Button */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowAll25((prev) => !prev)}
              className="h-7 text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/10 self-start sm:self-auto"
            >
              {showAll25 ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5" /> Tampilkan Top 12
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5" /> Tampilkan 25 Kecamatan
                  Full
                </>
              )}
            </Button>
          </div>

          {/* Dynamic Recharts Height & Layout (Horizontal Layout for 25 Kecamatan) */}
          <div
            className={`${showAll25 ? "h-[720px]" : "h-64 sm:h-72"} w-full transition-all duration-300`}
          >
            <ResponsiveContainer width="100%" height="100%">
              {showAll25 ? (
                // Horizontal Layout BarChart for All 25 Kecamatans
                <BarChart
                  layout="vertical"
                  data={chartData}
                  margin={{ top: 10, right: 20, left: 70, bottom: 10 }}
                >
                  <XAxis type="number" tick={{ fontSize: 9 }} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tick={{ fontSize: 9 }}
                    width={90}
                  />
                  <RechartsTooltip />
                  <Legend
                    wrapperStyle={{ fontSize: "11px", paddingTop: "5px" }}
                  />
                  <Bar
                    dataKey="Usaha Pertanian"
                    fill="#10B981"
                    radius={[0, 4, 4, 0]}
                  />
                  <Bar
                    dataKey="Usaha Biasa"
                    fill="#F59E0B"
                    radius={[0, 4, 4, 0]}
                  />
                  <Bar
                    dataKey="KK"
                    fill="#3B82F6"
                    radius={[0, 4, 4, 0]}
                  />
                  <Bar
                    dataKey="Usaha Digital"
                    fill="#EC4899"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              ) : (
                // Standard Vertical Layout BarChart
                <BarChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: -10, bottom: 20 }}
                >
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 9 }}
                    angle={-25}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis tick={{ fontSize: 9 }} />
                  <RechartsTooltip />
                  <Legend
                    wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }}
                  />
                  <Bar
                    dataKey="Usaha Pertanian"
                    fill="#10B981"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="Usaha Biasa"
                    fill="#F59E0B"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="KK"
                    fill="#3B82F6"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="Usaha Digital"
                    fill="#EC4899"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Controls: Search & Quick Sorting Filter Pills */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Cari nama kecamatan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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

          {/* Quick Sort Pills per Entity */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-[11px] text-muted-foreground shrink-0 mr-1 font-semibold">
              Filter Paling Banyak:
            </span>
            <Button
              size="sm"
              variant={sortBy === "total" ? "default" : "outline"}
              onClick={() => toggleSort("total")}
              className="h-7 text-xs px-2.5 gap-1"
            >
              Total {sortBy === "total" && <ArrowUpDown className="w-3 h-3" />}
            </Button>
            <Button
              size="sm"
              variant={sortBy === "pertanian" ? "default" : "outline"}
              onClick={() => toggleSort("pertanian")}
              className="h-7 text-xs px-2.5 gap-1 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
            >
              <Sprout className="w-3 h-3" /> Pertanian
            </Button>
            <Button
              size="sm"
              variant={sortBy === "usaha" ? "default" : "outline"}
              onClick={() => toggleSort("usaha")}
              className="h-7 text-xs px-2.5 gap-1 border-amber-500/30 text-amber-600 dark:text-amber-400"
            >
              <Store className="w-3 h-3" /> Usaha Biasa
            </Button>
            <Button
              size="sm"
              variant={sortBy === "digital" ? "default" : "outline"}
              onClick={() => toggleSort("digital")}
              className="h-7 text-xs px-2.5 gap-1 border-pink-500/30 text-pink-600 dark:text-pink-400"
            >
              <Laptop className="w-3 h-3" /> Digital
            </Button>
            <Button
              size="sm"
              variant={sortBy === "rt" ? "default" : "outline"}
              onClick={() => toggleSort("rt")}
              className="h-7 text-xs px-2.5 gap-1 border-blue-500/30 text-blue-600 dark:text-blue-400"
            >
              <Home className="w-3 h-3" /> KK
            </Button>

            {/* Asc/Desc Indicator */}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => toggleSort(sortBy)}
              className="h-7 text-xs px-2 font-mono text-muted-foreground"
              title="Ganti Urutan (Terbesar/Terkecil)"
            >
              {sortOrder === "desc" ? "DESC ↓" : "ASC ↑"}
            </Button>
          </div>
        </div>

        {/* Detailed Kecamatan Comparison Table with Badge Styling */}
        <div className="overflow-x-auto border rounded-xl bg-background/40">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/60 text-muted-foreground font-bold border-b">
              <tr>
                <th className="p-2.5 w-10 text-center">#</th>
                <th className="p-2.5 min-w-[150px]">Nama Kecamatan</th>
                <th className="p-2.5 text-center text-emerald-500">
                  Usaha Pertanian
                </th>
                <th className="p-2.5 text-center text-amber-500">
                  Usaha Biasa
                </th>
                <th className="p-2.5 text-center text-pink-500">
                  Usaha Digital
                </th>
                <th className="p-2.5 text-center text-blue-500">
                  KK
                </th>
                <th className="p-2.5 text-center text-primary font-bold">
                  Total Entitas
                </th>
                <th className="p-2.5 text-center">Adopsi Digital</th>
              </tr>
            </thead>
            <tbody className="divide-y text-foreground">
              {processedData.length > 0 ? (
                processedData.map((k, idx) => (
                  <tr
                    key={k.idkec}
                    className="hover:bg-muted/40 transition-colors"
                  >
                    <td className="p-2.5 text-center text-muted-foreground font-mono text-[11px]">
                      {idx + 1}
                    </td>
                    <td className="p-2.5 font-semibold text-foreground">
                      {k.nmkec}
                    </td>

                    {/* BADGE PERTANIAAN */}
                    <td className="p-2.5 text-center">
                      <Badge
                        variant="outline"
                        className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-semibold px-2.5 py-0.5"
                      >
                        {k.usahaPertanian.toLocaleString()}
                      </Badge>
                    </td>

                    {/* BADGE USAHA BIASA */}
                    <td className="p-2.5 text-center">
                      <Badge
                        variant="outline"
                        className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 font-semibold px-2.5 py-0.5"
                      >
                        {k.usahaBiasa.toLocaleString()}
                      </Badge>
                    </td>

                    {/* BADGE USAHA DIGITAL */}
                    <td className="p-2.5 text-center">
                      <Badge
                        variant="outline"
                        className="bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/30 font-semibold px-2.5 py-0.5"
                      >
                        {k.usahaDigital.toLocaleString()}
                      </Badge>
                    </td>

                    {/* BADGE RUMAH TANGGA */}
                    <td className="p-2.5 text-center">
                      <Badge
                        variant="outline"
                        className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 font-semibold px-2.5 py-0.5"
                      >
                        {k.rumahTangga.toLocaleString()}
                      </Badge>
                    </td>

                    {/* BADGE TOTAL ENTITAS */}
                    <td className="p-2.5 text-center">
                      <Badge
                        variant="outline"
                        className="bg-primary/10 text-primary border-primary/30 font-bold px-2.5 py-0.5"
                      >
                        {k.totalEntitas.toLocaleString()}
                      </Badge>
                    </td>

                    <td className="p-2.5 text-center">
                      <Badge
                        variant="outline"
                        className="text-[10px] font-semibold bg-pink-500/10 text-pink-500 border-pink-500/30"
                      >
                        {k.rasioDigitalPct}% Digital
                      </Badge>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={8}
                    className="p-8 text-center text-muted-foreground"
                  >
                    Tidak ada kecamatan ditemukan untuk pencarian "{searchQuery}
                    ".
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
