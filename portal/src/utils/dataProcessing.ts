import { parse } from 'wellknown';

export function processSlsData(
  slsGeoJson: any,
  dataUsaha: any[],
  dataUsahaDigital: any[],
  dataRumahTangga: any[],
  dataBangunan: any[],
  dataUsahaPertanian?: any[]
) {
  if (!slsGeoJson || !slsGeoJson.features) return null;

  const getSlsKey = (rawId: any): string => {
    if (!rawId) return '';
    let str = String(rawId).trim();
    if (str.endsWith('.0')) str = str.slice(0, -2);
    return str;
  };

  const registerCount = (acc: Record<string, number>, rawId: any) => {
    const key = getSlsKey(rawId);
    if (!key) return;
    acc[key] = (acc[key] || 0) + 1;
    if (key.length >= 14) {
      const key14 = key.substring(0, 14);
      if (key14 !== key) {
        acc[key14] = (acc[key14] || 0) + 1;
      }
    }
  };

  // 1. Hitung jumlah usaha biasa per SLS
  const usahaCount: Record<string, number> = {};
  dataUsaha.forEach((curr) => {
    registerCount(usahaCount, curr['idsls_str'] || curr['idsls final'] || curr['idsls']);
  });

  // 2. Hitung jumlah usaha digital per SLS
  const usahaDigitalCount: Record<string, number> = {};
  dataUsahaDigital.forEach((curr) => {
    registerCount(usahaDigitalCount, curr['idsls_str'] || curr['idsls final'] || curr['idsls']);
  });

  // 3. Hitung jumlah usaha pertanian per SLS
  const usahaPertanianCount: Record<string, number> = {};
  if (dataUsahaPertanian) {
    dataUsahaPertanian.forEach((curr) => {
      registerCount(usahaPertanianCount, curr['idsls_str'] || curr['idsls final'] || curr['idsls']);
    });
  }

  // 4. Hitung jumlah keluarga per SLS
  const keluargaCount: Record<string, number> = {};
  dataRumahTangga.forEach((curr) => {
    registerCount(keluargaCount, curr['idsls_str'] || curr['idsls final'] || curr['idsls']);
  });

  // 5. Hitung statistik bangunan per SLS
  const bangunanStats: Record<string, Record<string, number>> = {};
  dataBangunan.forEach((curr) => {
    const rawId = curr['idsls_str'] || curr['idsls final'] || curr['idsls'];
    const status = curr['status_bangunan'];
    const key = getSlsKey(rawId);
    if (!key) return;

    const addStat = (k: string) => {
      if (!bangunanStats[k]) {
        bangunanStats[k] = { 'Bangunan Usaha': 0, 'Rumah Tangga': 0, 'Belum Terdata': 0 };
      }
      if (status === 'Bangunan Usaha' || status === 'Rumah Tangga' || status === 'Belum Terdata') {
        bangunanStats[k][status]++;
      }
    };

    addStat(key);
    if (key.length >= 14) {
      const key14 = key.substring(0, 14);
      if (key14 !== key) addStat(key14);
    }
  });

  const features = slsGeoJson.features.map((feature: any) => {
    const idslsRaw = feature.properties.idsls || feature.properties.id_sls || feature.properties.IDSLS || feature.properties.kode_sls;
    
    const idslsStr = getSlsKey(idslsRaw);
    const idsls14 = idslsStr.length >= 14 ? idslsStr.substring(0, 14) : idslsStr;
    const iddesa = idslsStr.substring(0, 10);

    const bStats = bangunanStats[idslsStr] || bangunanStats[idsls14] || { 'Bangunan Usaha': 0, 'Rumah Tangga': 0, 'Belum Terdata': 0 };
    const sudahTerdata = (bStats['Bangunan Usaha'] || 0) + (bStats['Rumah Tangga'] || 0);
    const belumTerdata = bStats['Belum Terdata'] || 0;
    const totalBangunan = sudahTerdata + belumTerdata;

    const uCount = (usahaCount[idslsStr] !== undefined ? usahaCount[idslsStr] : usahaCount[idsls14]) || 0;
    const udCount = (usahaDigitalCount[idslsStr] !== undefined ? usahaDigitalCount[idslsStr] : usahaDigitalCount[idsls14]) || 0;
    const upCount = (usahaPertanianCount[idslsStr] !== undefined ? usahaPertanianCount[idslsStr] : usahaPertanianCount[idsls14]) || 0;
    const kCount = (keluargaCount[idslsStr] !== undefined ? keluargaCount[idslsStr] : keluargaCount[idsls14]) || 0;

    return {
      ...feature,
      properties: {
        ...feature.properties,
        idsls_str: idslsStr,
        iddesa: iddesa,
        jumlah_usaha: uCount,
        jumlah_usaha_digital: udCount,
        jumlah_usaha_pertanian: upCount,
        jumlah_keluarga: kCount,
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
    const lat = parseFloat(row['lat final'] || row.lat || row.LAT || row.latitude);
    const lng = parseFloat(row['long final'] || row['long'] || row.lon || row.LON || row.longitude);
    
    if (!isNaN(lat) && !isNaN(lng)) {
      const candidates = [
        row['nama_krt'],
        row['nama_kpl'],
        row['nama_kk'],
        row['nama_usaha'],
        row['Nama usaha'],
        row['Nama Usaha'],
        row['nama_usaha_edit'],
        row['nama_komersial'],
        row['nama final'],
        row['nama_final'],
        row['nm_project'],
        row['nama'],
        row['Nama'],
      ].filter(Boolean);

      // Prefer non-purely-numeric name string if available
      const nonNumericCandidate = candidates.find((c) => isNaN(Number(c)));
      const namaVal = nonNumericCandidate || candidates[0] || null;

      const alamatVal =
        row['alamat final'] ||
        row['alamat_final'] ||
        row['Alamat'] ||
        row['alamat'] ||
        row['Alamat final'] ||
        row['deskripsi_project'] ||
        row['alamat_project'] ||
        null;

      acc.push({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [lng, lat]
        },
        properties: {
          ...row,
          // Normalize spaced-key fields menjadi underscore alias
          // agar bisa diakses dari MapLibre GL properties tanpa masalah
          alamat_final: alamatVal,
          nama_final: namaVal,
          idsls_final: row['idsls final'] || row['idsls_str'] || row['idsls'] || null,
          lat_final: lat,
          long_final: lng,
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

// Point-in-polygon check menggunakan ray casting algorithm
export function isPointInPolygon(point: [number, number], polygon: number[][]): boolean {
  const [px, py] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const intersect =
      yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function getPolygonRings(geometry: any): number[][][] {
  if (!geometry) return [];
  if (geometry.type === 'Polygon') {
    return [geometry.coordinates[0]];
  }
  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.map((poly: number[][][]) => poly[0]);
  }
  return [];
}

export function assignSlsToPoints(points: any[], slsGeoJson: any): any[] {
  if (!slsGeoJson || !slsGeoJson.features || !points.length) return points;

  // Build lookup: per feature simpan idsls_str + rings-nya
  const slsFeatures = slsGeoJson.features.map((f: any) => {
    const idslsRaw =
      f.properties.idsls ||
      f.properties.id_sls ||
      f.properties.IDSLS ||
      f.properties.kode_sls;
    let idslsStr = String(idslsRaw).trim();
    if (idslsStr.endsWith('.0')) idslsStr = idslsStr.slice(0, -2);
    return {
      idsls_str: idslsStr,
      rings: getPolygonRings(f.geometry),
    };
  });

  return points.map((point) => {
    const lat = parseFloat(point['lat final'] || point.lat || point.latitude);
    const lng = parseFloat(point['long final'] || point['long'] || point.lon || point.longitude);

    if (isNaN(lat) || isNaN(lng)) return point;

    // Cari SLS yang contain titik ini
    let foundSls: string | null = null;
    for (const sls of slsFeatures) {
      for (const ring of sls.rings) {
        if (isPointInPolygon([lng, lat], ring)) {
          foundSls = sls.idsls_str;
          break;
        }
      }
      if (foundSls) break;
    }

    return {
      ...point,
      idsls_str: foundSls || point.idsls_str || null,
    };
  });
}

export function generateSyntheticBuildingForPoint(
  lat: number,
  lng: number,
  sizeMeters = 6
): any {
  // 1 meter ≈ 0.000009 derajat koordinat GPS
  const halfDegrees = (sizeMeters / 2) * 0.000009;

  const minLng = lng - halfDegrees;
  const maxLng = lng + halfDegrees;
  const minLat = lat - halfDegrees;
  const maxLat = lat + halfDegrees;

  return {
    type: "Polygon",
    coordinates: [
      [
        [minLng, minLat],
        [maxLng, minLat],
        [maxLng, maxLat],
        [minLng, maxLat],
        [minLng, minLat],
      ],
    ],
  };
}