import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useMapStore } from '@/store/mapStore';
import { useAuthStore } from '@/store/auth-store';

export function useSpatialData() {
  const [dataUsaha, setDataUsaha] = useState<any[]>([]);
  const [dataUsahaDigital, setDataUsahaDigital] = useState<any[]>([]);
  const [dataRumahTangga, setDataRumahTangga] = useState<any[]>([]);
  const [dataBangunan, setDataBangunan] = useState<any[]>([]);
  const [dataSls, setDataSls] = useState<any>(null); // GeoJSON FeatureCollection
  const [dataKab, setDataKab] = useState<any>(null); // GeoJSON FeatureCollection
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Manifest wilayah
  const [wilayahManifest, setWilayahManifest] = useState<any>(null);
  const [isLoadingManifest, setIsLoadingManifest] = useState(true);

  // Penugasan user (untuk PML/PPL)
  const [assignments, setAssignments] = useState<{ idkec: string | null; iddesa: string | null }[]>([]);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(true);

  const { profile } = useAuthStore();
  const filterKecamatan = useMapStore((state) => state.filterKecamatan);
  const setFilter = useMapStore((state) => state.setFilter);

  // In-memory cache dictionary untuk menyimpan data kecamatan yang sudah di-fetch
  const cache = useRef<Record<string, {
    usaha: any[];
    usahaDigital: any[];
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

  // 1. Fetch wilayah_manifest.json saat hook di-mount
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

  // 2. Fetch outline kabupaten (peta-kabupaten-banyuwangi.geojson) saat hook di-mount
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

  // 3. Fetch Penugasan User & Auto-select assignment
  useEffect(() => {
    async function loadAssignments() {
      if (!profile) {
        setIsLoadingAssignments(false);
        return;
      }
      if (profile.role === 'admin') {
        setIsLoadingAssignments(false);
        return;
      }

      try {
        setIsLoadingAssignments(true);
        // Query tabel assignments untuk mendapatkan daftar tugas user ini
        const { data, error: err } = await supabase
          .from('assignments')
          .select('idkec, iddesa')
          .eq('user_id', profile.id);

        if (err) throw err;
        
        const userAssignments = data || [];
        setAssignments(userAssignments);

        // Cari daftar idkec unik dari tugas
        const assignedKecs = Array.from(
          new Set(userAssignments.map((a: any) => a.idkec).filter(Boolean))
        ) as string[];

        // Jika user dibatasi dan kecamatan filter saat ini adalah "Semua" atau di luar penugasan
        if (assignedKecs.length > 0) {
          const activeKec = useMapStore.getState().filterKecamatan;
          if (activeKec === 'Semua' || !assignedKecs.includes(activeKec)) {
            // Auto-select kecamatan pertama tugasnya
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

  // 4. Fetch data kecamatan terpilih secara dinamis (dengan caching)
  useEffect(() => {
    if (filterKecamatan === 'Semua') {
      // Kosongkan semua data detail saat reset ke Semua
      setDataUsaha([]);
      setDataUsahaDigital([]);
      setDataRumahTangga([]);
      setDataBangunan([]);
      setDataSls(null);
      setIsLoading(false);
      return;
    }

    async function loadKecamatanData() {
      const kecId = filterKecamatan;

      // Cek apakah data sudah ada di cache
      if (cache.current[kecId]) {
        const cached = cache.current[kecId];
        setDataUsaha(cached.usaha);
        setDataUsahaDigital(cached.usahaDigital);
        setDataRumahTangga(cached.rumahTangga);
        setDataBangunan(cached.bangunan);
        setDataSls(cached.sls);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Helper untuk fetch chunk aman (tidak crash jika 404/400/error jaringan)
        const fetchChunkSafe = async (dataset: string) => {
          try {
            const url = getChunksPublicUrl(`${dataset}/kec_${kecId}.json`);
            const res = await fetch(url);
            if (!res.ok) {
              console.warn(`[WARN] Chunks ${dataset} untuk kecamatan ${kecId} belum tersedia atau gagal dimuat: HTTP ${res.status}`);
              return [];
            }
            return await res.json();
          } catch (e) {
            console.error(`[ERROR] Gagal fetch ${dataset} chunk:`, e);
            return [];
          }
        };

        const fetchSlsChunkSafe = async () => {
          try {
            const url = getChunksPublicUrl(`sls/kec_${kecId}.json`);
            const res = await fetch(url);
            if (!res.ok) {
              console.warn(`[WARN] Chunks SLS untuk kecamatan ${kecId} belum tersedia atau gagal dimuat: HTTP ${res.status}`);
              return null;
            }
            return await res.json();
          } catch (e) {
            console.error(`[ERROR] Gagal fetch SLS chunk:`, e);
            return null;
          }
        };

        // Download semua chunk kecamatan ini secara paralel
        const [usaha, usahaDigital, rumahTangga, bangunan, sls] = await Promise.all([
          fetchChunkSafe('usaha'),
          fetchChunkSafe('usaha_digital'),
          fetchChunkSafe('rumah_tangga'),
          fetchChunkSafe('bangunan'),
          fetchSlsChunkSafe()
        ]);

        // Simpan ke cache
        cache.current[kecId] = { usaha, usahaDigital, rumahTangga, bangunan, sls };

        setDataUsaha(usaha);
        setDataUsahaDigital(usahaDigital);
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
    dataRumahTangga,
    dataBangunan,
    dataSls,
    dataKab,
    isLoading,
    error,
    wilayahManifest,
    isLoadingManifest,
    assignments,
    isLoadingAssignments
  };
}
