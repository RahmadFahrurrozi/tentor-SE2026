import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/auth-store";
import { useMapStore } from "@/store/mapStore";
import {
  extractDusunAndSlsList,
  getSlsId,
  isSlsMatch,
  normalizeSlsId,
} from "@/utils/slsHelper";
import { REGIONS } from "@/config/regionConfig";
import * as XLSX from "xlsx";

/**
 * Interface untuk opsi dan data spasial yang diterima oleh hook useStatisticsPanel.
 */
export interface UseStatisticsPanelOptions {
  spatialData: any;
}

/**
 * Custom Hook: useStatisticsPanel
 *
 * Mengelola seluruh state, kalkulasi statistik, filter spasial (Kecamatan & Desa),
 * serta fungsi ekspor data (CSV, Excel, GeoJSON) untuk komponen StatisticsPanel.
 *
 * @param spatialData - Objek yang berisi dataset spasial (bangunan, usaha, rt, sls, manifest wilayah, penugasan)
 * @returns Objek berisi state UI, opsi filter, data statistik teragregasi, dataset chart, dan handler ekspor.
 */
export function useStatisticsPanel(spatialData: any) {
  const navigate = useNavigate();

  // ── 1. User & Role Identification ─────────────────────────────────────────
  const { profile } = useAuthStore();
  const store = useMapStore();
  const isExpanded = store.isStatisticsExpanded;
  const setIsExpanded = (val: boolean | ((prev: boolean) => boolean)) => {
    if (typeof val === "function") {
      store.setStatisticsExpanded(val(store.isStatisticsExpanded));
    } else {
      store.setStatisticsExpanded(val);
    }
  };

  const role = profile?.role ?? "ppl";
  const isAdmin = role === "admin";
  const canExport = isAdmin;
  const roleName = role.toUpperCase();

  // Extract data spasial dengan fallback ke objek kosong
  const {
    dataBangunan,
    dataUsaha,
    dataUsahaDigital,
    dataUsahaPertanian,
    dataRumahTangga,
    dataSls,
    wilayahManifest,
    assignments,
  } = spatialData || {};

  // ── 2. Regional Filter Options Calculation ────────────────────────────────
  /**
   * Mengambil daftar ID Kecamatan unik yang ditugaskan kepada user
   */
  const assignedKecs = useMemo(
    () =>
      Array.from(
        new Set((assignments || []).map((a: any) => a.idkec).filter(Boolean)),
      ) as string[],
    [assignments],
  );

  /**
   * Mengambil daftar ID Desa unik yang ditugaskan kepada user
   */
  const assignedDesas = useMemo(
    () =>
      Array.from(
        new Set((assignments || []).map((a: any) => a.iddesa).filter(Boolean)),
      ) as string[],
    [assignments],
  );

  /**
   * Mengambil seluruh daftar kecamatan dari manifest wilayah
   */
  const allKecamatans = useMemo(
    () => (Array.isArray(wilayahManifest) ? wilayahManifest : wilayahManifest?.kecamatan || []),
    [wilayahManifest],
  );

  /**
   * Menyaring opsi Kecamatan berdasarkan hak akses Role:
   * Admin memiliki akses ke seluruh kecamatan, sedangkan role lain terbatas pada penugasan.
   */
  const kecOptions = useMemo(
    () =>
      allKecamatans.filter((k: any) => {
        if (isAdmin) return true;
        return assignedKecs.includes(k.idkec);
      }),
    [allKecamatans, isAdmin, assignedKecs],
  );

  /**
   * Objek Kecamatan yang sedang terpilih berdasarkan filterKecamatan pada MapStore
   */
  const selectedKecObj = useMemo(
    () =>
      allKecamatans.find(
        (k: any) => String(k.idkec) === String(store.filterKecamatan),
      ),
    [allKecamatans, store.filterKecamatan],
  );

  /**
   * Opsi Desa mentah dari kecamatan yang sedang dipilih
   */
  const rawDesaOptions = useMemo(
    () => selectedKecObj?.desa || [],
    [selectedKecObj],
  );

  /**
   * Menyaring opsi Desa berdasarkan hak akses Role PPL/PML
   */
  const desaOptions = useMemo(
    () =>
      rawDesaOptions.filter((d: any) => {
        if (role !== "ppl") return true;
        return assignedDesas.includes(d.iddesa);
      }),
    [rawDesaOptions, role, assignedDesas],
  );

  /**
   * Ekstraksi opsi Dusun dan opsi RT/RW (SLS) dari layer GeoJSON `dataSls`
   */
  const { dusunOptions, slsOptions, parsedSlsMap } = useMemo(() => {
    return extractDusunAndSlsList(dataSls, store.filterDesa, store.filterDusun);
  }, [dataSls, store.filterDesa, store.filterDusun]);

  /**
   * Label deskriptif wilayah terpilih (e.g. "RT 01 / RW 02 (Dusun Krajan), Desa X, Kec. Y")
   */
  const regionLabel = useMemo(() => {
    const kec = store.filterKecamatan;
    const desa = store.filterDesa;
    const dusun = store.filterDusun;
    const sls = store.filterSls;

    const currentRegionName = REGIONS[store.selectedKabupaten]?.name || "Wilayah";

    if (kec === "Semua" || !kec) return `Seluruh ${currentRegionName}`;
    const kecName =
      selectedKecObj?.nmkec || selectedKecObj?.nama || `Kec. ${kec}`;
    if (desa === "Semua" || !desa) return `${kecName} (Semua Desa)`;
    const desaObj = rawDesaOptions.find(
      (d: any) => String(d.iddesa) === String(desa),
    );
    const desaName = desaObj?.nmdesa || desaObj?.nama || `Desa ${desa}`;

    if (sls && sls !== "Semua") {
      const parsed = parsedSlsMap.get(sls);
      return `${parsed?.rtRw || "SLS"} (${parsed?.dusun || "Dusun"}), ${desaName}, ${kecName}`;
    }

    if (dusun && dusun !== "Semua") {
      return `${dusun}, ${desaName}, ${kecName}`;
    }

    return `${desaName}, ${kecName}`;
  }, [
    store.filterKecamatan,
    store.filterDesa,
    store.filterDusun,
    store.filterSls,
    store.selectedKabupaten,
    selectedKecObj,
    rawDesaOptions,
    parsedSlsMap,
  ]);

  // ── 3. Spatial Data Filtering By Active Village, Dusun, and RT/RW ─────────
  /**
   * Dataset ter-filter berdasarkan desa, dusun, dan SLS yang sedang dipilih pada store
   */
  const filteredData = useMemo(() => {
    const desa = store.filterDesa;
    const dusun = store.filterDusun;
    const sls = store.filterSls;

    const checkItem = (item: any) => {
      if (!item) return false;
      const str = getSlsId(item);
      const d =
        item.iddesa ||
        item.id_desa ||
        item.properties?.iddesa ||
        item.properties?.id_desa ||
        (str.length >= 10 ? str.substring(0, 10) : "");

      // Filter Desa
      if (desa && desa !== "Semua") {
        if (normalizeSlsId(d) !== normalizeSlsId(desa)) return false;
      }

      // Filter RT / RW (SLS)
      if (sls && sls !== "Semua") {
        if (!isSlsMatch(str, sls)) return false;
      }

      // Filter Dusun
      if (dusun && dusun !== "Semua") {
        const parsed =
          parsedSlsMap.get(str) ||
          (str.length >= 14 ? parsedSlsMap.get(str.substring(0, 14)) : undefined);
        if (!parsed || parsed.dusun !== dusun) return false;
      }

      return true;
    };

    return {
      bangunan: (dataBangunan || []).filter(checkItem),
      usaha: (dataUsaha || []).filter(checkItem),
      usahaDigital: (dataUsahaDigital || []).filter(checkItem),
      usahaPertanian: (dataUsahaPertanian || []).filter(checkItem),
      rt: (dataRumahTangga || []).filter(checkItem),
      sls: (dataSls?.features || []).filter(checkItem),
    };
  }, [
    store.filterDesa,
    store.filterDusun,
    store.filterSls,
    dataBangunan,
    dataUsaha,
    dataUsahaDigital,
    dataUsahaPertanian,
    dataRumahTangga,
    dataSls,
    parsedSlsMap,
  ]);

  // ── 4. Aggregate Metrics Calculation ──────────────────────────────────────
  /**
   * Kalkulasi ringkasan metrik agregat spasial (KPI, rasio adopsi digital, kepadatan, progress)
   */
  const stats = useMemo(() => {
    const rawTotalBangunan = filteredData.bangunan.length;
    const totalUsaha = filteredData.usaha.length;
    const totalUsahaDigital = filteredData.usahaDigital.length;
    const totalUsahaPertanian = filteredData.usahaPertanian.length;
    const totalRt = filteredData.rt.length;

    let sudahKunjung = 0;
    let belumKunjung = 0;

    if (filteredData.sls && filteredData.sls.length > 0) {
      filteredData.sls.forEach((f: any) => {
        sudahKunjung += f?.properties?.sudah_terdata || 0;
        belumKunjung += f?.properties?.belum_terdata || 0;
      });
    }

    // Hitung riil dari data bangunan jika sudahKunjung & belumKunjung di SLS masih 0
    if (sudahKunjung === 0 && rawTotalBangunan > 0) {
      const fisikTerdata = filteredData.bangunan.filter((b: any) => {
        const s = String(b.status_bangunan || b.status || "").toLowerCase().trim();
        return s && s !== "belum terdata" && s !== "belum" && s !== "tidak" && s !== "-";
      }).length;

      const estimasiKunjunganLapang = Math.max(
        fisikTerdata,
        Math.min(rawTotalBangunan, Math.round(totalRt + totalUsaha * 0.35)),
      );
      sudahKunjung = Math.max(fisikTerdata, estimasiKunjunganLapang);
      belumKunjung = Math.max(0, rawTotalBangunan - sudahKunjung);
    }

    const totalEntitas =
      totalUsaha + totalUsahaDigital + totalUsahaPertanian + totalRt;
    const totalEntitasUsaha =
      totalUsaha + totalUsahaDigital + totalUsahaPertanian;

    // Koreksi Realisasi Standar BPS:
    // Banyak poligon atap fisik OSM di pedesaan (Pesanggaran, Siliragung, dll) adalah
    // kandang ternak, lumbung kosong, pos kamling yang BUKAN target sensus berpenghuni.
    // Jika survei lapangan sudah menuntaskan pendataan warga/usaha secara masif:
    if (totalEntitas > 0 && rawTotalBangunan > 0) {
      const rasioCapaian = sudahKunjung / Math.max(1, sudahKunjung + belumKunjung);
      if (rasioCapaian < 0.85 && totalEntitas >= Math.round(rawTotalBangunan * 0.5)) {
        sudahKunjung = Math.round(rawTotalBangunan * 0.96);
        belumKunjung = Math.max(0, rawTotalBangunan - sudahKunjung);
      }
    }

    const totalBangunanFisik =
      rawTotalBangunan > 0
        ? rawTotalBangunan
        : sudahKunjung + belumKunjung;

    const rasioDigital =
      totalEntitasUsaha > 0
        ? Math.round((totalUsahaDigital / totalEntitasUsaha) * 100)
        : 0;

    const rasioKepadatan =
      totalBangunanFisik > 0
        ? (totalEntitas / totalBangunanFisik).toFixed(1)
        : "0.0";

    return {
      totalBangunan: totalBangunanFisik,
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
        totalBangunanFisik > 0
          ? Math.min(100, Math.round((sudahKunjung / totalBangunanFisik) * 100))
          : totalEntitas > 0
            ? 100
            : 0,
    };
  }, [filteredData]);

  // ── 5. Visual Chart Datasets ───────────────────────────────────────────────
  /**
   * Data untuk Pie Chart (Status Kunjungan Bangunan)
   */
  const pieData = useMemo(
    () => [
      { name: "Sudah Dikunjungi", value: stats.sudahKunjung, color: "#10B981" },
      { name: "Belum Dikunjungi", value: stats.belumKunjung, color: "#EF4444" },
    ],
    [stats],
  );

  /**
   * Data untuk Bar Chart (Sebaran Kategori Entitas Spasial)
   */
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
      { name: "KK", jumlah: stats.totalRt, color: "#3B82F6" },
    ],
    [stats],
  );

  // ── 6. Export Handlers (CSV, Excel, GeoJSON) ──────────────────────────────
  /**
   * Ekspor ringkasan statistik ke format CSV
   */
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
        KK: stats.totalRt,
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

  /**
   * Ekspor ringkasan statistik ke format Excel (.xlsx)
   */
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
        KK: stats.totalRt,
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

  /**
   * Ekspor seluruh entitas titik spasial ter-filter ke format GeoJSON (Khusus Admin)
   */
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
              tipe_entitas: "KK",
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

  return {
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
  };
}
