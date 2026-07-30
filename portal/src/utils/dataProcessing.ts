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

  // 1. Hitung jumlah usaha biasa per SLS
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

  // 3. Hitung jumlah usaha pertanian per SLS (idsls_str)
  const usahaPertanianCount: Record<string, number> = {};
  if (dataUsahaPertanian) {
    dataUsahaPertanian.forEach((curr) => {
      const idsls = curr['idsls_str'] || curr['idsls final'] || curr['idsls'];
      if (idsls) {
        usahaPertanianCount[idsls] = (usahaPertanianCount[idsls] || 0) + 1;
      }
    });
  }

  // 4. Hitung jumlah keluarga per SLS
  const keluargaCount = dataRumahTangga.reduce((acc, curr) => {
    const idsls = curr['idsls_str'] || curr['idsls final'];
    if (idsls) {
      acc[idsls] = (acc[idsls] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  // 5. Hitung statistik bangunan per SLS
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

  const features = slsGeoJson.features.map((feature: any) => {
    const idslsRaw = feature.properties.idsls || feature.properties.id_sls || feature.properties.IDSLS || feature.properties.kode_sls;
    
    let idslsStr = String(idslsRaw).trim();
    if (idslsStr.endsWith('.0')) {
      idslsStr = idslsStr.slice(0, -2);
    }

    // FIX: ekstrak iddesa (10 digit) dari idsls_str untuk lookup pertanian
    const iddesa = idslsStr.substring(0, 10);

    const bStats = bangunanStats[idslsStr] || { 'Bangunan Usaha': 0, 'Rumah Tangga': 0, 'Belum Terdata': 0 };
    const sudahTerdata = bStats['Bangunan Usaha'] + bStats['Rumah Tangga'];
    const belumTerdata = bStats['Belum Terdata'];
    const totalBangunan = sudahTerdata + belumTerdata;

    return {
      ...feature,
      properties: {
        ...feature.properties,
        idsls_str: idslsStr,
        iddesa: iddesa,
        jumlah_usaha: usahaCount[idslsStr] || 0,
        jumlah_usaha_digital: usahaDigitalCount[idslsStr] || 0,
        jumlah_usaha_pertanian: usahaPertanianCount[idslsStr] || 0,
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