import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useMapStore } from '@/store/mapStore';
import { useAuthStore } from '@/store/auth-store';

export function useSpatialData() {
  const [dataUsaha, setDataUsaha] = useState<any[]>([]);
  const [dataUsahaDigital, setDataUsahaDigital] = useState<any[]>([]);
  const [dataUsahaPertanian, setDataUsahaPertanian] = useState<any[]>([]);  // ← BARU
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
  const filterKecamatan = useMapStore((state) => state.filterKecamatan);
  const setFilter = useMapStore((state) => state.setFilter);

  // Cache kini menyimpan usahaPertanian juga
  const cache = useRef<Record<string, {
    usaha: any[];
    usahaDigital: any[];
    usahaPertanian: any[];          // ← BARU
    rumahTangga: any[];
    bangunan: any[];
    sls: any;
  }>>({});

  const getChunksPublicUrl = (path: string) => {
    const { data } = supabase.storage.from('spatial-chunks').getPublicUrl(path);
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
        const manifestUrl = getChunksPublicUrl('wilayah_manifest.json');
        const response = await fetch(manifestUrl);
        if (!response.ok) throw new Error("Gagal mengambil manifest wilayah");
        const data = await response.json();
        setWilayahManifest(data);
      } catch (err: any) {
        console.error("Gagal load wilayah manifest:", err);
      } finally {
        setIsLoadingManifest(false);
      }
    }
    loadManifest();
  }, []);

  // 2. Outline kabupaten
  useEffect(() => {
    async function loadKab() {
      try {
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
  }, []);

  // 2b. Outline desa
  useEffect(() => {
    async function loadDesa() {
      try {
        const response = await fetch('/data/regions.json');
        if (response.ok) {
          const geojson = await response.json();
          setDataDesa(geojson);
        }
      } catch (err) {
        console.error("Gagal load peta desa regions:", err);
      }
    }
    loadDesa();
  }, []);

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
          if (activeKec === 'Semua' || !assignedKecs.includes(activeKec)) {
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

  // 4. Fetch data per kecamatan (dengan caching) — termasuk usaha_pertanian
  useEffect(() => {
    if (filterKecamatan === 'Semua') {
      setDataUsaha([]);
      setDataUsahaDigital([]);
      setDataUsahaPertanian([]);      // ← BARU: kosongkan saat reset
      setDataRumahTangga([]);
      setDataBangunan([]);
      setDataSls(null);
      setIsLoading(false);
      return;
    }

    async function loadKecamatanData() {
      const kecId = filterKecamatan;
      setIsLoading(true);

      // Hit cache
      if (cache.current[kecId]) {
        const cached = cache.current[kecId];
        setDataUsaha(cached.usaha);
        setDataUsahaDigital(cached.usahaDigital);
        setDataUsahaPertanian(cached.usahaPertanian);  // ← BARU
        setDataRumahTangga(cached.rumahTangga);
        setDataBangunan(cached.bangunan);
        setDataSls(cached.sls);
        setIsLoading(false);
        return;
      }

      try {
        setError(null);

        const fetchChunkSafe = async (dataset: string) => {
          try {
            const url = getChunksPublicUrl(`${dataset}/kec_${kecId}.json`);
            const res = await fetch(url);
            if (!res.ok) return [];
            const json = await res.json();
            const finalData = json.data || json || [];

            if (finalData.length > 0) {
              console.log(`[DATA] ${dataset} kec ${kecId}: ${finalData.length} baris`);

              // Log detail struktur khusus untuk usaha_pertanian
              if (dataset === 'usaha_pertanian') {
                const sample = finalData[0];
                console.group('[USAHA PERTANIAN] Struktur kolom');
                console.log('Semua kolom:', Object.keys(sample));
                console.log('Contoh baris pertama:', sample);
                const kolomLat  = Object.keys(sample).find(k => ['lat final', 'latitude', 'lat'].includes(k.toLowerCase()));
                const kolomLon  = Object.keys(sample).find(k => ['long final', 'longitude', 'lon', 'long'].includes(k.toLowerCase()));
                const kolomNama = Object.keys(sample).find(k => ['nama final', 'nama', 'name'].includes(k.toLowerCase()));
                console.log('Kolom lat  :', kolomLat  ?? '❌ TIDAK DITEMUKAN');
                console.log('Kolom lon  :', kolomLon  ?? '❌ TIDAK DITEMUKAN');
                console.log('Kolom nama :', kolomNama ?? '❌ TIDAK DITEMUKAN');
                if (kolomLat)  console.log('Nilai lat  :', sample[kolomLat]);
                if (kolomLon)  console.log('Nilai lon  :', sample[kolomLon]);
                console.groupEnd();
              }
            }

            return finalData;
          } catch (e) {
            console.error(`[ERROR] Gagal fetch ${dataset} chunk:`, e);
            return [];
          }
        };

        const fetchSlsChunkSafe = async () => {
          try {
            const url = getChunksPublicUrl(`sls/kec_${kecId}.json`);
            const res = await fetch(url);
            if (!res.ok) return null;
            return await res.json();
          } catch (e) {
            console.error(`[ERROR] Gagal fetch SLS chunk:`, e);
            return null;
          }
        };

        // Fetch semua dataset paralel — usaha_pertanian ikut di sini
        const [usaha, usahaDigital, usahaPertanian, rumahTangga, bangunan, sls] =
          await Promise.all([
            fetchChunkSafe('usaha'),
            fetchChunkSafe('usaha_digital'),
            fetchChunkSafe('usaha_pertanian'),    // ← BARU
            fetchChunkSafe('rumah_tangga'),
            fetchChunkSafe('bangunan'),
            fetchSlsChunkSafe(),
          ]);

        // Simpan ke cache
        cache.current[kecId] = { usaha, usahaDigital, usahaPertanian, rumahTangga, bangunan, sls };

        setDataUsaha(usaha);
        setDataUsahaDigital(usahaDigital);
        setDataUsahaPertanian(usahaPertanian);    // ← BARU
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
  }, [filterKecamatan]);

  return {
    dataUsaha,
    dataUsahaDigital,
    dataUsahaPertanian,             // ← BARU: expose ke komponen
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