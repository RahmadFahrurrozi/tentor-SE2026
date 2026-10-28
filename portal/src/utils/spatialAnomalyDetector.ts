/**
 * spatialAnomalyDetector.ts
 *
 * Modul untuk mendeteksi titik hasil sensus/survei yang keluar dari batas
 * poligon SLS aslinya (Spatial Mismatch / Out-of-Bounds Detection)
 * dan memberikan rekomendasi SLS riil berdasarkan koordinat GPS.
 *
 * Desain bersih tanpa icon/emoji, berbasis tipografi teks profesional.
 */

export interface SlsPolygonIndex {
  idsls: string;
  nmsls: string;
  iddesa: string;
  nmdesa: string;
  bbox: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
  centroid: [number, number]; // [lng, lat]
  geometry: any;
}

export interface SpatialAnomalyResult {
  isAnomaly: boolean;
  anomalyType: 'mismatch_sls' | 'out_of_bounds' | 'valid';
  recordedSlsId: string;
  recordedSlsName?: string;
  actualSlsId?: string;
  actualSlsName?: string;
  actualDesaName?: string;
  deviationDistanceMeters?: number;
  actualSlsCentroid?: [number, number];
  recordedSlsCentroid?: [number, number];
}

/**
 * Algoritma Ray-Casting untuk memeriksa apakah titik [lng, lat]
 * berada di dalam ring poligon [ [lng, lat], ... ].
 */
export function isPointInPolygonRing(pt: [number, number], ring: [number, number][]): boolean {
  const [x, y] = pt;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Memeriksa apakah titik berada di dalam geometri Polygon atau MultiPolygon.
 */
export function isPointInGeometry(pt: [number, number], geometry: any): boolean {
  if (!geometry || !geometry.coordinates) return false;

  if (geometry.type === 'Polygon') {
    const rings = geometry.coordinates;
    if (!rings || rings.length === 0) return false;
    // Cek ring luar
    if (!isPointInPolygonRing(pt, rings[0])) return false;
    // Cek lubang dalam (holes)
    for (let i = 1; i < rings.length; i++) {
      if (isPointInPolygonRing(pt, rings[i])) return false;
    }
    return true;
  }

  if (geometry.type === 'MultiPolygon') {
    for (const poly of geometry.coordinates) {
      if (!poly || poly.length === 0) continue;
      if (isPointInPolygonRing(pt, poly[0])) {
        let inHole = false;
        for (let i = 1; i < poly.length; i++) {
          if (isPointInPolygonRing(pt, poly[i])) {
            inHole = true;
            break;
          }
        }
        if (!inHole) return true;
      }
    }
    return false;
  }

  return false;
}

/**
 * Menghitung Bounding Box dan Centroid sederhana dari geometri Polygon / MultiPolygon.
 */
function extractBBoxAndCentroid(geometry: any): {
  bbox: [number, number, number, number];
  centroid: [number, number];
} {
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  let sumLng = 0;
  let sumLat = 0;
  let pointCount = 0;

  const processRings = (rings: any[]) => {
    for (const ring of rings) {
      for (const coord of ring) {
        const [lng, lat] = coord;
        if (lng < minLng) minLng = lng;
        if (lat < minLat) minLat = lat;
        if (lng > maxLng) maxLng = lng;
        if (lat > maxLat) maxLat = lat;
        sumLng += lng;
        sumLat += lat;
        pointCount++;
      }
    }
  };

  if (geometry.type === 'Polygon') {
    processRings(geometry.coordinates);
  } else if (geometry.type === 'MultiPolygon') {
    for (const poly of geometry.coordinates) {
      processRings(poly);
    }
  }

  const centroid: [number, number] =
    pointCount > 0
      ? [sumLng / pointCount, sumLat / pointCount]
      : [minLng, minLat];

  return {
    bbox: [minLng, minLat, maxLng, maxLat],
    centroid,
  };
}

/**
 * Menghitung jarak perkiraan dalam meter antara dua koordinat (Haversine formula).
 */
export function calculateDistanceMeters(
  coord1: [number, number],
  coord2: [number, number]
): number {
  const [lon1, lat1] = coord1;
  const [lon2, lat2] = coord2;

  const R = 6371000; // Radius bumi dalam meter
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Normalisasi string ID SLS untuk perbandingan (menghilangkan trailing .0 dan spasi).
 */
export function normalizeSlsKey(rawId: any): string {
  if (!rawId) return '';
  let str = String(rawId).trim();
  if (str.endsWith('.0')) str = str.slice(0, -2);
  return str;
}

export type SlsIndexWithMap = SlsPolygonIndex[] & {
  _map?: Map<string, SlsPolygonIndex>;
};

/**
 * Membangun index spasial ringan untuk seluruh poligon SLS di kecamatan.
 */
export function buildSlsSpatialIndex(slsGeoJson: any): SlsPolygonIndex[] {
  if (!slsGeoJson || !slsGeoJson.features) return [];

  const indexList: SlsPolygonIndex[] = [];
  const mapLookup = new Map<string, SlsPolygonIndex>();

  for (const feat of slsGeoJson.features) {
    if (!feat.geometry) continue;
    const props = feat.properties || {};
    const idslsRaw =
      props.idsls || props.id_sls || props.IDSLS || props.idsls_str || props.kode_sls;
    const idsls = normalizeSlsKey(idslsRaw);
    if (!idsls) continue;

    const { bbox, centroid } = extractBBoxAndCentroid(feat.geometry);

    const item: SlsPolygonIndex = {
      idsls,
      nmsls: props.nmsls || props.nama_sls || props.sls_name || `SLS ${idsls}`,
      iddesa: normalizeSlsKey(props.iddesa || props.id_desa || idsls.substring(0, 10)),
      nmdesa: props.nmdesa || props.nama_desa || props.desa || '',
      bbox,
      centroid,
      geometry: feat.geometry,
    };

    indexList.push(item);
    mapLookup.set(idsls, item);
    if (idsls.length >= 14) {
      const id14 = idsls.substring(0, 14);
      if (!mapLookup.has(id14)) mapLookup.set(id14, item);
    }
  }

  (indexList as SlsIndexWithMap)._map = mapLookup;
  return indexList;
}

/**
 * Memeriksa satu titik terhadap index SLS dan mendeteksi apakah terjadi anomali.
 */
export function checkPointAnomaly(
  pt: [number, number],
  rawRecordedSls: any,
  slsIndex: SlsPolygonIndex[]
): SpatialAnomalyResult {
  const recordedSlsId = normalizeSlsKey(rawRecordedSls);
  const [lng, lat] = pt;

  // 1. Cari poligon SLS yang tercatat di kuesioner via O(1) Map Lookup
  const lookup = (slsIndex as SlsIndexWithMap)._map;
  let recordedSlsObj: SlsPolygonIndex | undefined;
  if (lookup) {
    recordedSlsObj = lookup.get(recordedSlsId);
    if (!recordedSlsObj && recordedSlsId.length >= 14) {
      recordedSlsObj = lookup.get(recordedSlsId.substring(0, 14));
    }
  } else {
    recordedSlsObj = slsIndex.find(
      (s) =>
        s.idsls === recordedSlsId ||
        (recordedSlsId.length >= 14 && s.idsls.substring(0, 14) === recordedSlsId.substring(0, 14))
    );
  }

  // 2. Cek apakah titik berada di dalam SLS yang tercatat
  if (recordedSlsObj) {
    const [minLng, minLat, maxLng, maxLat] = recordedSlsObj.bbox;
    // Cek BBox dulu agar efisien
    if (lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat) {
      if (isPointInGeometry(pt, recordedSlsObj.geometry)) {
        return {
          isAnomaly: false,
          anomalyType: 'valid',
          recordedSlsId,
          recordedSlsName: recordedSlsObj.nmsls,
          recordedSlsCentroid: recordedSlsObj.centroid,
          deviationDistanceMeters: 0,
        };
      }
    }
  }

  // 3. Jika titik TIDAK berada di dalam SLS tercatat, cari titik ini sebenarnya jatuh di poligon SLS mana
  let actualSls: SlsPolygonIndex | null = null;

  for (const s of slsIndex) {
    const [minLng, minLat, maxLng, maxLat] = s.bbox;
    if (lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat) {
      if (isPointInGeometry(pt, s.geometry)) {
        actualSls = s;
        break;
      }
    }
  }

  const recordedCentroid = recordedSlsObj?.centroid;
  const deviationDist = recordedCentroid
    ? calculateDistanceMeters(pt, recordedCentroid)
    : undefined;

  if (actualSls) {
    // Kasus 1: Titik jatuh di poligon SLS lain (Mismatch SLS)
    return {
      isAnomaly: true,
      anomalyType: 'mismatch_sls',
      recordedSlsId,
      recordedSlsName: recordedSlsObj?.nmsls || `SLS ${recordedSlsId}`,
      actualSlsId: actualSls.idsls,
      actualSlsName: actualSls.nmsls,
      actualDesaName: actualSls.nmdesa,
      actualSlsCentroid: actualSls.centroid,
      recordedSlsCentroid: recordedCentroid,
      deviationDistanceMeters: deviationDist,
    };
  }

  // Kasus 2: Titik jatuh di luar seluruh poligon SLS yang ada di wilayah
  return {
    isAnomaly: true,
    anomalyType: 'out_of_bounds',
    recordedSlsId,
    recordedSlsName: recordedSlsObj?.nmsls || `SLS ${recordedSlsId}`,
    actualSlsId: 'LUAR_BATAS',
    actualSlsName: 'Di luar batas wilayah SLS resmi',
    recordedSlsCentroid: recordedCentroid,
    deviationDistanceMeters: deviationDist,
  };
}
