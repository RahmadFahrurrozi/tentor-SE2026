import { parse } from "wellknown";

export function processSlsData(
  slsGeoJson: any,
  dataUsaha: any[],
  dataUsahaDigital: any[],
  dataRumahTangga: any[],
  dataBangunan: any[],
  dataUsahaPertanian?: any[],
) {
  if (!slsGeoJson || !slsGeoJson.features) return null;

  const normalizeSlsId = (rawId: any): string => {
    if (!rawId) return "";
    return String(rawId).replace(/\.0$/, "").trim();
  };

  const buildSlsCountMap = (rows: any[]): Record<string, number> => {
    const acc: Record<string, number> = {};
    (rows || []).forEach((curr) => {
      const idsls = normalizeSlsId(
        curr["idsls_str"] || curr["idsls final"] || curr["idsls"],
      );
      if (!idsls) return;
      acc[idsls] = (acc[idsls] || 0) + 1;
      if (idsls.length > 14) {
        const idsls14 = idsls.substring(0, 14);
        acc[idsls14] = (acc[idsls14] || 0) + 1;
      }
    });
    return acc;
  };

  // 1. Hitung jumlah usaha biasa, usaha digital, pertanian, & keluarga per SLS
  const usahaCount = buildSlsCountMap(dataUsaha);
  const usahaDigitalCount = buildSlsCountMap(dataUsahaDigital);
  const usahaPertanianCount = buildSlsCountMap(dataUsahaPertanian || []);
  const keluargaCount = buildSlsCountMap(dataRumahTangga);

  // 5. Hitung statistik bangunan per SLS (jika dataBangunan tersedia)
  const bangunanStats: Record<string, Record<string, number>> = {};
  (dataBangunan || []).forEach((curr) => {
    const idsls = normalizeSlsId(
      curr["idsls_str"] || curr["idsls final"] || curr["idsls"],
    );
    const status = curr["status_bangunan"];
    if (!idsls) return;

    const keys = idsls.length > 14 ? [idsls, idsls.substring(0, 14)] : [idsls];
    keys.forEach((k) => {
      if (!bangunanStats[k]) {
        bangunanStats[k] = {
          "Bangunan Usaha": 0,
          "Rumah Tangga": 0,
          "Belum Terdata": 0,
        };
      }
      if (
        status === "Bangunan Usaha" ||
        status === "Rumah Tangga" ||
        status === "Belum Terdata"
      ) {
        bangunanStats[k][status]++;
      }
    });
  });

  const features = slsGeoJson.features.map((feature: any) => {
    const props = feature?.properties || {};
    const idslsRaw =
      props.idsls_str ||
      props.idsls ||
      props.id_sls ||
      props.IDSLS ||
      props.kode_sls;

    const idslsStr = normalizeSlsId(idslsRaw);
    const idsls14 =
      idslsStr.length >= 14 ? idslsStr.substring(0, 14) : idslsStr;
    const iddesa = idslsStr.length >= 10 ? idslsStr.substring(0, 10) : "";

    const uCount = usahaCount[idslsStr] ?? usahaCount[idsls14] ?? 0;
    const udCount =
      usahaDigitalCount[idslsStr] ?? usahaDigitalCount[idsls14] ?? 0;
    const upCount =
      usahaPertanianCount[idslsStr] ?? usahaPertanianCount[idsls14] ?? 0;
    const kCount = keluargaCount[idslsStr] ?? keluargaCount[idsls14] ?? 0;

    const bStats = bangunanStats[idslsStr] || bangunanStats[idsls14];
    const sudahTerdata = bStats
      ? bStats["Bangunan Usaha"] + bStats["Rumah Tangga"]
      : Number(props.sudah_terdata || 0);
    const belumTerdata = bStats
      ? bStats["Belum Terdata"]
      : Number(props.belum_terdata || 0);
    const totalBangunan = bStats
      ? sudahTerdata + belumTerdata
      : Number(props.total_bangunan || sudahTerdata + belumTerdata);

    return {
      ...feature,
      properties: {
        ...props,
        idsls_str: idslsStr,
        iddesa: iddesa,
        jumlah_usaha: uCount,
        jumlah_usaha_digital: udCount,
        jumlah_usaha_pertanian: upCount,
        jumlah_keluarga: kCount,
        sudah_terdata: sudahTerdata,
        belum_terdata: belumTerdata,
        total_bangunan: totalBangunan,
      },
    };
  });

  return {
    ...slsGeoJson,
    features,
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
          ...row,
        },
      });
    }
    return acc;
  }, [] as any[]);

  return {
    type: "FeatureCollection",
    features,
  };
}

export function convertTitikToGeoJson(data: any[]) {
  const features = data.reduce((acc, row) => {
    const lat = parseFloat(row["lat final"] || row.lat);
    const lng = parseFloat(row["long final"] || row["long"] || row.lon);

    if (!isNaN(lat) && !isNaN(lng)) {
      acc.push({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [lng, lat],
        },
        properties: {
          ...row,
        },
      });
    }
    return acc;
  }, [] as any[]);

  return {
    type: "FeatureCollection",
    features,
  };
}

export function calculateBbox(
  geoJson: any,
): [number, number, number, number] | null {
  if (!geoJson || !geoJson.features || geoJson.features.length === 0)
    return null;

  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;

  const extractCoords = (coords: any[]) => {
    if (typeof coords[0] === "number") {
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
function isPointInPolygon(
  point: [number, number],
  polygon: number[][],
): boolean {
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

function getPolygonRings(geometry: any): number[][][] {
  if (!geometry) return [];
  if (geometry.type === "Polygon") {
    return [geometry.coordinates[0]];
  }
  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.map((poly: number[][][]) => poly[0]);
  }
  return [];
}

export function assignSlsToPoints(points: any[], slsGeoJson: any): any[] {
  if (!slsGeoJson || !slsGeoJson.features || !points.length) return points;

  // Build lookup: per feature simpan idsls_str + rings + bounding box untuk pre-check cepat
  const slsFeatures = slsGeoJson.features.map((f: any) => {
    const idslsRaw =
      f.properties?.idsls_str ||
      f.properties?.idsls ||
      f.properties?.id_sls ||
      f.properties?.IDSLS ||
      f.properties?.kode_sls;
    let idslsStr = String(idslsRaw || "").trim();
    if (idslsStr.endsWith(".0")) idslsStr = idslsStr.slice(0, -2);

    const rings = getPolygonRings(f.geometry);
    let minLng = Infinity,
      minLat = Infinity,
      maxLng = -Infinity,
      maxLat = -Infinity;
    for (const ring of rings) {
      for (const pt of ring) {
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
    const lat = parseFloat(point["lat final"] || point.lat || point.latitude);
    const lng = parseFloat(
      point["long final"] || point["long"] || point.lon || point.longitude,
    );

    if (isNaN(lat) || isNaN(lng)) return point;

    let foundSls: string | null = null;
    for (const sls of slsFeatures) {
      if (
        lng < sls.minLng ||
        lng > sls.maxLng ||
        lat < sls.minLat ||
        lat > sls.maxLat
      ) {
        continue;
      }
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
