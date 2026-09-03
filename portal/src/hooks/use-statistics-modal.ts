import { useMemo } from "react";
import { useAuthStore } from "@/store/auth-store";
import { useMapStore } from "@/store/mapStore";
import * as XLSX from "xlsx";

/**
 * Custom Hook: useStatisticsModal
 *
 * Mengelola seluruh logika state & data untuk StatisticsModal:
 * - Menentukan label wilayah terpilih dari filter
 * - Menghitung agregasi statistik spasial (bangunan, usaha, rt, progress SLS)
 * - Menyiapkan dataset untuk Pie Chart dan Bar Chart
 * - Handler ekspor data ke format CSV dan Excel (khusus Admin)
 */
export function useStatisticsModal(spatialData: any) {
  const { profile } = useAuthStore();
  const store = useMapStore();
  const isAdmin = profile?.role === "admin";
  const roleName = profile?.role?.toUpperCase() || "USER";

  const {
    dataBangunan,
    dataUsaha,
    dataUsahaDigital,
    dataUsahaPertanian,
    dataRumahTangga,
    dataSls,
    wilayahManifest,
  } = spatialData || {};

  // Selected region label
  const regionLabel = useMemo(() => {
    const kec = store.filterKecamatan;
    const desa = store.filterDesa;
    if (kec === "Semua" || !kec) return "Seluruh Kabupaten Banyuwangi";
    const kecObj = wilayahManifest?.kecamatan?.find(
      (k: any) => String(k.idkec) === String(kec),
    );
    const kecName = kecObj?.nmkec || `Kec. ${kec}`;
    if (desa === "Semua" || !desa) return `${kecName} (Semua Desa)`;
    const desaObj = kecObj?.desa?.find(
      (d: any) => String(d.iddesa) === String(desa),
    );
    const desaName = desaObj?.nmdesa || `Desa ${desa}`;
    return `${desaName}, ${kecName}`;
  }, [store.filterKecamatan, store.filterDesa, wilayahManifest]);

  // Aggregate metrics
  const stats = useMemo(() => {
    const totalBangunan = dataBangunan?.length || 0;
    const totalUsaha = dataUsaha?.length || 0;
    const totalUsahaDigital = dataUsahaDigital?.length || 0;
    const totalUsahaPertanian = dataUsahaPertanian?.length || 0;
    const totalRt = dataRumahTangga?.length || 0;

    let sudahKunjung = 0;
    let belumKunjung = 0;

    if (dataSls?.features) {
      dataSls.features.forEach((f: any) => {
        sudahKunjung += f.properties?.sudah_terdata || 0;
        belumKunjung += f.properties?.belum_terdata || 0;
      });
    }

    const totalBangunanDariSls = sudahKunjung + belumKunjung;
    const effectiveTotalBangunan =
      totalBangunanDariSls > 0 ? totalBangunanDariSls : totalBangunan;

    return {
      totalBangunan: effectiveTotalBangunan,
      totalUsaha,
      totalUsahaDigital,
      totalUsahaPertanian,
      totalRt,
      sudahKunjung,
      belumKunjung,
      progressPct:
        effectiveTotalBangunan > 0
          ? Math.min(
              100,
              Math.round((sudahKunjung / effectiveTotalBangunan) * 100),
            )
          : 0,
    };
  }, [
    dataBangunan,
    dataUsaha,
    dataUsahaDigital,
    dataUsahaPertanian,
    dataRumahTangga,
    dataSls,
  ]);

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
        color: "#FF32DC",
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
    if (!isAdmin) return;

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
    if (!isAdmin) return;

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

  return {
    roleName,
    isAdmin,
    regionLabel,
    stats,
    pieData,
    barData,
    handleExportCSV,
    handleExportExcel,
  };
}
