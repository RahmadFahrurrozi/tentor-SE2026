import { parse } from 'wellknown';

export function processSlsData(
  slsGeoJson: any,
  dataUsaha: any[],
  dataUsahaDigital: any[],
  dataRumahTangga: any[],
  dataBangunan: any[],
  dataUsahaPertanian?: any[],
  dataBangunanLainnya?: any[]
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
  (dataUsaha || []).forEach((curr) => {
    registerCount(usahaCount, curr['idsls_str'] || curr['idsls final'] || curr['idsls']);
  });

  // 2. Hitung jumlah usaha digital per SLS
  const usahaDigitalCount: Record<string, number> = {};
  (dataUsahaDigital || []).forEach((curr) => {
    registerCount(usahaDigitalCount, curr['idsls_str'] || curr['idsls final'] || curr['idsls']);
  });

  // 3. Hitung jumlah usaha pertanian per SLS
  const usahaPertanianCount: Record<string, number> = {};
  if (dataUsahaPertanian) {
    (dataUsahaPertanian || []).forEach((curr) => {
      registerCount(usahaPertanianCount, curr['idsls_str'] || curr['idsls final'] || curr['idsls']);
    });
  }

  // 4. Hitung jumlah keluarga per SLS
  const keluargaCount: Record<string, number> = {};
  (dataRumahTangga || []).forEach((curr) => {
    registerCount(keluargaCount, curr['idsls_str'] || curr['idsls final'] || curr['idsls']);
  });

  // 5. Hitung statistik bangunan fisik per SLS
  const bangunanStats: Record<string, { usaha: number; rt: number; belum: number; total: number; sudahLainnya: number }> = {};
  (dataBangunan || []).forEach((curr) => {
    const rawId = curr['idsls_str'] || curr['idsls final'] || curr['idsls'];
    const status = String(curr['status_bangunan'] || curr['status'] || '').trim();
    const statusLower = status.toLowerCase();
    const key = getSlsKey(rawId);
    if (!key) return;

    const isBelum =
      !status ||
      statusLower === 'belum terdata' ||
      statusLower === 'belum' ||
      statusLower === 'tidak' ||
      statusLower === '-';

    const isUsaha =
      statusLower.includes('usaha') ||
      statusLower.includes('toko') ||
      statusLower.includes('warung') ||
      statusLower.includes('kios');

    const isRt =
      statusLower.includes('rumah') ||
      statusLower.includes('keluarga') ||
      statusLower.includes('tinggal');

    const addStat = (k: string) => {
      if (!bangunanStats[k]) {
        bangunanStats[k] = { usaha: 0, rt: 0, belum: 0, total: 0, sudahLainnya: 0 };
      }
      bangunanStats[k].total++;
      if (isBelum) {
        bangunanStats[k].belum++;
      } else if (isUsaha) {
        bangunanStats[k].usaha++;
      } else if (isRt) {
        bangunanStats[k].rt++;
      } else {
        // Campuran, Usaha Pertanian, Usaha Digital, Tempat Ibadah/Fasum terdata
        bangunanStats[k].sudahLainnya++;
      }
    };

    addStat(key);
    if (key.length >= 14) {
      const key14 = key.substring(0, 14);
      if (key14 !== key) addStat(key14);
    }
  });

  // 6. Hitung jumlah titik bangunan lainnya per SLS
  const bangunanLainnyaCount: Record<string, number> = {};
  if (dataBangunanLainnya) {
    dataBangunanLainnya.forEach((curr) => {
      registerCount(bangunanLainnyaCount, curr['idsls_str'] || curr['idsls final'] || curr['idsls']);
    });
  }

  const features = slsGeoJson.features.map((feature: any) => {
    const props = feature?.properties || {};
    const idslsRaw = props.idsls || props.id_sls || props.IDSLS || props.kode_sls;
    
    const idslsStr = getSlsKey(idslsRaw);
    const idsls14 = idslsStr.length >= 14 ? idslsStr.substring(0, 14) : idslsStr;
    const iddesa = idslsStr.substring(0, 10);

    const bStats = bangunanStats[idslsStr] || bangunanStats[idsls14] || { usaha: 0, rt: 0, belum: 0, total: 0, sudahLainnya: 0 };
    const bLainnya = (bangunanLainnyaCount[idslsStr] !== undefined ? bangunanLainnyaCount[idslsStr] : bangunanLainnyaCount[idsls14]) || 0;

    const uCount = (usahaCount[idslsStr] !== undefined ? usahaCount[idslsStr] : usahaCount[idsls14]) || 0;
    const udCount = (usahaDigitalCount[idslsStr] !== undefined ? usahaDigitalCount[idslsStr] : usahaDigitalCount[idsls14]) || 0;
    const upCount = (usahaPertanianCount[idslsStr] !== undefined ? usahaPertanianCount[idslsStr] : usahaPertanianCount[idsls14]) || 0;
    const kCount = (keluargaCount[idslsStr] !== undefined ? keluargaCount[idslsStr] : keluargaCount[idsls14]) || 0;

    // Realisasi entitas yang berhasil disurvei petugas di SLS ini
    const totalEntitasLapangan = uCount + udCount + upCount + kCount + bLainnya;
    const fisikTerdata = bStats.usaha + bStats.rt + (bStats.sudahLainnya || 0);

    // Rumus Standar BPS:
    // Bangunan terdata adalah bangunan fisik yang teridentifikasi, atau minimal sejumlah entitas sensus riil yang dikunjungi di lapangan
    const sudahTerdata = Math.max(fisikTerdata, totalEntitasLapangan);
    let totalBangunan = Math.max(bStats.total, sudahTerdata);

    // Sisa bangunan yang benar-benar belum terdata (mengeliminasi bangunan non-target/gudang kosong)
    let belumTerdata = Math.max(0, bStats.belum - Math.max(0, sudahTerdata - fisikTerdata));
    if (bStats.total === 0) {
      belumTerdata = 0;
      totalBangunan = sudahTerdata;
    }

    if (bLainnya > 0 && belumTerdata > 0) {
      const tambahan = Math.min(belumTerdata, bLainnya);
      belumTerdata -= tambahan;
    }

    // Pastikan total bangunan sinkron: total = sudah + belum
    totalBangunan = sudahTerdata + belumTerdata;

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
        jumlah_bangunan_lainnya: bLainnya,
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
    } catch {
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

import { checkPointAnomaly, type SlsPolygonIndex, type SpatialAnomalyResult } from './spatialAnomalyDetector';

export function convertTitikToGeoJson(data: any[], slsIndex?: SlsPolygonIndex[]) {
  const features = data.reduce((acc, row) => {
    const lat = parseFloat(
      row['lat final'] ||
        row['lat_final'] ||
        row.lat ||
        row.LAT ||
        row.latitude ||
        row.y ||
        ''
    );
    const lng = parseFloat(
      row['long final'] ||
        row['long_final'] ||
        row['long'] ||
        row['lon'] ||
        row.LON ||
        row.longitude ||
        row.x ||
        ''
    );

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
        row['kategori_bangunan'],
        row['status_bangunan'],
        row['nm_project'],
        row['nama'],
        row['Nama'],
      ].filter(Boolean);

      const nonNumericCandidate = candidates.find((c) => isNaN(Number(c)));
      const namaVal = nonNumericCandidate || candidates[0] || null;

      const alamatVal =
        row['alamat final'] ||
        row['alamat_final'] ||
        row['level_6_name'] ||
        row['Alamat'] ||
        row['alamat'] ||
        row['Alamat final'] ||
        row['deskripsi_project'] ||
        row['alamat_project'] ||
        null;

      const recordedSls =
        row['idsls final'] || row['idsls_str'] || row['idsls'] || null;

      let anomalyInfo: SpatialAnomalyResult = {
        isAnomaly: false,
        anomalyType: 'valid',
        recordedSlsId: String(recordedSls || ''),
      };

      if (slsIndex && slsIndex.length > 0 && recordedSls) {
        anomalyInfo = checkPointAnomaly([lng, lat], recordedSls, slsIndex);
      }

      acc.push({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [lng, lat]
        },
        properties: {
          ...row,
          alamat_final: alamatVal,
          nama_final: namaVal,
          idsls_final: recordedSls,
          lat_final: lat,
          long_final: lng,
          is_anomaly: anomalyInfo.isAnomaly,
          anomaly_type: anomalyInfo.anomalyType,
          recorded_sls_id: anomalyInfo.recordedSlsId,
          recorded_sls_name: anomalyInfo.recordedSlsName,
          actual_sls_id: anomalyInfo.actualSlsId,
          actual_sls_name: anomalyInfo.actualSlsName,
          actual_desa_name: anomalyInfo.actualDesaName,
          recorded_centroid_lng: anomalyInfo.recordedSlsCentroid?.[0],
          recorded_centroid_lat: anomalyInfo.recordedSlsCentroid?.[1],
          deviation_distance_meters: anomalyInfo.deviationDistanceMeters,
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

  // Build lookup: per feature simpan idsls_str + rings + BBox
  const slsFeatures = slsGeoJson.features.map((f: any) => {
    const idslsRaw =
      f.properties?.idsls ||
      f.properties?.id_sls ||
      f.properties?.IDSLS ||
      f.properties?.kode_sls;
    let idslsStr = String(idslsRaw || '').trim();
    if (idslsStr.endsWith('.0')) idslsStr = idslsStr.slice(0, -2);

    const rings = getPolygonRings(f.geometry);
    let minLng = Infinity;
    let minLat = Infinity;
    let maxLng = -Infinity;
    let maxLat = -Infinity;

    for (let i = 0; i < rings.length; i++) {
      const ring = rings[i];
      for (let j = 0; j < ring.length; j++) {
        const pt = ring[j];
        if (pt[0] < minLng) minLng = pt[0];
        if (pt[0] > maxLng) maxLng = pt[0];
        if (pt[1] < minLat) minLat = pt[1];
        if (pt[1] > maxLat) maxLat = pt[1];
      }
    }

    return {
      idsls_str: idslsStr,
      rings,
      minLng,
      minLat,
      maxLng,
      maxLat,
    };
  });

  return points.map((point) => {
    const lat = parseFloat(point['lat final'] || point.lat || point.latitude);
    const lng = parseFloat(point['long final'] || point['long'] || point.lon || point.longitude);

    if (isNaN(lat) || isNaN(lng)) return point;

    // Cari SLS yang contain titik ini dengan BBox pre-check
    let foundSls: string | null = null;
    for (let i = 0; i < slsFeatures.length; i++) {
      const sls = slsFeatures[i];
      // Lewati poligon jika titik berada di luar kotak pembatas BBox (skip 99% poligon seketika)
      if (lng < sls.minLng || lng > sls.maxLng || lat < sls.minLat || lat > sls.maxLat) {
        continue;
      }

      for (let j = 0; j < sls.rings.length; j++) {
        if (isPointInPolygon([lng, lat], sls.rings[j])) {
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