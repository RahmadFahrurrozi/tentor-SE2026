import { useMemo, useState, useRef } from "react";
import { useMapStore } from "@/store/mapStore";
import { useAuthStore } from "@/store/auth-store";
import { supabase } from "@/lib/supabase";
import * as XLSX from "xlsx";
import {
  analyzeSlsCluster,
  type RawSpatialPoint,
  type SlsClusterSummary,
} from "@/utils/clusterDetector";
import {
  extractDusunAndSlsList,
  getSlsId,
  isSlsMatch,
  normalizeSlsId,
  parseSlsName,
} from "@/utils/slsHelper";
import { assignSlsToPoints } from "@/utils/dataProcessing";
import { REGIONS } from "@/config/regionConfig";

export interface UseClusterAnalysisOptions {
  spatialData: any;
  epsMeters?: number;
  minSamples?: number;
  minClusterPercent?: number;
}

export function useClusterAnalysis({
  spatialData,
  epsMeters = 5,
  minSamples = 5,
  minClusterPercent = 0.20,
}: UseClusterAnalysisOptions) {
  const store = useMapStore();
  const { profile } = useAuthStore();
  const isAdmin = profile?.role === "admin";

  // Scope: Analisis kecamatan aktif vs Seluruh Kabupaten
  const [scope, setScope] = useState<"current_kecamatan" | "all_kabupaten">(
    "current_kecamatan"
  );
  const [isLoadingAllKab, setIsLoadingAllKab] = useState(false);
  const [loadProgress, setLoadProgress] = useState<{
    current: number;
    total: number;
    kecName: string;
  } | null>(null);

  const [allKabSummaries, setAllKabSummaries] = useState<SlsClusterSummary[]>([]);
  const allKabCacheRef = useRef<Record<string, SlsClusterSummary[]>>({});

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "SEMUA" | "BERGEROMBOL" | "MENYEBAR"
  >("SEMUA");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [selectedSlsId, setSelectedSlsId] = useState<string | null>(null);
  const [selectedClusterId, setSelectedClusterId] = useState<number | null>(null);

  const {
    dataBangunan = [],
    dataUsaha = [],
    dataUsahaDigital = [],
    dataUsahaPertanian = [],
    dataRumahTangga = [],
    dataBangunanLainnya = [],
    dataSls,
    wilayahManifest,
  } = spatialData || {};

  // Lookup nama Desa dari wilayahManifest (seluruh kecamatan & desa di kabupaten)
  const desaNameMap = useMemo(() => {
    const map = new Map<string, string>();
    const allKec = wilayahManifest?.kecamatan || [];
    allKec.forEach((k: any) => {
      if (Array.isArray(k.desa)) {
        k.desa.forEach((d: any) => {
          const id = normalizeSlsId(d.iddesa);
          const name = d.nama || d.nmdesa || "";
          if (id && name) {
            map.set(id, name);
            if (id.length >= 10) {
              map.set(id.substring(0, 10), name);
            }
          }
        });
      }
    });
    return map;
  }, [wilayahManifest]);

  // Nama kecamatan aktif terpilih
  const currentKecName = useMemo(() => {
    const kec = store.filterKecamatan;
    if (!kec || kec === "Semua") return "Seluruh Kecamatan";
    const k = (wilayahManifest?.kecamatan || []).find(
      (item: any) => String(item.idkec) === String(kec)
    );
    return k?.nmkec || k?.nama || `Kecamatan ${kec}`;
  }, [store.filterKecamatan, wilayahManifest]);

  // Ekstraksi pemetaan Dusun dan SLS untuk kecamatan aktif
  const { parsedSlsMap } = useMemo(() => {
    return extractDusunAndSlsList(dataSls, store.filterDesa, store.filterDusun);
  }, [dataSls, store.filterDesa, store.filterDusun]);

  // Lookup nama SLS dari GeoJSON
  const slsMetaMap = useMemo(() => {
    const map = new Map<
      string,
      {
        slsName: string;
        desaName: string;
        kecName: string;
        dusunName: string;
        rtRw: string;
        idkec?: string;
      }
    >();

    if (dataSls?.features) {
      dataSls.features.forEach((f: any) => {
        const props = f.properties || {};
        const idslsRaw =
          props.idsls ||
          props.id_sls ||
          props.IDSLS ||
          props.kode_sls ||
          props.idsls_str;
        const key = normalizeSlsId(idslsRaw);
        if (!key) return;

        const parsed =
          parsedSlsMap.get(key) ||
          parseSlsName(props.nmsls || props.nama_sls || props.nama || "", key);

        const rawSlsName = props.nmsls || props.nama_sls || props.nama || "";
        const slsName =
          rawSlsName && rawSlsName !== key
            ? rawSlsName
            : parsed
              ? `${parsed.rtRw} (${parsed.dusun})`
              : key;

        const iddesaRaw =
          props.iddesa ||
          props.id_desa ||
          (key.length >= 10 ? key.substring(0, 10) : "");
        const iddesa = normalizeSlsId(iddesaRaw);

        let desaName =
          props.nmdesa ||
          props.desa ||
          props.nama_desa ||
          "";

        if (!desaName && iddesa) {
          desaName = desaNameMap.get(iddesa) || "";
        }

        const kecName =
          props.nmkec ||
          props.kecamatan ||
          props.nama_kec ||
          currentKecName;

        const idkec =
          props.idkec ||
          props.id_kec ||
          key.substring(0, 7) ||
          "";

        const entry = {
          slsName,
          desaName,
          kecName,
          dusunName: parsed?.dusun || "",
          rtRw: parsed?.rtRw || "",
          idkec,
        };

        map.set(key, entry);
        if (key.length >= 14) {
          map.set(key.substring(0, 14), entry);
          if (key.length === 14) {
            map.set(`${key}00`, entry);
          }
        }
      });
    }

    return map;
  }, [dataSls, parsedSlsMap, desaNameMap, currentKecName]);

  // Kumpulkan seluruh titik aktif kecamatan yang sedang dipilih
  const currentKecPoints = useMemo(() => {
    const desa = store.filterDesa;
    const dusun = store.filterDusun;
    const sls = store.filterSls;

    const checkItem = (item: any): boolean => {
      if (!item) return false;
      const str = getSlsId(item);
      const d =
        item.iddesa ||
        item.id_desa ||
        item.properties?.iddesa ||
        item.properties?.id_desa ||
        (str.length >= 10 ? str.substring(0, 10) : "");

      if (desa && desa !== "Semua") {
        if (normalizeSlsId(d) !== normalizeSlsId(desa)) return false;
      }

      if (sls && sls !== "Semua") {
        if (!isSlsMatch(str, sls)) return false;
      }

      if (dusun && dusun !== "Semua") {
        const parsed =
          parsedSlsMap.get(str) ||
          (str.length >= 14 ? parsedSlsMap.get(str.substring(0, 14)) : undefined);
        if (!parsed || parsed.dusun !== dusun) return false;
      }

      return true;
    };

    const combined: RawSpatialPoint[] = [];

    (dataBangunan || []).forEach((b: any) => {
      if (checkItem(b)) combined.push({ ...b, kategori: b.status_bangunan || "Bangunan" });
    });
    (dataUsaha || []).forEach((u: any) => {
      if (checkItem(u)) combined.push({ ...u, kategori: "Usaha Biasa" });
    });
    (dataUsahaDigital || []).forEach((ud: any) => {
      if (checkItem(ud)) combined.push({ ...ud, kategori: "Usaha Digital" });
    });
    (dataUsahaPertanian || []).forEach((up: any) => {
      if (checkItem(up)) combined.push({ ...up, kategori: "Usaha Pertanian" });
    });
    (dataRumahTangga || []).forEach((rt: any) => {
      if (checkItem(rt)) combined.push({ ...rt, kategori: "Keluarga (KK)" });
    });
    (dataBangunanLainnya || []).forEach((bl: any) => {
      if (checkItem(bl)) combined.push({ ...bl, kategori: "Bangunan Lainnya" });
    });

    return combined;
  }, [
    store.filterDesa,
    store.filterDusun,
    store.filterSls,
    dataBangunan,
    dataUsaha,
    dataUsahaDigital,
    dataUsahaPertanian,
    dataRumahTangga,
    dataBangunanLainnya,
    parsedSlsMap,
  ]);

  // Analisis kluster untuk kecamatan yang sedang aktif
  const currentKecSummaries = useMemo(() => {
    const pointsBySls: Record<string, RawSpatialPoint[]> = {};

    currentKecPoints.forEach((pt) => {
      const rawId = getSlsId(pt) || pt.idsls_str || pt.idsls;
      const key = normalizeSlsId(rawId);
      if (!key) return;

      if (!pointsBySls[key]) {
        pointsBySls[key] = [];
      }
      pointsBySls[key].push(pt);
    });

    if (dataSls?.features) {
      dataSls.features.forEach((f: any) => {
        const idslsRaw =
          f.properties.idsls ||
          f.properties.id_sls ||
          f.properties.IDSLS ||
          f.properties.kode_sls;
        const key = normalizeSlsId(idslsRaw);
        if (key && !pointsBySls[key]) {
          pointsBySls[key] = [];
        }
      });
    }

    const summaries: SlsClusterSummary[] = [];

    Object.keys(pointsBySls).forEach((slsId) => {
      const points = pointsBySls[slsId];
      let meta =
        slsMetaMap.get(slsId) ||
        (slsId.length >= 14 ? slsMetaMap.get(slsId.substring(0, 14)) : undefined) ||
        (slsId.length === 14 ? slsMetaMap.get(`${slsId}00`) : undefined);

      if (!meta) {
        const iddesa = slsId.length >= 10 ? slsId.substring(0, 10) : "";
        const nmdesa = desaNameMap.get(iddesa) || "";
        const parsed = parseSlsName(`SLS ${slsId.slice(-4)}`, slsId);
        meta = {
          slsName: `${parsed.rtRw} (${parsed.dusun})`,
          desaName: nmdesa,
          kecName: currentKecName,
          dusunName: parsed.dusun || "",
          rtRw: parsed.rtRw || "",
          idkec: store.filterKecamatan || "",
        };
      }

      const summary = analyzeSlsCluster(slsId, points, meta, {
        epsMeters,
        minSamples,
        minClusterPercent,
      });

      summaries.push(summary);
    });

    summaries.sort((a, b) => {
      if (a.status === "BERGEROMBOL" && b.status !== "BERGEROMBOL") return -1;
      if (a.status !== "BERGEROMBOL" && b.status === "BERGEROMBOL") return 1;
      if (b.titikBergerombol !== a.titikBergerombol) {
        return b.titikBergerombol - a.titikBergerombol;
      }
      return b.jumlahTitik - a.jumlahTitik;
    });

    return summaries;
  }, [
    currentKecPoints,
    dataSls,
    slsMetaMap,
    epsMeters,
    minSamples,
    minClusterPercent,
  ]);

  // ── Fungsi Load Analisis Kluster Se-Kabupaten ─────────────────────────────
  const loadAllKabupatenClusters = async (forceRefresh: boolean = false) => {
    const allKecamatans = wilayahManifest?.kecamatan || [];
    if (!allKecamatans.length) {
      alert("Daftar kecamatan belum siap. Silakan tunggu beberapa detik.");
      return;
    }

    const kabId = store.selectedKabupaten;
    const version = store.activeDatasetVersion;
    const cacheKey = `${kabId}_${version}`;

    // Gunakan cache jika sudah pernah dihitung dan datanya lengkap (desaName terisi)
    const existingCache = allKabCacheRef.current[cacheKey];
    if (
      !forceRefresh &&
      existingCache &&
      existingCache.length > 0 &&
      existingCache.some((x) => Boolean(x.desaName))
    ) {
      setAllKabSummaries(existingCache);
      setScope("all_kabupaten");
      setCurrentPage(1);
      return;
    }

    setIsLoadingAllKab(true);
    setLoadProgress({ current: 0, total: allKecamatans.length, kecName: "Memulai..." });

    const region = REGIONS[kabId] || REGIONS["3510"];
    let primaryBucket = region.bucketName;
    if (kabId === "3510" && version !== "se2026") {
      primaryBucket = "spatial-chunks";
    }

    const getChunkUrl = (path: string, bucket: string = primaryBucket) => {
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      return data.publicUrl;
    };

    const fetchChunkSafe = async (path: string, bucket: string = primaryBucket) => {
      try {
        const res = await fetch(getChunkUrl(path, bucket));
        if (!res.ok) return [];
        const json = await res.json();
        return json.data || json || [];
      } catch {
        return [];
      }
    };

    const fetchSlsChunkSafe = async (kId: string) => {
      try {
        const path = `sls/kec_${kId}.json`;
        const slsBucket = region.bucketName;
        let res = await fetch(getChunkUrl(path, slsBucket));
        if (!res.ok && kabId === "3510") {
          res = await fetch(getChunkUrl(path, "spatial-chunks"));
        }
        if (!res.ok) return null;
        return await res.json();
      } catch (e) {
        console.error(`[Cluster] Gagal fetch SLS chunk kec ${kId}:`, e);
        return null;
      }
    };

    const aggregatedSummaries: SlsClusterSummary[] = [];

    for (let i = 0; i < allKecamatans.length; i++) {
      const kec = allKecamatans[i];
      const kecId = String(kec.idkec);
      const kecName = kec.nmkec || kec.nama || `Kec. ${kecId}`;

      setLoadProgress({
        current: i + 1,
        total: allKecamatans.length,
        kecName,
      });

      // Map desa lokal untuk kecamatan ini dari wilayahManifest
      const localDesaMap = new Map<string, string>();
      if (Array.isArray(kec.desa)) {
        kec.desa.forEach((d: any) => {
          const id = normalizeSlsId(d.iddesa);
          const nm = d.nama || d.nmdesa || "";
          if (id && nm) {
            localDesaMap.set(id, nm);
            if (id.length >= 10) {
              localDesaMap.set(id.substring(0, 10), nm);
            }
          }
        });
      }

      try {
        const [usaha, usahaDigital, usahaPertanianRaw, rumahTangga, bangunan, bangunanLainnya, slsGeo] =
          await Promise.all([
            fetchChunkSafe(`usaha/kec_${kecId}.json`),
            fetchChunkSafe(`usaha_digital/kec_${kecId}.json`),
            fetchChunkSafe(`usaha_pertanian/kec_${kecId}.json`),
            fetchChunkSafe(`rumah_tangga/kec_${kecId}.json`),
            fetchChunkSafe(`bangunan/kec_${kecId}.json`, "spatial-chunks"),
            fetchChunkSafe(`bangunan/kec_${kecId}.json`, "spatial-chunks-se2026"),
            fetchSlsChunkSafe(kecId),
          ]);

        const usahaPertanian = slsGeo?.features?.length
          ? assignSlsToPoints(usahaPertanianRaw, slsGeo)
          : usahaPertanianRaw;

        // Kumpulkan titik kecamatan ini
        const kecPoints: RawSpatialPoint[] = [];
        (bangunan || []).forEach((b: any) => kecPoints.push({ ...b, kategori: b.status_bangunan || "Bangunan" }));
        (usaha || []).forEach((u: any) => kecPoints.push({ ...u, kategori: "Usaha Biasa" }));
        (usahaDigital || []).forEach((ud: any) => kecPoints.push({ ...ud, kategori: "Usaha Digital" }));
        (usahaPertanian || []).forEach((up: any) => kecPoints.push({ ...up, kategori: "Usaha Pertanian" }));
        (rumahTangga || []).forEach((rt: any) => kecPoints.push({ ...rt, kategori: "Keluarga (KK)" }));
        (bangunanLainnya || []).forEach((bl: any) => kecPoints.push({ ...bl, kategori: "Bangunan Lainnya" }));

        // Map nama SLS dan Desa dari slsGeo
        const localMetaMap = new Map<string, any>();
        if (slsGeo?.features) {
          slsGeo.features.forEach((f: any) => {
            const props = f.properties || {};
            const idslsRaw =
              props.idsls ||
              props.id_sls ||
              props.IDSLS ||
              props.kode_sls ||
              props.idsls_str;
            const key = normalizeSlsId(idslsRaw);
            if (!key) return;

            const nmsls = props.nmsls || props.nama_sls || props.nama || "";
            const iddesaRaw =
              props.iddesa ||
              props.id_desa ||
              (key.length >= 10 ? key.substring(0, 10) : "");
            const iddesa = normalizeSlsId(iddesaRaw);

            let nmdesa = props.nmdesa || props.desa || props.nama_desa || "";
            if (!nmdesa && iddesa) {
              nmdesa =
                localDesaMap.get(iddesa) || desaNameMap.get(iddesa) || "";
            }

            const parsed = parseSlsName(nmsls, key);
            const slsName =
              nmsls && nmsls !== key
                ? nmsls
                : parsed.displayLabel || `${parsed.rtRw} (${parsed.dusun})`;

            const entry = {
              slsName,
              desaName: nmdesa,
              kecName: props.nmkec || props.kecamatan || kecName,
              dusunName: parsed.dusun || "",
              rtRw: parsed.rtRw || "",
              idkec: kecId,
            };

            localMetaMap.set(key, entry);
            if (key.length >= 14) {
              localMetaMap.set(key.substring(0, 14), entry);
              if (key.length === 14) {
                localMetaMap.set(`${key}00`, entry);
              }
            }
          });
        }

        // Kelompokkan titik per SLS
        const pointsBySls: Record<string, RawSpatialPoint[]> = {};
        kecPoints.forEach((pt) => {
          const rawId = getSlsId(pt) || pt.idsls_str || pt.idsls;
          const key = normalizeSlsId(rawId);
          if (!key) return;
          if (!pointsBySls[key]) pointsBySls[key] = [];
          pointsBySls[key].push(pt);
        });

        // Jalankan DBSCAN untuk setiap SLS di kecamatan ini
        Object.keys(pointsBySls).forEach((slsId) => {
          const pts = pointsBySls[slsId];
          let meta =
            localMetaMap.get(slsId) ||
            (slsId.length >= 14 ? localMetaMap.get(slsId.substring(0, 14)) : undefined) ||
            (slsId.length === 14 ? localMetaMap.get(`${slsId}00`) : undefined);

          if (!meta) {
            const iddesa = slsId.length >= 10 ? slsId.substring(0, 10) : "";
            const nmdesa =
              localDesaMap.get(iddesa) || desaNameMap.get(iddesa) || "";
            const parsed = parseSlsName(`SLS ${slsId.slice(-4)}`, slsId);
            meta = {
              slsName: `${parsed.rtRw} (${parsed.dusun})`,
              desaName: nmdesa,
              kecName,
              dusunName: parsed.dusun || "",
              rtRw: parsed.rtRw || "",
              idkec: kecId,
            };
          }

          const summary = analyzeSlsCluster(slsId, pts, meta, {
            epsMeters,
            minSamples,
            minClusterPercent,
          });
          aggregatedSummaries.push(summary);
        });
      } catch (err) {
        console.error(`[Cluster All Kab] Error processing kecamatan ${kecId}:`, err);
      }
    }

    // Urutkan default seluruh kabupaten: status BERGEROMBOL di atas, lalu titik terbanyak
    aggregatedSummaries.sort((a, b) => {
      if (a.status === "BERGEROMBOL" && b.status !== "BERGEROMBOL") return -1;
      if (a.status !== "BERGEROMBOL" && b.status === "BERGEROMBOL") return 1;
      if (b.titikBergerombol !== a.titikBergerombol) {
        return b.titikBergerombol - a.titikBergerombol;
      }
      return b.jumlahTitik - a.jumlahTitik;
    });

    allKabCacheRef.current[cacheKey] = aggregatedSummaries;
    setAllKabSummaries(aggregatedSummaries);
    setScope("all_kabupaten");
    setIsLoadingAllKab(false);
    setLoadProgress(null);
    setCurrentPage(1);
  };

  // Pilih dataset ringkasan aktif berdasarkan scope
  const activeSummaries = useMemo(() => {
    return scope === "all_kabupaten" ? allKabSummaries : currentKecSummaries;
  }, [scope, allKabSummaries, currentKecSummaries]);

  // Ringkasan Agregat (KPI Kluster)
  const clusterKpi = useMemo(() => {
    let totalSls = activeSummaries.length;
    let slsBergerombolCount = 0;
    let slsMenyebarCount = 0;
    let totalClusteredPoints = 0;
    let totalNoisePoints = 0;
    let totalPoints = 0;
    let totalClusterCount = 0;
    let largestClusterOverall = 0;

    activeSummaries.forEach((s) => {
      if (s.status === "BERGEROMBOL") {
        slsBergerombolCount++;
      } else {
        slsMenyebarCount++;
      }
      totalClusteredPoints += s.titikBergerombol;
      totalNoisePoints += s.titikNoise;
      totalPoints += s.jumlahTitik;
      totalClusterCount += s.jumlahCluster;
      if (s.clusterTerbesar > largestClusterOverall) {
        largestClusterOverall = s.clusterTerbesar;
      }
    });

    const overallClusterPercent =
      totalPoints > 0
        ? Math.round((totalClusteredPoints / totalPoints) * 10000) / 100
        : 0;

    return {
      totalSls,
      slsBergerombolCount,
      slsMenyebarCount,
      totalClusteredPoints,
      totalNoisePoints,
      totalPoints,
      totalClusterCount,
      largestClusterOverall,
      overallClusterPercent,
    };
  }, [activeSummaries]);

  // Filter & Pencarian Tabel
  const filteredSummaries = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return activeSummaries.filter((s) => {
      if (statusFilter !== "SEMUA" && s.status !== statusFilter) {
        return false;
      }

      if (q) {
        const matchName = s.slsName.toLowerCase().includes(q);
        const matchId = s.idsls.toLowerCase().includes(q);
        const matchDesa = s.desaName.toLowerCase().includes(q);
        const matchKec = s.kecName.toLowerCase().includes(q);
        const matchDusun = (s.dusunName || "").toLowerCase().includes(q);
        const matchRtRw = (s.rtRw || "").toLowerCase().includes(q);

        if (
          !matchName &&
          !matchId &&
          !matchDesa &&
          !matchKec &&
          !matchDusun &&
          !matchRtRw
        ) {
          return false;
        }
      }

      return true;
    });
  }, [activeSummaries, statusFilter, searchQuery]);

  // Paginasi Tabel
  const totalPages = Math.ceil(filteredSummaries.length / itemsPerPage) || 1;
  const paginatedSummaries = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredSummaries.slice(start, start + itemsPerPage);
  }, [filteredSummaries, currentPage, itemsPerPage]);

  // SLS yang sedang dipilih untuk melihat rincian cluster
  const activeSlsSummary = useMemo(() => {
    if (!selectedSlsId) return null;
    return activeSummaries.find((s) => s.idsls === selectedSlsId) || null;
  }, [activeSummaries, selectedSlsId]);

  // Kluster spesifik yang sedang dipilih
  const activeClusterGroup = useMemo(() => {
    if (!activeSlsSummary || selectedClusterId === null) return null;
    return (
      activeSlsSummary.clusters.find((c) => c.clusterId === selectedClusterId) ||
      null
    );
  }, [activeSlsSummary, selectedClusterId]);

  // Aksi Terbang & Sorot di Peta ("Lihat di Peta")
  const handleFlyToCluster = (
    centroid: [number, number],
    clusterInfo: {
      count: number;
      slsId: string;
      title: string;
      idkec?: string;
    }
  ) => {
    // Jika titik berada di kecamatan lain saat mode all_kabupaten, sesuaikan filterKecamatan
    if (clusterInfo.idkec && store.filterKecamatan !== clusterInfo.idkec) {
      store.setFilter("filterKecamatan", clusterInfo.idkec);
      store.setFilter("filterDesa", "Semua");
      store.setFilter("filterDusun", "Semua");
      store.setFilter("filterSls", "Semua");
    }

    store.setFocusedClusterPoint({
      lng: centroid[0],
      lat: centroid[1],
      count: clusterInfo.count,
      slsId: clusterInfo.slsId,
      title: clusterInfo.title,
    });

    store.setStatisticsOpen(false);
  };

  // ── Ekspor Data Excel (.xlsx) Multi-Sheet Khusus Admin ────────────────────
  const handleExportExcel = () => {
    if (!isAdmin) return;

    // Sheet 1: Rekap Tingkat SLS
    const slsRows = activeSummaries.map((s) => {
      const iddesa = s.idsls.length >= 10 ? s.idsls.substring(0, 10) : "";
      const desaDisplay = s.desaName || desaNameMap.get(iddesa) || "-";
      return {
        Kecamatan: s.kecName,
        "Desa / Kelurahan": desaDisplay,
        Dusun: s.dusunName || "-",
        "RT / RW": s.rtRw || "-",
        "Nama SLS": s.slsName,
        "ID SLS": s.idsls,
        "Total Titik": s.jumlahTitik,
        "Titik Bergerombol": s.titikBergerombol,
        "Titik Normal (Menyebar)": s.titikNoise,
        "Persentase Bergerombol (%)": `${s.persenBergerombol}%`,
        "Jumlah Kluster": s.jumlahCluster,
        "Kluster Terbesar": `${s.clusterTerbesar} titik`,
        Status: s.status,
      };
    });

    // Sheet 2: Rincian Detail Titik per SLS (Row-by-Row Point Level)
    const pointRows: any[] = [];
    let no = 1;
    activeSummaries.forEach((s) => {
      const iddesa = s.idsls.length >= 10 ? s.idsls.substring(0, 10) : "";
      const desaDisplay = s.desaName || desaNameMap.get(iddesa) || "-";
      s.clusters.forEach((c) => {
        c.points.forEach((pt) => {
          pointRows.push({
            No: no++,
            Kecamatan: s.kecName,
            "Desa / Kelurahan": desaDisplay,
            Dusun: s.dusunName || "-",
            "RT / RW": s.rtRw || "-",
            "Nama SLS": s.slsName,
            "ID SLS": s.idsls,
            "Kelompok Kluster": `Kluster #${c.clusterId + 1} (${c.pointCount} titik)`,
            "ID Titik / Kuesioner": pt.id,
            "Kategori Entitas": pt.category,
            "Nama Usaha / Warga": pt.name,
            Alamat: pt.address,
            Status: pt.status,
            Latitude: pt.lat,
            Longitude: pt.lng,
          });
        });
      });
    });

    const wb = XLSX.utils.book_new();
    const wsSls = XLSX.utils.json_to_sheet(slsRows);
    const wsPoints = XLSX.utils.json_to_sheet(pointRows);

    XLSX.utils.book_append_sheet(wb, wsSls, "Rekap SLS Bergerombol");
    XLSX.utils.book_append_sheet(wb, wsPoints, "Detail Titik Bergerombol");

    const scopeLabel = scope === "all_kabupaten" ? "Se_Kabupaten" : "Kecamatan";
    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(
      wb,
      `Analisis_Titik_Bergerombol_DBSCAN_${scopeLabel}_${dateStr}.xlsx`
    );
  };

  // ── Ekspor Data CSV Khusus Admin ─────────────────────────────────────────
  const handleExportCsv = () => {
    if (!isAdmin) return;

    // Ekspor detail titik per SLS
    const pointRows: any[] = [];
    let no = 1;
    activeSummaries.forEach((s) => {
      const iddesa = s.idsls.length >= 10 ? s.idsls.substring(0, 10) : "";
      const desaDisplay = s.desaName || desaNameMap.get(iddesa) || "-";
      s.clusters.forEach((c) => {
        c.points.forEach((pt) => {
          pointRows.push({
            No: no++,
            Kecamatan: s.kecName,
            Desa: desaDisplay,
            Dusun: s.dusunName || "-",
            RT_RW: s.rtRw || "-",
            Nama_SLS: s.slsName,
            ID_SLS: s.idsls,
            Kluster_ID: c.clusterId + 1,
            ID_Titik: pt.id,
            Kategori: pt.category,
            Nama: pt.name,
            Alamat: pt.address,
            Latitude: pt.lat,
            Longitude: pt.lng,
          });
        });
      });
    });

    const ws = XLSX.utils.json_to_sheet(pointRows);
    const csvContent = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    const scopeLabel = scope === "all_kabupaten" ? "Se_Kabupaten" : "Kecamatan";
    const dateStr = new Date().toISOString().slice(0, 10);
    link.download = `Detail_Titik_Bergerombol_${scopeLabel}_${dateStr}.csv`;
    link.click();
  };

  return {
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
    itemsPerPage,
    clusterKpi,
    filteredSummaries,
    paginatedSummaries,
    selectedSlsId,
    setSelectedSlsId,
    selectedClusterId,
    setSelectedClusterId,
    activeSlsSummary,
    activeClusterGroup,
    handleFlyToCluster,
    handleExportExcel,
    handleExportCsv,
  };
}
