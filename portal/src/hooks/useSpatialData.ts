import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import initWasm, { readParquet } from 'parquet-wasm';
import wasmUrl from 'parquet-wasm/esm/parquet_wasm_bg.wasm?url';
import { tableFromIPC } from 'apache-arrow';

// Menyimpan status inisialisasi WASM agar tidak berulang
let wasmInitialized = false;

export function useSpatialData() {
  const [dataUsaha, setDataUsaha] = useState<any[]>([]);
  const [dataUsahaDigital, setDataUsahaDigital] = useState<any[]>([]);
  const [dataRumahTangga, setDataRumahTangga] = useState<any[]>([]);
  const [dataBangunan, setDataBangunan] = useState<any[]>([]);
  const [dataSls, setDataSls] = useState<any>(null); // GeoJSON
  const [dataKab, setDataKab] = useState<any>(null); // GeoJSON
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getPublicUrl = (filename: string) => {
    const { data } = supabase.storage.from('spatial-data').getPublicUrl(filename);
    return data.publicUrl;
  };

  const fetchAndParseParquet = async (filename: string) => {
    const url = getPublicUrl(filename);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Gagal fetch ${filename}`);
    
    const arrayBuffer = await response.arrayBuffer();
    const parquetUint8 = new Uint8Array(arrayBuffer);
    
    // Baca Parquet ke WASM memory
    const wasmTable = readParquet(parquetUint8);
    // Konversi ke format IPC Apache Arrow
    const ipcStream = wasmTable.intoIPCStream();
    // Parse IPC menggunakan apache-arrow JS
    const arrowTable = tableFromIPC(ipcStream);
    
    // Konversi Arrow Table menjadi Array of Objects (JSON)
    return arrowTable.toArray().map(row => row.toJSON());
  };

  const fetchGeoJson = async (filename: string) => {
    const url = getPublicUrl(filename);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Gagal fetch ${filename}`);
    return await response.json();
  };

  useEffect(() => {
    async function loadAllData() {
      try {
        setIsLoading(true);
        
        // 1. Inisialisasi WASM
        if (!wasmInitialized) {
          await initWasm(wasmUrl);
          wasmInitialized = true;
        }

        // 2. Fetch data secara paralel untuk mempercepat
        const [
          usaha,
          usahaDigital,
          rumahTangga,
          bangunan,
          slsGeoJson,
          kabGeoJson
        ] = await Promise.all([
          fetchAndParseParquet('data-usaha.parquet').catch(() => []),
          fetchAndParseParquet('data-usaha-digital.parquet').catch(() => []),
          fetchAndParseParquet('data-rumah-tangga.parquet').catch(() => []),
          fetchAndParseParquet('data-bangunan.parquet').catch(() => []),
          fetchGeoJson('sls-after-ea-sls-2024.json').catch(() => null),
          fetchGeoJson('peta-kabupaten-banyuwangi.geojson').catch(() => null)
        ]);

        setDataUsaha(usaha);
        setDataUsahaDigital(usahaDigital);
        setDataRumahTangga(rumahTangga);
        setDataBangunan(bangunan);
        setDataSls(slsGeoJson);
        setDataKab(kabGeoJson);
        
        setIsLoading(false);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Gagal memuat data spasial');
        setIsLoading(false);
      }
    }

    loadAllData();
  }, []);

  return {
    dataUsaha,
    dataUsahaDigital,
    dataRumahTangga,
    dataBangunan,
    dataSls,
    dataKab,
    isLoading,
    error
  };
}
