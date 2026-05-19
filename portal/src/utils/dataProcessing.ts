import { parse } from 'wellknown';

export function processSlsData(
  slsGeoJson: any,
  dataUsaha: any[],
  dataUsahaDigital: any[],
  dataRumahTangga: any[],
  dataBangunan: any[]
) {
  if (!slsGeoJson || !slsGeoJson.features) return null;

  // 1. Hitung jumlah usaha per SLS
  const usahaCount = dataUsaha.reduce((acc, curr) => {
    const idsls = curr['idsls_str'] || curr['idsls final'];
    if (idsls) {
      acc[idsls] = (acc[idsls] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  // 2. Hitung jumlah usaha digital per SLS
  const usahaDigitalCount = dataUsahaDigital.reduce((acc, curr) => {
    const idsls = curr['idsls_str'] || curr['idsls final'];
    if (idsls) {
      acc[idsls] = (acc[idsls] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  // 3. Hitung jumlah keluarga per SLS
  const keluargaCount = dataRumahTangga.reduce((acc, curr) => {
    const idsls = curr['idsls_str'] || curr['idsls final'];
    if (idsls) {
      acc[idsls] = (acc[idsls] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  // 4. Hitung statistik bangunan per SLS
  const bangunanStats = dataBangunan.reduce((acc, curr) => {
    const idsls = curr['idsls_str'] || curr['idsls final'];
    const status = curr['status_bangunan'];
    
    if (idsls) {
      if (!acc[idsls]) {
        acc[idsls] = { 
          'Bangunan Usaha': 0, 
          'Rumah Tangga': 0, 
          'Belum Terdata': 0 
        };
      }
      if (status === 'Bangunan Usaha' || status === 'Rumah Tangga' || status === 'Belum Terdata') {
        acc[idsls][status]++;
      }
    }
    return acc;
  }, {} as Record<string, Record<string, number>>);

  // Clone features untuk menghindari mutasi aslinya
  const features = slsGeoJson.features.map((feature: any) => {
    // Sesuaikan dengan nama kolom ID di GeoJSON
    const idslsRaw = feature.properties.idsls || feature.properties.id_sls || feature.properties.IDSLS || feature.properties.kode_sls;
    
    // Normalisasi ID SLS (menghapus ".0" di belakang jika ada)
    let idslsStr = String(idslsRaw).trim();
    if (idslsStr.endsWith('.0')) {
      idslsStr = idslsStr.slice(0, -2);
    }

    const bStats = bangunanStats[idslsStr] || { 'Bangunan Usaha': 0, 'Rumah Tangga': 0, 'Belum Terdata': 0 };
    const sudahTerdata = bStats['Bangunan Usaha'] + bStats['Rumah Tangga'];
    const belumTerdata = bStats['Belum Terdata'];
    const totalBangunan = sudahTerdata + belumTerdata;

    return {
      ...feature,
      properties: {
        ...feature.properties,
        idsls_str: idslsStr,
        jumlah_usaha: usahaCount[idslsStr] || 0,
        jumlah_usaha_digital: usahaDigitalCount[idslsStr] || 0,
        jumlah_keluarga: keluargaCount[idslsStr] || 0,
        sudah_terdata: sudahTerdata,
        belum_terdata: belumTerdata,
        total_bangunan: totalBangunan
      }
    };
  });

  return {
    ...slsGeoJson,
    features
  };
}

export function convertBangunanToGeoJson(dataBangunan: any[]) {
  const features = dataBangunan.reduce((acc, row) => {
    // Parquet file memiliki WKT di kolom geometry / geom
    const geomStr = row.geometry || row.geom;
    if (!geomStr) return acc;

    let geometry = null;
    try {
      geometry = parse(geomStr);
    } catch (e) {
      console.warn("Gagal parse WKT:", geomStr);
    }

    if (geometry) {
      acc.push({
        type: "Feature",
        geometry,
        properties: {
          ...row
        }
      });
    }
    return acc;
  }, [] as any[]);

  return {
    type: "FeatureCollection",
    features
  };
}

export function convertTitikToGeoJson(data: any[]) {
  const features = data.reduce((acc, row) => {
    // Extract lat dan long final dari raw parquet string/float
    const lat = parseFloat(row['lat final'] || row.lat);
    const lng = parseFloat(row['long final'] || row['long'] || row.lon);
    
    if (!isNaN(lat) && !isNaN(lng)) {
      acc.push({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [lng, lat]
        },
        properties: {
          ...row
        }
      });
    }
    return acc;
  }, [] as any[]);

  return {
    type: "FeatureCollection",
    features
  };
}

export function calculateBbox(geoJson: any): [number, number, number, number] | null {
  if (!geoJson || !geoJson.features || geoJson.features.length === 0) return null;
  
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  const extractCoords = (coords: any[]) => {
    if (typeof coords[0] === 'number') {
      const [x, y] = coords;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    } else {
      coords.forEach(extractCoords);
    }
  };

  geoJson.features.forEach((f: any) => {
    if (f.geometry && f.geometry.coordinates) {
      extractCoords(f.geometry.coordinates);
    }
  });

  if (minX === Infinity) return null;
  return [minX, minY, maxX, maxY];
}
