/**
 * clusterDetector.ts
 *
 * Mesin deteksi pengelompokan spasial (Spatial Clustering Engine)
 * Mengadopsi algoritma DBSCAN (Density-Based Spatial Clustering of Applications with Noise)
 * yang bersesuaian dengan logika cluster-rev2.py:
 *
 * - EPS_METERS: 5 meter (radius jarak maksimum antar titik)
 * - MIN_SAMPLES: 5 titik (minimal jumlah titik berjarak <= 5m untuk membentuk 1 cluster)
 * - MIN_CLUSTER_PERCENT: 0.20 (ambang batas 20% titik masuk cluster agar SLS berstatus BERGEROMBOL)
 */

export interface RawSpatialPoint {
  id?: string;
  id_bangunan?: string;
  id_usaha?: string;
  id_rt?: string;
  assignment_id?: string;
  idsls_str?: string;
  idsls?: string;
  nama?: string;
  nama_usaha?: string;
  nama_krt?: string;
  kategori?: string;
  status?: string;
  status_bangunan?: string;
  alamat?: string;
  geotag_latitude?: number | string;
  geotag_longitude?: number | string;
  latitude?: number | string;
  longitude?: number | string;
  lat?: number | string;
  lon?: number | string;
  long?: number | string;
  [key: string]: any;
}

export interface ClusterPointItem {
  id: string;
  lng: number;
  lat: number;
  name: string;
  category: string;
  address: string;
  status: string;
  slsId: string;
  clusterId: number; // -1 = noise/menyebar, >= 0 = anggota cluster ke-X
  raw: RawSpatialPoint;
}

export interface ClusterGroup {
  clusterId: number;
  slsId: string;
  centroid: [number, number]; // [lng, lat]
  pointCount: number;
  points: ClusterPointItem[];
}

export interface SlsClusterSummary {
  idsls: string;
  slsName: string;
  desaName: string;
  kecName: string;
  dusunName?: string;
  rtRw?: string;
  jumlahTitik: number;
  jumlahCluster: number;
  titikBergerombol: number;
  titikNoise: number;
  persenBergerombol: number; // e.g. 25.5 (%)
  clusterTerbesar: number;
  status: 'BERGEROMBOL' | 'MENYEBAR';
  clusters: ClusterGroup[];
}

export interface ClusterAnalysisOptions {
  epsMeters?: number;        // Default 5 meter
  minSamples?: number;       // Default 5 titik
  minClusterPercent?: number; // Default 0.20 (20%)
}

/**
 * Ekstraksi koordinat valid [lng, lat] dari suatu objek titik spasial
 */
export function extractPointCoordinates(p: RawSpatialPoint): [number, number] | null {
  if (!p) return null;
  const rawLng = p['long final'] ?? p.longitude ?? p.geotag_longitude ?? p.lon ?? p.long ?? p.lng;
  const rawLat = p['lat final'] ?? p.latitude ?? p.geotag_latitude ?? p.lat;

  const lng = typeof rawLng === 'number' ? rawLng : parseFloat(String(rawLng || ''));
  const lat = typeof rawLat === 'number' ? rawLat : parseFloat(String(rawLat || ''));

  if (isNaN(lng) || isNaN(lat) || lng === 0 || lat === 0) return null;
  // Validasi batas wilayah Indonesia (lng ~ 95..141, lat ~ -11..6)
  if (lng < 90 || lng > 145 || lat < -12 || lat > 10) return null;

  return [lng, lat];
}

/**
 * Menghitung jarak Euclidean dalam meter dengan koreksi cosinus garis lintang (Flat-Earth Equirectangular)
 * Akurasi sub-sentimeter untuk jarak di bawah beberapa ratus meter, dan sangat cepat (nanodetik).
 */
export function calculateDistanceMeters(
  lng1: number,
  lat1: number,
  lng2: number,
  lat2: number,
  cosLat: number
): number {
  const dx = (lng2 - lng1) * 111320 * cosLat;
  const dy = (lat2 - lat1) * 111320;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Algoritma DBSCAN untuk satu himpunan titik koordinat
 * Mengembalikan array clusterId (-1 jika noise, 0, 1, 2... jika anggota cluster)
 */
export function runDbscan(
  coords: [number, number][],
  epsMeters: number = 5,
  minSamples: number = 5
): number[] {
  const n = coords.length;
  const labels = new Array<number>(n).fill(-1);
  if (n < minSamples) return labels;

  // Hitung rata-rata latitude untuk koreksi cosinus
  let sumLat = 0;
  for (let i = 0; i < n; i++) sumLat += coords[i][1];
  const meanLatRad = ((sumLat / n) * Math.PI) / 180;
  const cosLat = Math.cos(meanLatRad);

  // Precompute tetangga (neighbor query)
  const neighbors: number[][] = new Array(n);
  for (let i = 0; i < n; i++) {
    neighbors[i] = [];
  }

  for (let i = 0; i < n; i++) {
    const [lng1, lat1] = coords[i];
    neighbors[i].push(i); // diri sendiri
    for (let j = i + 1; j < n; j++) {
      const [lng2, lat2] = coords[j];
      const dist = calculateDistanceMeters(lng1, lat1, lng2, lat2, cosLat);
      if (dist <= epsMeters) {
        neighbors[i].push(j);
        neighbors[j].push(i);
      }
    }
  }

  let clusterId = 0;
  const visited = new Uint8Array(n);

  for (let i = 0; i < n; i++) {
    if (visited[i]) continue;
    visited[i] = 1;

    const currentNeighbors = neighbors[i];
    if (currentNeighbors.length < minSamples) {
      labels[i] = -1; // Noise sementara
      continue;
    }

    // Bentuk cluster baru
    labels[i] = clusterId;
    const queue: number[] = [...currentNeighbors];
    let head = 0;

    while (head < queue.length) {
      const neighborIdx = queue[head++];
      if (!visited[neighborIdx]) {
        visited[neighborIdx] = 1;
        const subNeighbors = neighbors[neighborIdx];
        if (subNeighbors.length >= minSamples) {
          // Tambahkan tetangga baru yang belum ada di antrean
          for (let k = 0; k < subNeighbors.length; k++) {
            const sn = subNeighbors[k];
            if (!queue.includes(sn)) {
              queue.push(sn);
            }
          }
        }
      }

      if (labels[neighborIdx] === -1) {
        labels[neighborIdx] = clusterId;
      }
    }

    clusterId++;
  }

  return labels;
}

/**
 * Menganalisis satu kelompok titik dalam 1 SLS
 * Menghasilkan ringkasan dan kelompok-kelompok cluster
 */
export function analyzeSlsCluster(
  slsId: string,
  rawPoints: RawSpatialPoint[],
  meta?: {
    slsName?: string;
    desaName?: string;
    kecName?: string;
    dusunName?: string;
    rtRw?: string;
  },
  options?: ClusterAnalysisOptions
): SlsClusterSummary {
  const epsMeters = options?.epsMeters ?? 5;
  const minSamples = options?.minSamples ?? 5;
  const minClusterPercent = options?.minClusterPercent ?? 0.20;

  const validItems: { point: RawSpatialPoint; coords: [number, number] }[] = [];
  for (const p of rawPoints) {
    const coords = extractPointCoordinates(p);
    if (coords) validItems.push({ point: p, coords });
  }

  const jumlahTitik = validItems.length;

  if (jumlahTitik < minSamples) {
    return {
      idsls: slsId,
      slsName: meta?.slsName || slsId,
      desaName: meta?.desaName || '',
      kecName: meta?.kecName || '',
      dusunName: meta?.dusunName || '',
      rtRw: meta?.rtRw || '',
      jumlahTitik,
      jumlahCluster: 0,
      titikBergerombol: 0,
      titikNoise: jumlahTitik,
      persenBergerombol: 0,
      clusterTerbesar: 0,
      status: 'MENYEBAR',
      clusters: [],
    };
  }

  const coordsList = validItems.map((item) => item.coords);
  const labels = runDbscan(coordsList, epsMeters, minSamples);

  // Petakan titik ke ClusterPointItem
  const clusterMap: Map<number, ClusterPointItem[]> = new Map();
  let titikBergerombol = 0;

  validItems.forEach((item, idx) => {
    const cid = labels[idx];
    const p = item.point;
    const ptItem: ClusterPointItem = {
      id: String(
        p.id ||
        p.id_bangunan ||
        p.id_usaha ||
        p.id_rt ||
        p.assignment_id ||
        `${slsId}-${idx}`
      ),
      lng: item.coords[0],
      lat: item.coords[1],
      name: String(
        p.nama ||
        p.nama_usaha ||
        p.nama_krt ||
        p.nama_bangunan ||
        'Bangunan'
      ),
      category: String(
        p.kategori ||
        p.status_bangunan ||
        p.status ||
        'Entitas Spasial'
      ),
      address: String(p.alamat || p.alamat_usaha || '-'),
      status: String(p.status || p.status_bangunan || '-'),
      slsId,
      clusterId: cid,
      raw: p,
    };

    if (cid >= 0) {
      titikBergerombol++;
      if (!clusterMap.has(cid)) {
        clusterMap.set(cid, []);
      }
      clusterMap.get(cid)!.push(ptItem);
    }
  });

  const jumlahCluster = clusterMap.size;
  const titikNoise = jumlahTitik - titikBergerombol;
  const persenBergerombol =
    jumlahTitik > 0
      ? Math.round((titikBergerombol / jumlahTitik) * 10000) / 100
      : 0;

  // Bangun daftar ClusterGroup dengan centroid
  const clusters: ClusterGroup[] = [];
  let clusterTerbesar = 0;

  clusterMap.forEach((points, cid) => {
    if (points.length > clusterTerbesar) {
      clusterTerbesar = points.length;
    }
    let sumLng = 0;
    let sumLat = 0;
    points.forEach((pt) => {
      sumLng += pt.lng;
      sumLat += pt.lat;
    });
    clusters.push({
      clusterId: cid,
      slsId,
      centroid: [sumLng / points.length, sumLat / points.length],
      pointCount: points.length,
      points,
    });
  });

  // Urutkan kluster dari yang paling banyak titiknya
  clusters.sort((a, b) => b.pointCount - a.pointCount);

  // Status BERGEROMBOL jika persen >= minClusterPercent (20%) dan ada minimal 1 cluster
  const status: 'BERGEROMBOL' | 'MENYEBAR' =
    jumlahCluster > 0 && persenBergerombol >= minClusterPercent * 100
      ? 'BERGEROMBOL'
      : 'MENYEBAR';

  return {
    idsls: slsId,
    slsName: meta?.slsName || slsId,
    desaName: meta?.desaName || '',
    kecName: meta?.kecName || '',
    dusunName: meta?.dusunName || '',
    rtRw: meta?.rtRw || '',
    jumlahTitik,
    jumlahCluster,
    titikBergerombol,
    titikNoise,
    persenBergerombol,
    clusterTerbesar,
    status,
    clusters,
  };
}
