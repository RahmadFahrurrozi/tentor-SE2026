import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useMapStore, type DatasetVersion } from '@/store/mapStore';
import { useAuthStore } from '@/store/auth-store';
import { assignSlsToPoints } from '@/utils/dataProcessing';
import { REGIONS } from '@/config/regionConfig';

export function useSpatialData(versionOverride?: DatasetVersion) {
  const [dataUsaha, setDataUsaha] = useState<any[]>([]);
  const [dataUsahaDigital, setDataUsahaDigital] = useState<any[]>([]);
  const [dataUsahaPertanian, setDataUsahaPertanian] = useState<any[]>([]);
  const [dataRumahTangga, setDataRumahTangga] = useState<any[]>([]);
  const [dataBangunan, setDataBangunan] = useState<any[]>([]);
  const [dataSls, setDataSls] = useState<any>(null);
  const [dataKab, setDataKab] = useState<any>(null);
  const [dataDesa, setDataDesa] = useState<any>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [wilayahManifest, setWilayahManifest] = useState<any>(null);
  const [isLoadingManifest, setIsLoadingManifest] = useState(true);

  const [assignments, setAssignments] = useState<{ idkec: string | null; iddesa: string | null }[]>([]);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(true);

  const { profile } = useAuthStore();
  const selectedKabupaten = useMapStore((state) => state.selectedKabupaten);
  const filterKecamatan = useMapStore((state) => state.filterKecamatan);
  const storeActiveDatasetVersion = useMapStore((state) => state.activeDatasetVersion);
  const activeDatasetVersion = versionOverride ?? storeActiveDatasetVersion;
  const setFilter = useMapStore((state) => state.setFilter);

  const cache = useRef<Record<string, {
    usaha: any[];
    usahaDigital: any[];
    usahaPertanian: any[];
    rumahTangga: any[];
    bangunan: any[];
    sls: any;
  }>>({});

  const getChunksPublicUrl = (path: string, bucketName: string = 'spatial-chunks') => {
    const { data } = supabase.storage.from(bucketName).getPublicUrl(path);
    return data.publicUrl;
  };

  const getDataPublicUrl = (path: string) => {
    const { data } = supabase.storage.from('spatial-data').getPublicUrl(path);
    return data.publicUrl;
  };

  // 1. Manifest wilayah
  useEffect(() => {
    async function loadManifest() {
      try {
        setIsLoadingManifest(true);
        const region = REGIONS[selectedKabupaten] || REGIONS["3510"];
        let targetBucket = selectedKabupaten === '3515'
          ? 'spatial-chunks-sidoarjo'
          : (activeDatasetVersion === 'se2026' ? 'spatial-chunks-se2026' : 'spatial-chunks');

        let response = await fetch(getChunksPublicUrl('wilayah_manifest.json', targetBucket));
        if (!response.ok && selectedKabupaten === '3510') {
          response = await fetch(getChunksPublicUrl('wilayah_manifest.json', 'spatial-chunks'));
        }
        if (!response.ok) throw new Error(`Gagal mengambil manifest wilayah untuk ${region.name}`);
        const data = await response.json();
        setWilayahManifest(data);
      } catch (err: any) {
        console.error("[SpatialData] Gagal load wilayah manifest:", err);
      } finally {
        setIsLoadingManifest(false);
      }
    }
    loadManifest();
  }, [selectedKabupaten, activeDatasetVersion]);

  // 2. Outline kabupaten
  useEffect(() => {
    async function loadKab() {
      try {
        if (selectedKabupaten === '3515') {
          const res = await fetch('/data/peta-kabupaten-sidoarjo.geojson');
          if (res.ok) {
            const geojson = await res.json();
            setDataKab(geojson);
            return;
          }
        }
        const kabUrl = getDataPublicUrl('peta-kabupaten-banyuwangi.geojson');
        const response = await fetch(kabUrl);
        if (response.ok) {
          const geojson = await response.json();
          setDataKab(geojson);
        }
      } catch (err) {
        console.error("Gagal load peta kabupaten:", err);
      }
    }
    loadKab();
  }, [selectedKabupaten]);

  // 2b. Outline desa
  useEffect(() => {
    async function loadDesa() {
      try {
        const regionFile = selectedKabupaten === '3515' ? '/data/sidoarjo-regions.json' : '/data/regions.json';
        const response = await fetch(regionFile);
        if (response.ok) {
          const geojson = await response.json();
          setDataDesa(geojson);
        }
      } catch (err) {
        console.error("Gagal load peta desa regions:", err);
      }
    }
    loadDesa();
  }, [selectedKabupaten]);

  // 3. Penugasan user
  useEffect(() => {
    async function loadAssignments() {
      if (!profile) { setIsLoadingAssignments(false); return; }
      if (profile.role === 'admin') { setIsLoadingAssignments(false); return; }

      try {
        setIsLoadingAssignments(true);
        const { data, error: err } = await supabase
          .from('assignments')
          .select('idkec, iddesa')
          .eq('user_id', profile.id);

        if (err) throw err;

        const userAssignments = data || [];
        setAssignments(userAssignments);

        const assignedKecs = Array.from(
          new Set(userAssignments.map((a: any) => a.idkec).filter(Boolean))
        ) as string[];

        if (assignedKecs.length > 0) {
          const activeKec = useMapStore.getState().filterKecamatan;
          if (activeKec === 'Semua' || activeKec === null || !assignedKecs.includes(activeKec)) {
            setFilter('filterKecamatan', assignedKecs[0]);
          }
        }
      } catch (err) {
        console.error("Gagal load assignments user:", err);
      } finally {
        setIsLoadingAssignments(false);
      }
    }
    loadAssignments();
  }, [profile]);

  // 4. Fetch data per kecamatan (dengan caching)
  useEffect(() => {
    if (!filterKecamatan || filterKecamatan === 'Semua') {
      setDataUsaha([]);
      setDataUsahaDigital([]);
      setDataUsahaPertanian([]);
      setDataRumahTangga([]);
      setDataBangunan([]);
      setDataSls(null);
      setIsLoading(false);
      return;
    }

    async function loadKecamatanData() {
      const kecId = filterKecamatan as string;
      const cacheKey = `${selectedKabupaten}_${activeDatasetVersion}_${kecId}`;
      setIsLoading(true);

      if (cache.current[cacheKey]) {
        const cached = cache.current[cacheKey];
        setDataUsaha(cached.usaha);
        setDataUsahaDigital(cached.usahaDigital);
        setDataUsahaPertanian(cached.usahaPertanian);
        setDataRumahTangga(cached.rumahTangga);
        setDataBangunan(cached.bangunan);
        setDataSls(cached.sls);
        setIsLoading(false);
        return;
      }

      try {
        setError(null);

        const primaryBucket = selectedKabupaten === '3515'
          ? 'spatial-chunks-sidoarjo'
          : (activeDatasetVersion === 'se2026' ? 'spatial-chunks-se2026' : 'spatial-chunks');

        const fetchChunkSafe = async (dataset: string) => {
          try {
            const path = `${dataset}/kec_${kecId}.json`;
            let res = await fetch(getChunksPublicUrl(path, primaryBucket));

            // Fallback khusus Banyuwangi jika belum ada di se2026
            if (!res.ok && selectedKabupaten === '3510' && activeDatasetVersion === 'se2026' && dataset === 'bangunan') {
              res = await fetch(getChunksPublicUrl(path, 'spatial-chunks'));
            }

            if (!res.ok) return [];
            const json = await res.json();
            return json.data || json || [];
          } catch (e) {
            console.error(`[ERROR] Gagal fetch ${dataset} chunk:`, e);
            return [];
          }
        };

        const fetchSlsChunkSafe = async () => {
          try {
            const path = `sls/kec_${kecId}.json`;
            let res = await fetch(getChunksPublicUrl(path, primaryBucket));

            if (!res.ok && selectedKabupaten === '3510' && activeDatasetVersion === 'se2026') {
              res = await fetch(getChunksPublicUrl(path, 'spatial-chunks'));
            }

            if (!res.ok) return null;
            return await res.json();
          } catch (e) {
            console.error(`[ERROR] Gagal fetch SLS chunk:`, e);
            return null;
          }
        };

        // Fetch semua dataset paralel
        const [usaha, usahaDigital, usahaPertanianRaw, rumahTangga, bangunan, sls] =
          await Promise.all([
            fetchChunkSafe('usaha'),
            fetchChunkSafe('usaha_digital'),
            fetchChunkSafe('usaha_pertanian'),
            fetchChunkSafe('rumah_tangga'),
            fetchChunkSafe('bangunan'),
            fetchSlsChunkSafe(),
          ]);

        // Spatial join — assign idsls_str ke setiap titik pertanian
        const usahaPertanian = assignSlsToPoints(usahaPertanianRaw, sls);



        // Simpan ke cache
        cache.current[cacheKey] = {
          usaha,
          usahaDigital,
          usahaPertanian,
          rumahTangga,
          bangunan,
          sls,
        };

        setDataUsaha(usaha);
        setDataUsahaDigital(usahaDigital);
        setDataUsahaPertanian(usahaPertanian);
        setDataRumahTangga(rumahTangga);
        setDataBangunan(bangunan);
        setDataSls(sls);

      } catch (err: any) {
        console.error(`Gagal load data kecamatan ${kecId}:`, err);
        setError(`Gagal memuat data spasial kecamatan: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    }

    loadKecamatanData();
  }, [filterKecamatan, activeDatasetVersion, selectedKabupaten]);

  return {
    dataUsaha,
    dataUsahaDigital,
    dataUsahaPertanian,
    dataRumahTangga,
    dataBangunan,
    dataSls,
    dataKab,
    dataDesa,
    isLoading,
    error,
    wilayahManifest,
    isLoadingManifest,
    assignments,
    isLoadingAssignments,
  };
}