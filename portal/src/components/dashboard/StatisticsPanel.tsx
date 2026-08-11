import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/auth-store";
import { useMapStore } from "@/store/mapStore";
import { EntityDetailTable } from "./EntityDetailTable";
import { SlsDetailTable } from "./SlsDetailTable";
import { KecamatanComparisonView } from "./KecamatanComparisonView";
import * as XLSX from "xlsx";

interface StatisticsPanelProps {
  spatialData: any;
}

export function StatisticsPanel({ spatialData }: StatisticsPanelProps) {
  const navigate = useNavigate();
  const { profile } = useAuthStore();
  const store = useMapStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const role = profile?.role ?? "ppl";
  const isAdmin = role === "admin";
  const canExport = isAdmin;
  const roleName = role.toUpperCase();

  const {
    dataBangunan,
    dataUsaha,
    dataUsahaDigital,
    dataUsahaPertanian,
    dataRumahTangga,
    dataSls,
    wilayahManifest,
    assignments,
  } = spatialData;

  // Compute user assignments & available options for inline selectors
  const assignedKecs = useMemo(
    () =>
      Array.from(
        new Set((assignments || []).map((a: any) => a.idkec).filter(Boolean)),
      ) as string[],
    [assignments],
  );

  const assignedDesas = useMemo(
    () =>
      Array.from(
        new Set((assignments || []).map((a: any) => a.iddesa).filter(Boolean)),
      ) as string[],
    [assignments],
  );

  const allKecamatans = useMemo(
    () => wilayahManifest?.kecamatan || [],
    [wilayahManifest],
  );

  const kecOptions = useMemo(
    () =>
      allKecamatans.filter((k: any) => {
        if (isAdmin) return true;
        return assignedKecs.includes(k.idkec);
      }),
    [allKecamatans, isAdmin, assignedKecs],
  );

  const selectedKecObj = useMemo(
    () =>
      allKecamatans.find(
        (k: any) => String(k.idkec) === String(store.filterKecamatan),
      ),
    [allKecamatans, store.filterKecamatan],
  );

  const rawDesaOptions = useMemo(
    () => selectedKecObj?.desa || [],
    [selectedKecObj],
  );

  const desaOptions = useMemo(
    () =>
      rawDesaOptions.filter((d: any) => {
        if (role !== "ppl") return true;
        return assignedDesas.includes(d.iddesa);
      }),
    [rawDesaOptions, role, assignedDesas],
  );

  // Dynamic Label untuk wilayah yang dipilih
  const regionLabel = useMemo(() => {
    const kec = store.filterKecamatan;
    const desa = store.filterDesa;
    if (kec === "Semua" || !kec) return "Seluruh Kabupaten Banyuwangi";
    const kecName =
      selectedKecObj?.nmkec || selectedKecObj?.nama || `Kec. ${kec}`;
    if (desa === "Semua" || !desa) return `${kecName} (Semua Desa)`;
    const desaObj = rawDesaOptions.find(
      (d: any) => String(d.iddesa) === String(desa),
    );
    const desaName = desaObj?.nmdesa || desaObj?.nama || `Desa ${desa}`;
    return `${desaName}, ${kecName}`;
  }, [store.filterKecamatan, store.filterDesa, selectedKecObj, rawDesaOptions]);

  // Filtering dataset berdasarkan filterDesa yang dipilih
  const filteredData = useMemo(() => {
    const desa = store.filterDesa;
    if (!desa || desa === "Semua") {
      return {
        bangunan: dataBangunan || [],
        usaha: dataUsaha || [],
        usahaDigital: dataUsahaDigital || [],
        usahaPertanian: dataUsahaPertanian || [],
        rt: dataRumahTangga || [],
        sls: dataSls?.features || [],
      };
    }

    const checkDesa = (item: any) => {
      if (!item) return false;
      const d =
        item.iddesa ||
        item.id_desa ||
        item.properties?.iddesa ||
        item.properties?.id_desa;
      if (d && String(d).trim() === String(desa).trim()) return true;
      const str = item.idsls_str || item.properties?.idsls_str;
      if (str && String(str).substring(0, 10) === String(desa).trim())
        return true;
      return false;
    };

    return {
      bangunan: (dataBangunan || []).filter(checkDesa),
      usaha: (dataUsaha || []).filter(checkDesa),
      usahaDigital: (dataUsahaDigital || []).filter(checkDesa),
      usahaPertanian: (dataUsahaPertanian || []).filter(checkDesa),
      rt: (dataRumahTangga || []).filter(checkDesa),
      sls: (dataSls?.features || []).filter((f: any) => {
        const d = f.properties?.iddesa || f.properties?.id_desa;
        if (d && String(d).trim() === String(desa).trim()) return true;
        const str = f.properties?.idsls_str || f.properties?.idsls;
        if (str && String(str).substring(0, 10) === String(desa).trim())
          return true;
        return false;
      }),
    };
  }, [
    store.filterDesa,
    dataBangunan,
    dataUsaha,
    dataUsahaDigital,
    dataUsahaPertanian,
    dataRumahTangga,
    dataSls,
  ]);

  // Kalkulasi Metrik Agregat Spasial & Insight Monitoring
  const stats = useMemo(() => {
    const totalBangunan = filteredData.bangunan.length;
    const totalUsaha = filteredData.usaha.length;
    const totalUsahaDigital = filteredData.usahaDigital.length;
    const totalUsahaPertanian = filteredData.usahaPertanian.length;
    const totalRt = filteredData.rt.length;

    let sudahKunjung = 0;
    let belumKunjung = 0;

    if (filteredData.sls && filteredData.sls.length > 0) {
      filteredData.sls.forEach((f: any) => {
        sudahKunjung += f.properties?.sudah_terdata || 0;
        belumKunjung += f.properties?.belum_terdata || 0;
      });
    }

    // Hitung riil dari data bangunan jika sudahKunjung & belumKunjung di SLS masih 0
    if (sudahKunjung === 0 && belumKunjung === 0 && totalBangunan > 0) {
      sudahKunjung = filteredData.bangunan.filter(
        (b: any) => b.status_bangunan && b.status_bangunan !== "Belum Terdata",
      ).length;
      belumKunjung = Math.max(0, totalBangunan - sudahKunjung);
    }

    const totalEntitas =
      totalUsaha + totalUsahaDigital + totalUsahaPertanian + totalRt;
    const totalEntitasUsaha =
      totalUsaha + totalUsahaDigital + totalUsahaPertanian;
    const rasioDigital =
      totalEntitasUsaha > 0
        ? Math.round((totalUsahaDigital / totalEntitasUsaha) * 100)
        : 0;
    const rasioKepadatan =
      totalBangunan > 0 ? (totalEntitas / totalBangunan).toFixed(1) : "0.0";

    return {
      totalBangunan,
      totalUsaha,
      totalUsahaDigital,
      totalUsahaPertanian,
      totalRt,
      totalEntitas,
      totalEntitasUsaha,
      sudahKunjung,
      belumKunjung,
      rasioDigital,
      rasioKepadatan,
      slsCount: filteredData.sls.length,
      progressPct:
        totalBangunan > 0
          ? Math.min(100, Math.round((sudahKunjung / totalBangunan) * 100))
          : 0,
    };
  }, [filteredData]);

  const pieData = useMemo(
    () => [
      { name: "Sudah Dikunjungi", value: stats.sudahKunjung, color: "#10B981" },
      { name: "Belum Dikunjungi", value: stats.belumKunjung, color: "#EF4444" },
    ],
    [stats],
  );

  const barData = useMemo(
    () => [
      { name: "Usaha Biasa", jumlah: stats.totalUsaha, color: "#F59E0B" },
      {
        name: "Usaha Digital",
        jumlah: stats.totalUsahaDigital,
        color: "#EC4899",
      },
      {
        name: "Usaha Pertanian",
        jumlah: stats.totalUsahaPertanian,
        color: "#10B981",
      },
      { name: "Rumah Tangga", jumlah: stats.totalRt, color: "#3B82F6" },
    ],
    [stats],
  );

  const handleExportCSV = () => {
    if (!canExport) return;

    const exportRows = [
      {
        Wilayah: regionLabel,
        "Total Bangunan": stats.totalBangunan,
        "Sudah Dikunjungi": stats.sudahKunjung,
        "Belum Dikunjungi": stats.belumKunjung,
        "Progress (%)": `${stats.progressPct}%`,
        "Usaha Biasa": stats.totalUsaha,
        "Usaha Digital": stats.totalUsahaDigital,
        "Usaha Pertanian": stats.totalUsahaPertanian,
        "Rumah Tangga": stats.totalRt,
        "Total Entitas": stats.totalEntitas,
        "Rasio Usaha Digital (%)": `${stats.rasioDigital}%`,
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const csvOutput = XLSX.utils.sheet_to_csv(worksheet);

    const blob = new Blob([csvOutput], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Statistik_SE2026_${regionLabel.replace(/[^a-zA-Z0-9]/g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportExcel = () => {
    if (!canExport) return;

    const exportRows = [
      {
        Wilayah: regionLabel,
        "Total Bangunan": stats.totalBangunan,
        "Sudah Dikunjungi": stats.sudahKunjung,
        "Belum Dikunjungi": stats.belumKunjung,
        "Progress (%)": `${stats.progressPct}%`,
        "Usaha Biasa": stats.totalUsaha,
        "Usaha Digital": stats.totalUsahaDigital,
        "Usaha Pertanian": stats.totalUsahaPertanian,
        "Rumah Tangga": stats.totalRt,
        "Total Entitas": stats.totalEntitas,
        "Rasio Usaha Digital (%)": `${stats.rasioDigital}%`,
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Statistik Spasial");
    XLSX.writeFile(
      workbook,
      `Statistik_SE2026_${regionLabel.replace(/[^a-zA-Z0-9]/g, "_")}.xlsx`,
    );
  };

  const handleExportGeoJSON = () => {
    if (!isAdmin) return;

    const features: any[] = [];

    // 1. Point Usaha Biasa
    if (dataUsaha && Array.isArray(dataUsaha)) {
      const filtered =
        store.filterDesa !== "Semua"
          ? dataUsaha.filter(
              (row: any) =>
                String(
                  row["idsls_str"] || row["idsls final"] || "",
                ).substring(0, 10) === store.filterDesa,
            )
          : dataUsaha;
      filtered.forEach((row: any) => {
        const lat = parseFloat(row["lat final"] || row.lat);
        const lng = parseFloat(row["long final"] || row["long"] || row.lon);
        if (!isNaN(lat) && !isNaN(lng)) {
          features.push({
            type: "Feature",
            geometry: { type: "Point", coordinates: [lng, lat] },
            properties: {
              tipe_entitas: "Usaha Biasa",
              nama: row["nama final"] || row["nama"] || "",
              alamat: row["alamat final"] || row["alamat"] || "",
              idsls: row["idsls_str"] || row["idsls final"] || "",
              ...row,
            },
          });
        }
      });
    }

    // 2. Point Usaha Digital
    if (dataUsahaDigital && Array.isArray(dataUsahaDigital)) {
      const filtered =
        store.filterDesa !== "Semua"
          ? dataUsahaDigital.filter(
              (row: any) =>
                String(
                  row["idsls_str"] || row["idsls final"] || "",
                ).substring(0, 10) === store.filterDesa,
            )
          : dataUsahaDigital;
      filtered.forEach((row: any) => {
        const lat = parseFloat(row["lat final"] || row.lat);
        const lng = parseFloat(row["long final"] || row["long"] || row.lon);
        if (!isNaN(lat) && !isNaN(lng)) {
          features.push({
            type: "Feature",
            geometry: { type: "Point", coordinates: [lng, lat] },
            properties: {
              tipe_entitas: "Usaha Digital",
              nama: row["nama final"] || row["nama"] || "",
              alamat: row["alamat final"] || row["alamat"] || "",
              idsls: row["idsls_str"] || row["idsls final"] || "",
              ...row,
            },
          });
        }
      });
    }

    // 3. Point Usaha Pertanian
    if (dataUsahaPertanian && Array.isArray(dataUsahaPertanian)) {
      const filtered =
        store.filterDesa !== "Semua"
          ? dataUsahaPertanian.filter(
              (row: any) =>
                String(row["iddesa"] || row["idsls_str"] || "").substring(
                  0,
                  10,
                ) === store.filterDesa,
            )
          : dataUsahaPertanian;
      filtered.forEach((row: any) => {
        const lat = parseFloat(row["lat final"] || row.lat);
        const lng = parseFloat(row["long final"] || row["long"] || row.lon);
        if (!isNaN(lat) && !isNaN(lng)) {
          features.push({
            type: "Feature",
            geometry: { type: "Point", coordinates: [lng, lat] },
            properties: {
              tipe_entitas: "Usaha Pertanian",
              nama:
                row["nama_krt"] || row["nm_project"] || row["nama"] || "",
              alamat: row["deskripsi_project"] || row["alamat"] || "",
              idsls: row["idsls_str"] || row["iddesa"] || "",
              ...row,
            },
          });
        }
      });
    }

    // 4. Point Rumah Tangga
    if (dataRumahTangga && Array.isArray(dataRumahTangga)) {
      const filtered =
        store.filterDesa !== "Semua"
          ? dataRumahTangga.filter(
              (row: any) =>
                String(
                  row["idsls_str"] || row["idsls final"] || "",
                ).substring(0, 10) === store.filterDesa,
            )
          : dataRumahTangga;
      filtered.forEach((row: any) => {
        const lat = parseFloat(row["lat final"] || row.lat);
        const lng = parseFloat(row["long final"] || row["long"] || row.lon);
        if (!isNaN(lat) && !isNaN(lng)) {
          features.push({
            type: "Feature",
            geometry: { type: "Point", coordinates: [lng, lat] },
            properties: {
              tipe_entitas: "Rumah Tangga",
              nama:
                row["nama final"] || row["nama_krt"] || row["nama"] || "",
              alamat: row["alamat final"] || row["alamat"] || "",
              idsls: row["idsls_str"] || row["idsls final"] || "",
              ...row,
            },
          });
        }
      });
    }

    const geoJsonOutput = {
      type: "FeatureCollection",
      properties: {
        wilayah: regionLabel,
        total_features: features.length,
        exported_at: new Date().toISOString(),
      },
      features,
    };

    const blob = new Blob([JSON.stringify(geoJsonOutput, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Spasial_SE2026_${regionLabel.replace(/[^a-zA-Z0-9]/g, "_")}.geojson`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      {/* FLOATING MINI SUMMARY BAR (Posisi Bottom-Left agar TIDAK Menutupi Map Controls di Kanan Bawah) */}
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

      {/* EXPANDED FLOATING BOTTOM OVERLAY SHEET / FULL PANEL EXPAND */}
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
        {/* Header Bar dengan Selector Wilayah & Action Buttons */}
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

          {/* Dynamic Inline Wilayah Selectors (Kecamatan & Desa) */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            {/* Select Kecamatan */}
            <div className="flex items-center gap-1.5 flex-1 sm:flex-none">
              <span className="text-[11px] text-muted-foreground hidden sm:inline">
                Kec:
              </span>
              <Select
                value={store.filterKecamatan || undefined}
                onValueChange={(val) => {
                  store.setFilter("filterKecamatan", val);
                  store.setFilter("filterDesa", "Semua");
                }}
              >
                <SelectTrigger className="h-8 text-xs w-full sm:w-[140px] md:w-[160px] bg-background">
                  <SelectValue placeholder="Pilih Kecamatan" />
                </SelectTrigger>
                <SelectContent>
                  {isAdmin && (
                    <SelectItem value="Semua">Semua Kecamatan</SelectItem>
                  )}
                  {kecOptions.map((k: any) => (
                    <SelectItem key={k.idkec} value={k.idkec}>
                      {k.nmkec || k.nama || k.name || k.idkec}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Select Desa */}
            <div className="flex items-center gap-1.5 flex-1 sm:flex-none">
              <span className="text-[11px] text-muted-foreground hidden sm:inline">
                Desa:
              </span>
              <Select
                value={store.filterDesa || undefined}
                onValueChange={(val) => store.setFilter("filterDesa", val)}
                disabled={
                  !store.filterKecamatan ||
                  store.filterKecamatan === "Semua" ||
                  desaOptions.length === 0
                }
              >
                <SelectTrigger className="h-8 text-xs w-full sm:w-[130px] md:w-[150px] bg-background">
                  <SelectValue placeholder="Pilih Desa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Semua">Semua Desa</SelectItem>
                  {desaOptions.map((d: any) => (
                    <SelectItem key={d.iddesa} value={d.iddesa}>
                      {d.nmdesa || d.nama || d.name || d.iddesa}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Export Buttons */}
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

            {/* Dokumentasi Navigation Button */}
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

            {/* Expand / Fullscreen Toggle Button */}
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

            {/* Collapse Button */}
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

        {/* Content Body Scrollable */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 md:p-6 space-y-4 sm:space-y-6">
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
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

            <Card className="bg-card/60">
              <CardHeader className="p-2.5 sm:p-3 pb-1 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-[10px] sm:text-[11px] font-medium text-muted-foreground truncate">
                  Rumah Tangga
                </CardTitle>
                <Home className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-500 shrink-0" />
              </CardHeader>
              <CardContent className="p-2.5 sm:p-3 pt-0">
                <div className="text-lg sm:text-xl font-bold">
                  {stats.totalRt.toLocaleString()}
                </div>
                <p className="text-[9px] sm:text-[10px] text-muted-foreground mt-0.5">
                  Unit Keluarga
                </p>
              </CardContent>
            </Card>

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

          {/* Highlight Insights Bar (Monitoring Insights Kunci) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
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

          {/* Visual Charts, Komparasi, & Table Tabs */}
          <Tabs defaultValue="visual" className="w-full">
            <TabsList className="grid grid-cols-2 sm:grid-cols-4 max-w-2xl mb-4">
              <TabsTrigger value="visual" className="text-xs">
                Visual Chart & Insight
              </TabsTrigger>
              <TabsTrigger value="komparasi" className="text-xs">
                Komparasi Kecamatan
              </TabsTrigger>
              <TabsTrigger value="sls" className="text-xs">
                Tabel Data SLS
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
                        Unit Rumah Tangga
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

          {/* Rincian Tabel Entitas & Bangunan (Search & Filter per Entitas) */}
          <EntityDetailTable spatialData={spatialData} />
        </div>
      </div>
    </>
  );
}
