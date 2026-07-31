import { useState, useRef, useEffect, useMemo } from "react";
import { Map, MapControls } from "@/components/ui/map";
import maplibregl from "maplibre-gl";
import { AlertTriangle, BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";

import {
  processSlsData,
  convertBangunanToGeoJson,
  convertTitikToGeoJson,
  calculateBbox,
  generateSyntheticBuildingForPoint,
  isPointInPolygon,
  getPolygonRings,
} from "@/utils/dataProcessing";
import { useMapStore } from "@/store/mapStore";
import { useTheme } from "@/context/theme-provider";

const getGeometryCentroid = (geometry: any): [number, number] | null => {
  if (!geometry || !geometry.coordinates) return null;
  let sumX = 0,
    sumY = 0,
    count = 0;

  const processCoords = (coords: any[]) => {
    if (typeof coords[0] === "number") {
      sumX += coords[0];
      sumY += coords[1];
      count++;
    } else {
      coords.forEach(processCoords);
    }
  };

  processCoords(geometry.coordinates);
  if (count === 0) return null;
  return [sumX / count, sumY / count];
};

const getPointsNearBuilding = (
  buildingCoords: [number, number] | null,
  dataUsaha: any[],
  dataUsahaDigital: any[],
  dataRumahTangga: any[],
  maxDistance = 0.00025,
) => {
  if (!buildingCoords) return { usaha: [], rt: [], isMixed: false };

  const [bx, by] = buildingCoords;

  const nearUsaha = dataUsaha.filter((u) => {
    const ux = parseFloat(u["long final"] || u["long"] || u.lon);
    const uy = parseFloat(u["lat final"] || u.lat);
    if (isNaN(ux) || isNaN(uy)) return false;
    const dx = ux - bx,
      dy = uy - by;
    return dx * dx + dy * dy < maxDistance * maxDistance;
  });

  const nearUsahaDigital = dataUsahaDigital.filter((u) => {
    const ux = parseFloat(u["long final"] || u["long"] || u.lon);
    const uy = parseFloat(u["lat final"] || u.lat);
    if (isNaN(ux) || isNaN(uy)) return false;
    const dx = ux - bx,
      dy = uy - by;
    return dx * dx + dy * dy < maxDistance * maxDistance;
  });

  const nearRt = dataRumahTangga.filter((r) => {
    const rx = parseFloat(r["long final"] || r["long"] || r.lon);
    const ry = parseFloat(r["lat final"] || r.lat);
    if (isNaN(rx) || isNaN(ry)) return false;
    const dx = rx - bx,
      dy = ry - by;
    return dx * dx + dy * dy < maxDistance * maxDistance;
  });

  const totalUsaha = nearUsaha.length + nearUsahaDigital.length;
  const totalRt = nearRt.length;

  return {
    usaha: [...nearUsaha, ...nearUsahaDigital],
    rt: nearRt,
    isMixed: totalUsaha > 0 && totalRt > 0,
  };
};

import { Button } from "@/components/ui/button";

export function InteractiveMap({ spatialData }: { spatialData: any }) {
  const navigate = useNavigate();
  // const escapeHtml = (str: string) => {
  //   if (!str) return "";
  //   return str
  //     .replace(/&/g, "&amp;")
  //     .replace(/</g, "&lt;")
  //     .replace(/>/g, "&gt;")
  //     .replace(/"/g, "&quot;")
  //     .replace(/'/g, "&#39;");
  // };
  const mapRef = useRef<maplibregl.Map>(null);
  const store = useMapStore();
  const { theme } = useTheme();

  const activePopupRef = useRef<maplibregl.Popup | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const radarMarkerRef = useRef<maplibregl.Marker | null>(null);

  const [hoveredSlsId, setHoveredSlsId] = useState<string | null>(null);

  const {
    dataUsaha,
    dataUsahaDigital,
    dataUsahaPertanian,
    dataRumahTangga,
    dataBangunan,
    dataSls,
    dataKab,
    dataDesa,
    isLoading,
    error,
  } = spatialData;

  const [viewState, setViewState] = useState({
    center: [114.3692, -8.2192] as [number, number],
    zoom: 10,
    pitch: 45,
    bearing: 0,
  });

  const processedSls = useMemo(() => {
    if (!dataSls || isLoading) return null;
    return processSlsData(
      dataSls,
      dataUsaha,
      dataUsahaDigital,
      dataRumahTangga,
      dataBangunan,
      dataUsahaPertanian,
    );
  }, [
    dataSls,
    dataUsaha,
    dataUsahaDigital,
    dataRumahTangga,
    dataBangunan,
    dataUsahaPertanian,
    isLoading,
  ]);

  const filteredSls = useMemo(() => {
    if (!processedSls) return null;
    // Ketika filterKecamatan "Semua", kembalikan empty FeatureCollection
    // agar SLS layer bersih saat reset (bukan null, supaya source tetap di-update)
    if (!store.filterKecamatan || store.filterKecamatan === "Semua") {
      return { ...processedSls, features: [] };
    }
    // Filter berdasarkan kecamatan
    const byKec = processedSls.features.filter((f: any) => {
      const idslsStr = String(f.properties.idsls_str || "");
      const iddesa = f.properties.iddesa || idslsStr.substring(0, 10);
      const idkec =
        f.properties.idkec ||
        f.properties.id_kec ||
        idslsStr.substring(0, 7) ||
        String(iddesa).substring(0, 7);
      return String(idkec) === String(store.filterKecamatan);
    });
    if (store.filterDesa === "Semua" || !store.filterDesa) {
      return { ...processedSls, features: byKec };
    }
    return {
      ...processedSls,
      features: byKec.filter((f: any) => {
        const iddesa =
          f.properties.iddesa ||
          String(f.properties.idsls_str || "").substring(0, 10);
        return String(iddesa) === store.filterDesa;
      }),
    };
  }, [processedSls, store.filterKecamatan, store.filterDesa]);

  const geoJsonDesaBoundary = useMemo(() => {
    if (!dataDesa || store.filterKecamatan === "Semua") return null;
    const features = dataDesa.features.filter((f: any) => {
      const idkec =
        f.properties.idkec ||
        f.properties.id_kec ||
        String(f.properties.iddesa || "").substring(0, 7);
      return String(idkec) === store.filterKecamatan;
    });
    return { type: "FeatureCollection", features };
  }, [dataDesa, store.filterKecamatan]);

  const geoJsonDesaSelected = useMemo(() => {
    if (!dataDesa || store.filterDesa === "Semua") return null;
    const features = dataDesa.features.filter((f: any) => {
      const iddesa =
        f.properties.iddesa || f.properties.id_desa || f.properties.id;
      return String(iddesa) === store.filterDesa;
    });
    return { type: "FeatureCollection", features };
  }, [dataDesa, store.filterDesa]);

  const filterDataByDesaAndSearch = (data: any[], dataType?: string) => {
    if (!data || !data.length) return [];
    let filtered = data;

    if (store.filterDesa !== "Semua") {
      filtered = filtered.filter((row) => {
        let desaId = "";

        if (dataType === "pertanian") {
          desaId =
            row["iddesa"] ||
            row["id_desa"] ||
            row["desa_id"] ||
            row["kode_desa"] ||
            "";
        } else {
          desaId =
            row["idsls_str"] || row["idsls final"] || row["iddesa"] || "";
        }

        if (!desaId) {
          desaId = row["idsls_str"] || row["idsls final"] || "";
        }

        const idslsStr = String(desaId);
        return idslsStr.substring(0, 10) === store.filterDesa;
      });
    }

    if (store.filterNama && store.filterNama.trim() !== "") {
      const query = store.filterNama.toLowerCase().trim();
      filtered = filtered.filter((row) => {
        const nama = String(
          row["nama final"] ||
            row["nama_krt"] ||
            row["nama"] ||
            row["nama_kpl"] ||
            row["nm_project"] ||
            "",
        ).toLowerCase();
        const alamat = String(
          row["deskripsi_project"] ||
            row["alamat final"] ||
            row["alamat"] ||
            "",
        ).toLowerCase();
        const kategori = String(
          row["kategori"] ||
            row["jenis_rt"] ||
            row["tipe_landmark"] ||
            row["kategori_landmark"] ||
            "",
        ).toLowerCase();
        return (
          nama.includes(query) ||
          alamat.includes(query) ||
          kategori.includes(query)
        );
      });
    }

    return filtered;
  };

  const geoJsonBangunan = useMemo(() => {
    if (!dataBangunan.length || isLoading || store.filterKecamatan === "Semua")
      return null;

    const filteredBuildings =
      store.filterDesa === "Semua"
        ? dataBangunan
        : dataBangunan.filter((row: any) => {
            const idslsStr = String(
              row["idsls_str"] || row["idsls final"] || "",
            );
            return idslsStr.substring(0, 10) === store.filterDesa;
          });

    const geo = convertBangunanToGeoJson(filteredBuildings);

    const activeUsaha = filterDataByDesaAndSearch(dataUsaha);
    const activeUsahaDigital = filterDataByDesaAndSearch(dataUsahaDigital);
    const activeRt = filterDataByDesaAndSearch(dataRumahTangga);

    const usahaBySls: Record<string, any[]> = {};
    const rtBySls: Record<string, any[]> = {};

    activeUsaha.forEach((u) => {
      const sls = String(u["idsls_str"] || u["idsls final"] || "");
      if (!usahaBySls[sls]) usahaBySls[sls] = [];
      usahaBySls[sls].push(u);
    });

    activeUsahaDigital.forEach((u) => {
      const sls = String(u["idsls_str"] || u["idsls final"] || "");
      if (!usahaBySls[sls]) usahaBySls[sls] = [];
      usahaBySls[sls].push(u);
    });

    activeRt.forEach((r) => {
      const sls = String(r["idsls_str"] || r["idsls final"] || "");
      if (!rtBySls[sls]) rtBySls[sls] = [];
      rtBySls[sls].push(r);
    });

    geo.features = geo.features.map((feature: any) => {
      const sls = String(feature.properties?.idsls_str || "");
      const slsUsaha = usahaBySls[sls] || [];
      const slsRt = rtBySls[sls] || [];

      if (slsUsaha.length > 0 && slsRt.length > 0) {
        const centroid = getGeometryCentroid(feature.geometry);
        const nearInfo = getPointsNearBuilding(centroid, slsUsaha, [], slsRt);

        if (nearInfo.isMixed) {
          return {
            ...feature,
            properties: {
              ...feature.properties,
              is_mixed: true,
              status_bangunan: "Campuran",
              near_usaha: JSON.stringify(nearInfo.usaha),
              near_rt: JSON.stringify(nearInfo.rt),
            },
          };
        }
      }
      return feature;
    });

    // Generasi Bangunan Sintetis (6m x 6m) HANYA jika diaktifkan secara eksplisit (default: OFF)
    if (store.showSyntheticBuildings === true) {
      const existingBuildings = geo.features
        .map((f: any) => ({
          centroid: getGeometryCentroid(f.geometry),
          rings: getPolygonRings(f.geometry),
        }))
        .filter((b: any) => b.centroid || b.rings.length > 0);

      const activePertanian = filterDataByDesaAndSearch(
        dataUsahaPertanian,
        "pertanian",
      );

      const allActivePoints = [
        ...activeUsaha.map((p) => ({ ...p, _type: "Usaha Biasa" })),
        ...activeUsahaDigital.map((p) => ({ ...p, _type: "Usaha Digital" })),
        ...activePertanian.map((p) => ({ ...p, _type: "Usaha Pertanian" })),
        ...activeRt.map((p) => ({ ...p, _type: "Rumah Tangga" })),
      ];

      // Threshold: 0.0015 derajat (~150-200 meter). Selama ada bangunan fisik di area (jarak <= 150-200m), TIDAK AKAN generate sintetis!
      const maxDistSq = 0.0015 * 0.0015;

      allActivePoints.forEach((point: any, idx: number) => {
        const lat = parseFloat(
          point["lat final"] ||
            point.lat ||
            point.latitude ||
            point.lat_final ||
            point.y,
        );
        const lng = parseFloat(
          point["long final"] ||
            point["long"] ||
            point.lon ||
            point.longitude ||
            point.long_final ||
            point.x,
        );

        if (isNaN(lat) || isNaN(lng)) return;

        let isNearBuildingArea = false;

        for (const b of existingBuildings) {
          // 1. Cek apakah titik berada DI DALAM polygon bangunan fisik
          for (const ring of b.rings) {
            if (isPointInPolygon([lng, lat], ring)) {
              isNearBuildingArea = true;
              break;
            }
            // 2. Cek jarak titik ke setiap simpul/vertex polygon bangunan
            for (const [vx, vy] of ring) {
              const dx = lng - vx;
              const dy = lat - vy;
              if (dx * dx + dy * dy <= maxDistSq) {
                isNearBuildingArea = true;
                break;
              }
            }
            if (isNearBuildingArea) break;
          }
          if (isNearBuildingArea) break;

          // 3. Cek jarak titik ke centroid bangunan (fallback)
          if (b.centroid) {
            const dx = lng - b.centroid[0];
            const dy = lat - b.centroid[1];
            if (dx * dx + dy * dy <= maxDistSq) {
              isNearBuildingArea = true;
              break;
            }
          }
        }

        // HANYA jika BENAR-BENAR JAUH (>150-200m) dari semua bangunan fisik di area tersebut:
        if (!isNearBuildingArea) {
          const synthGeom = generateSyntheticBuildingForPoint(lat, lng, 6);
          const synthFeature = {
            type: "Feature",
            geometry: synthGeom,
            properties: {
              id_bangunan: `SYNTH_${point.id || idx}`,
              idsls_str: point.idsls_str || point["idsls final"] || "",
              status_bangunan:
                point._type === "Rumah Tangga"
                  ? "Rumah Tangga"
                  : "Bangunan Usaha",
              nama_bangunan: `Bangunan Sintetis (${point._type} 6m x 6m)`,
              is_synthetic: true,
              tinggi_bangunan: 1.8,
              ...point,
            },
          };
          geo.features.push(synthFeature);
        }
      });
    }

    return geo;
  }, [
    dataBangunan,
    dataUsaha,
    dataUsahaDigital,
    dataUsahaPertanian,
    dataRumahTangga,
    isLoading,
    store.filterDesa,
    store.filterNama,
    store.showSyntheticBuildings,
  ]);

  const geoJsonUsaha = useMemo(() => {
    if (!dataUsaha.length || isLoading || store.filterKecamatan === "Semua")
      return null;
    return convertTitikToGeoJson(filterDataByDesaAndSearch(dataUsaha));
  }, [
    dataUsaha,
    isLoading,
    store.filterKecamatan,
    store.filterDesa,
    store.filterNama,
  ]);

  const geoJsonUsahaDigital = useMemo(() => {
    if (
      !dataUsahaDigital.length ||
      isLoading ||
      store.filterKecamatan === "Semua"
    )
      return null;
    return convertTitikToGeoJson(filterDataByDesaAndSearch(dataUsahaDigital));
  }, [
    dataUsahaDigital,
    isLoading,
    store.filterKecamatan,
    store.filterDesa,
    store.filterNama,
  ]);

  const geoJsonUsahaPertanian = useMemo(() => {
    if (
      !dataUsahaPertanian?.length ||
      isLoading ||
      store.filterKecamatan === "Semua"
    )
      return null;
    return convertTitikToGeoJson(
      filterDataByDesaAndSearch(dataUsahaPertanian, "pertanian"),
    );
  }, [
    dataUsahaPertanian,
    isLoading,
    store.filterKecamatan,
    store.filterDesa,
    store.filterNama,
  ]);

  const geoJsonRt = useMemo(() => {
    if (
      !dataRumahTangga.length ||
      isLoading ||
      store.filterKecamatan === "Semua"
    )
      return null;
    return convertTitikToGeoJson(filterDataByDesaAndSearch(dataRumahTangga));
  }, [
    dataRumahTangga,
    isLoading,
    store.filterKecamatan,
    store.filterDesa,
    store.filterNama,
  ]);

  useEffect(() => {
    return () => {
      if (radarMarkerRef.current) {
        radarMarkerRef.current.remove();
      }
    };
  }, []);

  const updateTooltip = (e: any, layerId: string, properties: any) => {
    const tooltip = tooltipRef.current;
    if (!tooltip) return;

    const x = e.point.x + 15;
    const y = e.point.y + 15;
    tooltip.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    tooltip.style.display = "block";

    let html = "";
    if (layerId === "sls-fill-layer") {
      const idslsStr = String(properties.idsls_str || "");
      const idkec = properties.idkec || idslsStr.substring(0, 7);
      const iddesa = properties.iddesa || idslsStr.substring(0, 10);

      const kecObj = spatialData?.wilayahManifest?.kecamatan?.find(
        (k: any) => String(k.idkec) === String(idkec),
      );
      const desaObj = kecObj?.desa?.find(
        (d: any) => String(d.iddesa) === String(iddesa),
      );

      const nmKec = kecObj?.nmkec || properties.nmkec || `Kec. ${idkec}`;
      const nmDesa = desaObj?.nmdesa || properties.nmdesa || `Desa ${iddesa}`;
      const nmSls =
        properties.nmsls ||
        properties.nm_sls ||
        properties.dusun ||
        `SLS ${idslsStr}`;

      const sudah = properties.sudah_terdata || 0;
      const belum = properties.belum_terdata || 0;
      const total = properties.total_bangunan || 0;
      const usaha = properties.jumlah_usaha || 0;
      const rt = properties.jumlah_keluarga || 0;
      const usahaDigital = properties.jumlah_usaha_digital || 0;
      const usahaPertanian = properties.jumlah_usaha_pertanian || 0;

      html = `
        <div style="font-family: 'Outfit', 'Inter', sans-serif;">
          <div style="border-bottom: 1px solid ${theme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}; padding-bottom: 6px; margin-bottom: 8px;">
            <p style="font-weight: 700; font-size: 13px; margin: 0; color: ${theme === "dark" ? "#60A5FA" : "#2563EB"};">${nmSls}</p>
            <p style="font-size: 10px; margin: 2px 0 0 0; opacity: 0.8; line-height: 1.3;">
              📍 ${nmDesa}, ${nmKec}
            </p>
            <p style="font-size: 9px; margin: 1px 0 0 0; opacity: 0.6;">ID SLS: ${idslsStr}</p>
          </div>
          <div style="display: flex; flex-direction: column; gap: 4px; font-size: 11px;">
            <p style="display: flex; justify-content: space-between; margin: 0;">
              <span>Total Bangunan:</span><span style="font-weight: 600;">${total}</span>
            </p>
            <p style="display: flex; justify-content: space-between; color: #10B981; margin: 0;">
              <span>Sudah Terdata:</span><span style="font-weight: 600;">${sudah}</span>
            </p>
            <p style="display: flex; justify-content: space-between; color: #EF4444; margin: 0;">
              <span>Belum Terdata:</span><span style="font-weight: 600;">${belum}</span>
            </p>
            <div style="height: 1px; background: ${theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}; margin: 6px 0;"></div>
            <p style="display: flex; justify-content: space-between; color: #F59E0B; margin: 0;">
              <span>Titik Usaha Biasa:</span><span style="font-weight: 600;">${usaha}</span>
            </p>
            <p style="display: flex; justify-content: space-between; color: #EC4899; margin: 0;">
              <span>Titik Usaha Digital:</span><span style="font-weight: 600;">${usahaDigital}</span>
            </p>
            <p style="display: flex; justify-content: space-between; color: #10B981; margin: 0;">
              <span>Titik Usaha Pertanian:</span><span style="font-weight: 600;">${usahaPertanian}</span>
            </p>
            <p style="display: flex; justify-content: space-between; color: #3B82F6; margin: 0;">
              <span>Titik Keluarga (RT):</span><span style="font-weight: 600;">${rt}</span>
            </p>
          </div>
        </div>
      `;
    } else if (layerId === "bangunan-3d-layer") {
      const status = properties.status_bangunan || "-";
      const isMixed = properties.is_mixed || false;
      const statusColor = isMixed
        ? "#A855F7"
        : status === "Bangunan Usaha"
          ? "#F59E0B"
          : status === "Rumah Tangga"
            ? "#3B82F6"
            : "#94A3B8";

      html = `
        <div style="font-family: 'Outfit', 'Inter', sans-serif;">
          <p style="font-weight: 700; border-bottom: 1px solid ${theme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}; padding-bottom: 6px; margin-bottom: 8px; font-size: 13px;">
            ${properties.is_synthetic ? "Bangunan Sintetis (6m × 6m)" : "Bangunan Fisik"}
          </p>
          <div style="display: flex; flex-direction: column; gap: 4px; font-size: 11px;">
            <p style="display: flex; justify-content: space-between; margin: 0;">
              <span>Status:</span>
              <span style="font-weight: 700; color: ${statusColor};">${status}</span>
            </p>
            ${
              properties.is_synthetic
                ? `<p style="color: #6366F1; font-weight: 600; font-size: 10px; margin: 4px 0 0 0; text-align: center; background: rgba(99, 102, 241, 0.12); padding: 3px 6px; border-radius: 6px; border: 1px solid rgba(99, 102, 241, 0.25);">✨ Generatif Spasial 6m × 6m</p>`
                : isMixed
                  ? `<p style="color: #A855F7; font-weight: 600; font-size: 10px; margin: 4px 0 0 0; text-align: center;">Klik untuk detail Campuran!</p>`
                  : `<p style="display: flex; justify-content: space-between; margin: 0;"><span>Jml Usaha:</span><span style="font-weight: 600;">${properties.jml_usaha || 0}</span></p>`
            }
          </div>
        </div>
      `;
    } else if (
      [
        "usaha-circle-layer",
        "usaha-digital-circle-layer",
        "usaha-pertanian-circle-layer",
        "rt-circle-layer",
      ].includes(layerId)
    ) {
      const typeLabel =
        layerId === "usaha-circle-layer"
          ? "Titik Usaha Biasa"
          : layerId === "usaha-digital-circle-layer"
            ? "Titik Usaha Digital"
            : layerId === "usaha-pertanian-circle-layer"
              ? "Titik Usaha Pertanian"
              : "Titik Rumah Tangga";

      const color =
        layerId === "usaha-circle-layer"
          ? "#F59E0B"
          : layerId === "usaha-digital-circle-layer"
            ? "#FF32DC"
            : layerId === "usaha-pertanian-circle-layer"
              ? "#10B981"
              : "#3B82F6";

      // FIX: prioritaskan field pertanian untuk hover tooltip juga
      const nama =
        layerId === "usaha-pertanian-circle-layer"
          ? properties["nama_krt"] ||
            properties["nm_project"] ||
            properties["nama final"] ||
            properties["nama"] ||
            "Titik Usaha Pertanian"
          : properties["nama_kk"] ||
            properties["nama_krt"] ||
            properties["nama final"] ||
            properties["nama_kpl"] ||
            properties["nama"] ||
            "Titik Lokasi";

      const alamat =
        layerId === "usaha-pertanian-circle-layer"
          ? properties["deskripsi_project"] ||
            properties["alamat_project"] ||
            properties["alamat_final"] ||
            properties["alamat final"] ||
            properties["alamat"] ||
            "-"
          : properties["deskripsi_project"] ||
            properties["alamat_final"] ||
            properties["alamat final"] ||
            properties["alamat"] ||
            "-";

      html = `
        <div style="font-family: 'Outfit', 'Inter', sans-serif;">
          <p style="font-weight: 700; border-bottom: 1px solid ${theme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}; padding-bottom: 4px; margin: 0 0 4px 0; font-size: 13px; color: ${color};">
            ${typeLabel}
          </p>
          <p style="font-weight: 600; font-size: 12px; margin: 0 0 6px 0;">${nama}</p>
          <div style="display: flex; flex-direction: column; gap: 3px; font-size: 10px; color: #94A3B8;">
            <p style="white-space: normal; word-break: break-word; margin: 0;"><span style="font-weight: 500; color: ${theme === "dark" ? "#CBD5E1" : "#475569"};">Alamat:</span> ${alamat}</p>
          </div>
        </div>
      `;
    }

    tooltip.innerHTML = html;
  };

  const hideTooltip = () => {
    const tooltip = tooltipRef.current;
    if (tooltip) tooltip.style.display = "none";
  };

  const triggerRadarAnimation = (
    coords: [number, number],
    type: "usaha" | "rt" | "usaha-digital" | "usaha-pertanian",
  ) => {
    const map = mapRef.current;
    if (!map) return;

    if (radarMarkerRef.current) {
      radarMarkerRef.current.remove();
      radarMarkerRef.current = null;
    }

    const el = document.createElement("div");
    el.className = "radar-marker";

    const color =
      type === "usaha"
        ? "#F59E0B"
        : type === "usaha-digital"
          ? "#FF32DC"
          : type === "usaha-pertanian"
            ? "#10B981"
            : "#2563EB";

    el.innerHTML = `
      <div class="radar-dot" style="background-color: ${color};"></div>
      <div class="radar-ring" style="border-color: ${color};"></div>
    `;

    const marker = new maplibregl.Marker({ element: el })
      .setLngLat(coords)
      .addTo(map);
    radarMarkerRef.current = marker;
  };

  const showMixedBuildingPopup = (
    lngLat: any,
    usahaList: any[],
    rtList: any[],
  ) => {
    const map = mapRef.current;
    if (!map) return;

    if (activePopupRef.current) activePopupRef.current.remove();

    const totalUsaha = usahaList.length;
    const totalRt = rtList.length;
    const badgeColorCampuran =
      "background-color: rgba(168, 85, 247, 0.15); color: #A855F7; border: 1px solid rgba(168, 85, 247, 0.3);";

    let usahaListHtml = "";
    if (totalUsaha === 0) {
      usahaListHtml = `<p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 20px 0;">Tidak ada titik usaha di bangunan ini.</p>`;
    } else {
      usahaListHtml = usahaList
        .map((u) => {
          const name = u["nama final"] || u["nama"] || "Titik Usaha";
          const cat = u["kategori"] || "-";
          const addr = u["alamat final"] || u["alamat"] || "-";
          return `
          <div style="padding: 8px; border-radius: 8px; background: ${theme === "dark" ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)"}; margin-bottom: 6px; border: 1px solid ${theme === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)"};">
            <p style="margin: 0; font-weight: 700; font-size: 12px;">${name}</p>
            <p style="margin: 2px 0 0 0; font-size: 10px; color: ${theme === "dark" ? "#94a3b8" : "#64748b"};"><span style="font-weight: 500;">Kat:</span> ${cat}</p>
            <p style="margin: 2px 0 0 0; font-size: 10px; color: ${theme === "dark" ? "#cbd5e1" : "#475569"};"><span style="font-weight: 500;">Alamat:</span> ${addr}</p>
          </div>`;
        })
        .join("");
    }

    let rtListHtml = "";
    if (totalRt === 0) {
      rtListHtml = `<p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 20px 0;">Tidak ada titik rumah tangga di bangunan ini.</p>`;
    } else {
      rtListHtml = rtList
        .map((r) => {
          const name = r["nama_krt"] || r["nama_kpl"] || "Rumah Tangga";
          const cat = r["jenis_rt"] || "-";
          const addr = r["alamat final"] || r["alamat"] || "-";
          return `
          <div style="padding: 8px; border-radius: 8px; background: ${theme === "dark" ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)"}; margin-bottom: 6px; border: 1px solid ${theme === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)"};">
            <p style="margin: 0; font-weight: 700; font-size: 12px;">${name}</p>
            <p style="margin: 2px 0 0 0; font-size: 10px; color: ${theme === "dark" ? "#94a3b8" : "#64748b"};"><span style="font-weight: 500;">Status:</span> ${cat}</p>
            <p style="margin: 2px 0 0 0; font-size: 10px; color: ${theme === "dark" ? "#cbd5e1" : "#475569"};"><span style="font-weight: 500;">Alamat:</span> ${addr}</p>
          </div>`;
        })
        .join("");
    }

    const html = `
      <div style="font-family: 'Outfit', 'Inter', sans-serif; color: ${theme === "dark" ? "#f8fafc" : "#0f172a"}; padding: 14px; border-radius: 16px; width: 270px; background: ${theme === "dark" ? "rgba(30, 41, 59, 0.95)" : "rgba(255, 255, 255, 0.95)"}; backdrop-filter: blur(8px); border: 1px solid ${theme === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.08)"}; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1);">
        <div style="margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between;">
          <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; padding: 3px 8px; border-radius: 9999px; display: inline-flex; align-items: center; ${badgeColorCampuran}">Bangunan Campuran</span>
        </div>
        <div style="display: flex; gap: 4px; margin-bottom: 12px; background: ${theme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"}; padding: 2px; border-radius: 8px;">
          <button id="mixed-popup-tab-usaha" class="active-tab" onclick="window.switchMixedPopupTab('usaha')" style="flex: 1; padding: 6px; font-size: 11px; font-weight: 600; border-radius: 6px; border: none; cursor: pointer; color: ${theme === "dark" ? "#cbd5e1" : "#475569"}; background: transparent; transition: all 0.2s;">Usaha (${totalUsaha})</button>
          <button id="mixed-popup-tab-rt" onclick="window.switchMixedPopupTab('rt')" style="flex: 1; padding: 6px; font-size: 11px; font-weight: 600; border-radius: 6px; border: none; cursor: pointer; color: ${theme === "dark" ? "#cbd5e1" : "#475569"}; background: transparent; transition: all 0.2s;">Keluarga (${totalRt})</button>
        </div>
        <div id="mixed-popup-content-usaha" style="max-height: 180px; overflow-y: auto; display: block;">${usahaListHtml}</div>
        <div id="mixed-popup-content-rt" style="max-height: 180px; overflow-y: auto; display: none;">${rtListHtml}</div>
        <style>
          #mixed-popup-tab-usaha.active-tab { background: #F59E0B !important; color: white !important; }
          #mixed-popup-tab-rt.active-tab { background: #2563EB !important; color: white !important; }
        </style>
      </div>
    `;

    if (!(window as any).switchMixedPopupTab) {
      (window as any).switchMixedPopupTab = (tabName: "usaha" | "rt") => {
        const usahaTab = document.getElementById("mixed-popup-tab-usaha");
        const rtTab = document.getElementById("mixed-popup-tab-rt");
        const usahaContent = document.getElementById(
          "mixed-popup-content-usaha",
        );
        const rtContent = document.getElementById("mixed-popup-content-rt");
        if (tabName === "usaha") {
          usahaTab?.classList.add("active-tab");
          rtTab?.classList.remove("active-tab");
          if (usahaContent) usahaContent.style.display = "block";
          if (rtContent) rtContent.style.display = "none";
        } else {
          rtTab?.classList.add("active-tab");
          usahaTab?.classList.remove("active-tab");
          if (usahaContent) usahaContent.style.display = "none";
          if (rtContent) rtContent.style.display = "block";
        }
      };
    }

    const popup = new maplibregl.Popup({
      closeButton: true,
      closeOnClick: true,
      maxWidth: "290px",
      className: "premium-maplibre-popup",
    })
      .setLngLat(lngLat)
      .setHTML(html)
      .addTo(map);

    activePopupRef.current = popup;
    popup.on("close", () => {
      if (activePopupRef.current === popup) activePopupRef.current = null;
    });
  };

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const addLayers = () => {
      if (!map || !map.loaded()) return;
      cleanupListeners();

      // 0. Outline Kabupaten
      if (dataKab) {
        if (map.getSource("kab-source")) {
          (map.getSource("kab-source") as maplibregl.GeoJSONSource).setData(
            dataKab,
          );
        } else {
          map.addSource("kab-source", { type: "geojson", data: dataKab });
          map.addLayer({
            id: "kab-line-layer",
            type: "line",
            source: "kab-source",
            paint: {
              "line-color":
                theme === "dark"
                  ? "rgba(0, 255, 204, 0.7)"
                  : "rgb(160, 32, 240)",
              "line-width": 1.5,
              "line-opacity": 0.7,
            },
          });
        }
      }

      // 0b. Batas Desa & Kecamatan
      if (geoJsonDesaBoundary) {
        if (map.getSource("desa-boundary-source")) {
          (
            map.getSource("desa-boundary-source") as maplibregl.GeoJSONSource
          ).setData(geoJsonDesaBoundary as any);
        } else {
          map.addSource("desa-boundary-source", {
            type: "geojson",
            data: geoJsonDesaBoundary as any,
          });
          map.addLayer({
            id: "desa-boundary-layer",
            type: "line",
            source: "desa-boundary-source",
            paint: {
              "line-color":
                theme === "dark"
                  ? "rgba(129, 140, 248, 0.4)"
                  : "rgba(99, 102, 241, 0.4)",
              "line-width": 1.8,
            },
          });
          map.addLayer({
            id: "kec-boundary-layer",
            type: "line",
            source: "desa-boundary-source",
            paint: {
              "line-color":
                theme === "dark"
                  ? "rgba(99, 102, 241, 0.7)"
                  : "rgba(79, 70, 229, 0.7)",
              "line-width": 3.0,
            },
          });
        }
      } else {
        if (map.getSource("desa-boundary-source")) {
          (
            map.getSource("desa-boundary-source") as maplibregl.GeoJSONSource
          ).setData({ type: "FeatureCollection", features: [] });
        }
      }

      // 0c. Batas Desa Terpilih
      if (geoJsonDesaSelected && store.filterDesa !== "Semua") {
        if (map.getSource("desa-selected-source")) {
          (
            map.getSource("desa-selected-source") as maplibregl.GeoJSONSource
          ).setData(geoJsonDesaSelected as any);
          if (map.getLayer("desa-selected-boundary-layer")) {
            map.setPaintProperty(
              "desa-selected-boundary-layer",
              "line-color",
              theme === "dark" ? "#FF7300" : "#E25C00",
            );
          }
        } else {
          map.addSource("desa-selected-source", {
            type: "geojson",
            data: geoJsonDesaSelected as any,
          });
          map.addLayer({
            id: "desa-selected-boundary-layer",
            type: "line",
            source: "desa-selected-source",
            paint: {
              "line-color": theme === "dark" ? "#FF7300" : "#E25C00",
              "line-width": 4.5,
              "line-opacity": 1.0,
            },
          });
        }
      } else {
        if (map.getSource("desa-selected-source")) {
          (
            map.getSource("desa-selected-source") as maplibregl.GeoJSONSource
          ).setData({ type: "FeatureCollection", features: [] });
        }
      }

      // 1. SLS Boundaries
      if (filteredSls) {
        if (map.getSource("sls-source")) {
          (map.getSource("sls-source") as maplibregl.GeoJSONSource).setData(
            filteredSls,
          );
          if (map.getLayer("sls-fill-layer")) {
            map.setPaintProperty(
              "sls-fill-layer",
              "fill-color",
              theme === "dark"
                ? "rgba(255, 255, 255, 0.02)"
                : "rgba(79, 70, 229, 0.03)",
            );
          }
          if (map.getLayer("sls-line-layer")) {
            map.setPaintProperty(
              "sls-line-layer",
              "line-color",
              theme === "dark"
                ? "rgba(255, 255, 255, 0.45)"
                : "rgba(15, 23, 42, 0.25)",
            );
          }
          if (map.getLayer("sls-hover-line-layer")) {
            map.setPaintProperty(
              "sls-hover-line-layer",
              "line-color",
              theme === "dark" ? "#ffffff" : "#0f172a",
            );
          }
        } else {
          map.addSource("sls-source", {
            type: "geojson",
            data: filteredSls as any,
          });
          map.addLayer({
            id: "sls-fill-layer",
            type: "fill",
            source: "sls-source",
            paint: {
              "fill-color":
                theme === "dark"
                  ? "rgba(255, 255, 255, 0.02)"
                  : "rgba(79, 70, 229, 0.03)",
              "fill-opacity": 0.7,
            },
          });
          map.addLayer({
            id: "sls-line-layer",
            type: "line",
            source: "sls-source",
            paint: {
              "line-color":
                theme === "dark"
                  ? "rgba(255, 255, 255, 0.45)"
                  : "rgba(15, 23, 42, 0.25)",
              "line-width": 1.2,
            },
          });
          map.addLayer({
            id: "sls-hover-line-layer",
            type: "line",
            source: "sls-source",
            filter: ["==", ["get", "idsls_str"], ""],
            paint: {
              "line-color": theme === "dark" ? "#ffffff" : "#0f172a",
              "line-width": 3.5,
              "line-opacity": 0,
            },
          });
        }
      }

      // 3. Bangunan 3D
      if (geoJsonBangunan) {
        if (map.getSource("bangunan-source")) {
          (
            map.getSource("bangunan-source") as maplibregl.GeoJSONSource
          ).setData(geoJsonBangunan as any);
          if (map.getLayer("bangunan-3d-layer")) {
            map.setPaintProperty(
              "bangunan-3d-layer",
              "fill-extrusion-color",
              theme === "dark" ? "#334155" : "#cbd5e1",
            );
          }
        } else {
          map.addSource("bangunan-source", {
            type: "geojson",
            data: geoJsonBangunan as any,
          });
          map.addLayer({
            id: "bangunan-3d-layer",
            type: "fill-extrusion",
            source: "bangunan-source",
            paint: {
              "fill-extrusion-color": theme === "dark" ? "#334155" : "#cbd5e1",
              "fill-extrusion-height": [
                "coalesce",
                ["get", "tinggi_bangunan"],
                ["get", "height"],
                2.5,
              ],
              "fill-extrusion-base": 0,
              "fill-extrusion-opacity": 0.7,
            },
          });
        }
      }

      // 4. Titik Usaha
      if (geoJsonUsaha) {
        if (map.getSource("usaha-source")) {
          (map.getSource("usaha-source") as maplibregl.GeoJSONSource).setData(
            geoJsonUsaha as any,
          );
        } else {
          map.addSource("usaha-source", {
            type: "geojson",
            data: geoJsonUsaha as any,
          });
          map.addLayer({
            id: "usaha-circle-layer",
            type: "circle",
            source: "usaha-source",
            layout: { visibility: store.showUsaha ? "visible" : "none" },
            paint: {
              "circle-radius": 7,
              "circle-color": "#F59E0B",
              "circle-stroke-width": 1.2,
              "circle-stroke-color": "#ffffff",
            },
          });
        }
      }

      // 5. Titik Usaha Digital
      if (geoJsonUsahaDigital) {
        if (map.getSource("usaha-digital-source")) {
          (
            map.getSource("usaha-digital-source") as maplibregl.GeoJSONSource
          ).setData(geoJsonUsahaDigital as any);
        } else {
          map.addSource("usaha-digital-source", {
            type: "geojson",
            data: geoJsonUsahaDigital as any,
          });
          map.addLayer({
            id: "usaha-digital-circle-layer",
            type: "circle",
            source: "usaha-digital-source",
            layout: { visibility: store.showUsahaDigital ? "visible" : "none" },
            paint: {
              "circle-radius": 5,
              "circle-color": "#FF32DC",
              "circle-stroke-width": 1,
              "circle-stroke-color": "#ffffff",
            },
          });
        }
      }

      // 5b. Titik Usaha Pertanian
      if (geoJsonUsahaPertanian) {
        if (map.getSource("usaha-pertanian-source")) {
          (
            map.getSource("usaha-pertanian-source") as maplibregl.GeoJSONSource
          ).setData(geoJsonUsahaPertanian as any);
        } else {
          map.addSource("usaha-pertanian-source", {
            type: "geojson",
            data: geoJsonUsahaPertanian as any,
          });
          map.addLayer({
            id: "usaha-pertanian-circle-layer",
            type: "circle",
            source: "usaha-pertanian-source",
            layout: {
              visibility: store.showUsahaPertanian ? "visible" : "none",
            },
            paint: {
              "circle-radius": 6,
              "circle-color": "#10B981",
              "circle-stroke-width": 1.5,
              "circle-stroke-color": "#ffffff",
              "circle-opacity": 0.9,
            },
          });
        }
      }

      // 6. Titik Rumah Tangga
      if (geoJsonRt) {
        if (map.getSource("rt-source")) {
          (map.getSource("rt-source") as maplibregl.GeoJSONSource).setData(
            geoJsonRt as any,
          );
        } else {
          map.addSource("rt-source", {
            type: "geojson",
            data: geoJsonRt as any,
          });
          map.addLayer({
            id: "rt-circle-layer",
            type: "circle",
            source: "rt-source",
            layout: { visibility: store.showRt ? "visible" : "none" },
            paint: {
              "circle-radius": 3.5,
              "circle-color": "#2563EB",
              "circle-stroke-width": 0.8,
              "circle-stroke-color": "#ffffff",
            },
          });
        }
      }

      // Sync layer toggles
      const layersToSync = {
        "sls-fill-layer": store.showSls,
        "sls-line-layer": store.showSls,
        "bangunan-3d-layer": store.showBuild,
        "usaha-circle-layer": store.showUsaha,
        "usaha-digital-circle-layer": store.showUsahaDigital,
        "usaha-pertanian-circle-layer": store.showUsahaPertanian,
        "rt-circle-layer": store.showRt,
        "kab-line-layer": store.showKab,
        "desa-boundary-layer":
          store.filterKecamatan !== "Semua" && store.filterDesa === "Semua",
        "kec-boundary-layer":
          store.filterKecamatan !== "Semua" && store.filterDesa === "Semua",
      };
      Object.entries(layersToSync).forEach(([layerId, isVisible]) => {
        if (map.getLayer(layerId)) {
          map.setLayoutProperty(
            layerId,
            "visibility",
            isVisible ? "visible" : "none",
          );
        }
      });

      // Event listeners
      const interactiveLayers = [
        "sls-fill-layer",
        "bangunan-3d-layer",
        "usaha-circle-layer",
        "usaha-digital-circle-layer",
        "usaha-pertanian-circle-layer",
        "rt-circle-layer",
      ];

      interactiveLayers.forEach((layerId) => {
        const onMouseMove = (e: any) => {
          if (e.features && e.features.length > 0) {
            map.getCanvas().style.cursor = "pointer";
            const props = e.features[0].properties;
            if (layerId === "sls-fill-layer") setHoveredSlsId(props.idsls_str);
            updateTooltip(e, layerId, props);
          }
        };

        const onMouseLeave = () => {
          map.getCanvas().style.cursor = "";
          hideTooltip();
          if (layerId === "sls-fill-layer") setHoveredSlsId(null);
        };

        map.on("mousemove", layerId, onMouseMove);
        map.on("mouseleave", layerId, onMouseLeave);
        listeners.push({
          type: "mousemove",
          layer: layerId,
          listener: onMouseMove,
        });
        listeners.push({
          type: "mouseleave",
          layer: layerId,
          listener: onMouseLeave,
        });

        const onClick = (e: any) => {
          if (!e.features || e.features.length === 0) return;
          const props = e.features[0].properties;

          if (activePopupRef.current) {
            activePopupRef.current.remove();
            activePopupRef.current = null;
          }

          if (
            layerId === "bangunan-3d-layer" &&
            (props.status_bangunan === "Campuran" || props.is_mixed)
          ) {
            const usahaList = props.near_usaha
              ? JSON.parse(props.near_usaha)
              : [];
            const rtList = props.near_rt ? JSON.parse(props.near_rt) : [];
            showMixedBuildingPopup(e.lngLat, usahaList, rtList);
            return;
          }

          if (
            [
              "usaha-circle-layer",
              "usaha-digital-circle-layer",
              "usaha-pertanian-circle-layer",
              "rt-circle-layer",
            ].includes(layerId)
          ) {
            const type =
              layerId === "usaha-circle-layer"
                ? "usaha"
                : layerId === "usaha-digital-circle-layer"
                  ? "usaha-digital"
                  : layerId === "usaha-pertanian-circle-layer"
                    ? "usaha-pertanian"
                    : "rt";

            // FIX: prioritaskan field pertanian (nm_project, deskripsi_project)
            const nama =
              (type === "usaha-pertanian"
                ? props["nama_krt"] ||
                  props["nm_project"] ||
                  props["nama_project"]
                : null) ||
              props["nama final"] ||
              props["nama_kk"] ||
              props["nama"] ||
              props["nama_kpl"] ||
              (type === "rt"
                ? "Rumah Tangga"
                : type === "usaha-pertanian"
                  ? "Usaha Pertanian"
                  : "Titik Usaha");

            const alamat =
              (type === "usaha-pertanian"
                ? props["deskripsi_project"] || props["alamat_project"]
                : null) ||
              props["alamat_final"] ||
              props["alamat final"] ||
              props["alamat_krt"] ||
              props["alamat"] ||
              null;

            // Info tambahan per tipe
            const extraInfo =
              type === "rt"
                ? props["jenis_rt"] || props["status_rt"] || null
                : type === "usaha" || type === "usaha-digital"
                  ? props["kategori"] || props["jenis_usaha"] || null
                  : type === "usaha-pertanian"
                    ? props["komoditas"] || props["jenis_usaha"] || null
                    : null;

            const slsInfo =
              props["idsls_final"] ||
              props["idsls_str"] ||
              props["idsls final"] ||
              null;

            triggerRadarAnimation([e.lngLat.lng, e.lngLat.lat], type);

            const badgeColor =
              type === "usaha"
                ? "background-color: rgba(245, 158, 11, 0.15); color: #F59E0B; border: 1px solid rgba(245, 158, 11, 0.3);"
                : type === "usaha-digital"
                  ? "background-color: rgba(255, 50, 220, 0.15); color: #FF32DC; border: 1px solid rgba(255, 50, 220, 0.3);"
                  : type === "usaha-pertanian"
                    ? "background-color: rgba(16, 185, 129, 0.15); color: #10B981; border: 1px solid rgba(16, 185, 129, 0.3);"
                    : "background-color: rgba(37, 99, 235, 0.15); color: #2563EB; border: 1px solid rgba(37, 99, 235, 0.3);";

            const badgeLabel =
              type === "usaha"
                ? "Usaha Biasa"
                : type === "usaha-digital"
                  ? "Usaha Digital"
                  : type === "usaha-pertanian"
                    ? "Usaha Pertanian"
                    : "Rumah Tangga";

            const html = `
              <div style="font-family: 'Outfit', 'Inter', sans-serif; color: ${theme === "dark" ? "#f8fafc" : "#0f172a"}; padding: 14px; border-radius: 16px; max-width: 260px; background: ${theme === "dark" ? "rgba(30, 41, 59, 0.95)" : "rgba(255, 255, 255, 0.95)"}; backdrop-filter: blur(8px); border: 1px solid ${theme === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.08)"}; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);">
                <div style="margin-bottom: 10px;">
                  <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; padding: 3px 8px; border-radius: 9999px; display: inline-flex; align-items: center; ${badgeColor}">${badgeLabel}</span>
                </div>
                <h3 style="margin: 0 0 6px 0; font-size: 14px; font-weight: 700; line-height: 1.3; letter-spacing: -0.01em;">${nama}</h3>
                <div style="height: 1px; background: ${theme === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)"}; margin: 8px 0;"></div>
                
              </div>
            `;

            const popup = new maplibregl.Popup({
              closeButton: true,
              closeOnClick: true,
              maxWidth: "280px",
              className: "premium-maplibre-popup",
            })
              .setLngLat(e.lngLat)
              .setHTML(html)
              .addTo(map);

            activePopupRef.current = popup;
            popup.on("close", () => {
              if (activePopupRef.current === popup)
                activePopupRef.current = null;
            });
          }
        };

        map.on("click", layerId, onClick);
        listeners.push({ type: "click", layer: layerId, listener: onClick });
      });

      // Dismiss popup saat klik area kosong (bukan di atas layer manapun)
      const onMapClick = (e: any) => {
        const hitLayers = interactiveLayers.filter((l) => map.getLayer(l));
        const features = map.queryRenderedFeatures(e.point, {
          layers: hitLayers,
        });
        if (!features || features.length === 0) {
          if (activePopupRef.current) {
            activePopupRef.current.remove();
            activePopupRef.current = null;
          }
          if (radarMarkerRef.current) {
            radarMarkerRef.current.remove();
            radarMarkerRef.current = null;
          }
        }
      };
      map.on("click", onMapClick);
      listeners.push({
        type: "click",
        layer: "__map__" as any,
        listener: onMapClick,
      });
    };

    const listeners: Array<{ type: string; layer: string; listener: any }> = [];

    const cleanupListeners = () => {
      listeners.forEach(({ type, layer, listener }) => {
        if (map && map.loaded()) {
          if (layer === "__map__") {
            map.off(type as any, listener);
          } else {
            map.off(type as any, layer, listener);
          }
        }
      });
      listeners.length = 0;
    };

    if (map.loaded()) addLayers();
    map.on("style.load", addLayers);

    return () => {
      cleanupListeners();
      if (map) map.off("style.load", addLayers);
    };
  }, [
    filteredSls,
    geoJsonBangunan,
    geoJsonUsaha,
    geoJsonUsahaDigital,
    geoJsonUsahaPertanian,
    geoJsonRt,
    geoJsonDesaBoundary,
    geoJsonDesaSelected,
    dataKab,
    theme,
    store.showSls,
    store.showBuild,
    store.showUsaha,
    store.showUsahaDigital,
    store.showUsahaPertanian,
    store.showRt,
    store.showKab,
    store.filterKecamatan,
    store.filterDesa,
  ]);

  // Tutup popup & radar saat filter/reset berubah
  useEffect(() => {
    if (activePopupRef.current) {
      activePopupRef.current.remove();
      activePopupRef.current = null;
    }
    if (radarMarkerRef.current) {
      radarMarkerRef.current.remove();
      radarMarkerRef.current = null;
    }
  }, [store.filterKecamatan, store.filterDesa, store.filterNama]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.loaded()) return;
    if (map.getLayer("sls-hover-line-layer")) {
      if (hoveredSlsId) {
        map.setFilter("sls-hover-line-layer", [
          "==",
          ["get", "idsls_str"],
          hoveredSlsId,
        ]);
        map.setPaintProperty("sls-hover-line-layer", "line-opacity", 0.95);
      } else {
        map.setPaintProperty("sls-hover-line-layer", "line-opacity", 0);
      }
    }
  }, [hoveredSlsId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const magneticZoom = () => {
      let bbox = null;

      // 1. Prioritas utama: Kalau ada Desa yang dipilih
      if (
        store.filterDesa &&
        store.filterDesa !== "Semua" &&
        geoJsonDesaSelected?.features?.length > 0
      ) {
        bbox = calculateBbox(geoJsonDesaSelected);
      }
      // 2. Prioritas kedua: Kalau ada Kecamatan yang dipilih (tapi Desa "Semua")
      else if (
        store.filterKecamatan &&
        store.filterKecamatan !== "Semua" &&
        geoJsonDesaBoundary?.features?.length > 0
      ) {
        bbox = calculateBbox(geoJsonDesaBoundary);
      }
      // 3. Prioritas terakhir: Balik ke Kabupaten
      else if (dataKab?.features?.length > 0) {
        bbox = calculateBbox(dataKab);
      }

      // Kalau koordinat bbox dapet, lakuin efek "Woozz"
      if (bbox && bbox.length === 4) {
        map.fitBounds(
          [
            [bbox[0], bbox[1]],
            [bbox[2], bbox[3]],
          ],
          {
            padding: 80, // Kasih jarak pinggir biar wilayahnya nggak mepet layar
            duration: 2500, // Durasi 2.5 detik biar efek terbangnya kerasa banget
            pitch: store.enable3d ? 60 : 0, // Kalau lagi 3D, pertahankan angle-nya
            essential: true, // Maksa Maplibre jalanin animasi ini tanpa ragu
            curve: 1.5, // Bikin kurva terbangnya makin melengkung ala "woozz"
          },
        );
      }
    };

    // KUNCI PENTING: Kasih jeda (delay) dikit.
    // Kadang React butuh waktu nol koma sekian detik buat nge-set geoJsonDesaSelected dll.
    // Kalau langsung ditembak, bbox-nya bisa null atau animasi tabrakan.
    const timeoutId = setTimeout(() => {
      if (map.loaded()) {
        magneticZoom();
      } else {
        map.once("load", magneticZoom);
      }
    }, 150); // Jeda 150ms

    return () => clearTimeout(timeoutId);
  }, [
    store.filterKecamatan,
    store.filterDesa,
    geoJsonDesaSelected,
    geoJsonDesaBoundary,
    dataKab,
    store.enable3d,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const toggle3d = () => {
      map.easeTo({ pitch: store.enable3d ? 60 : 0, duration: 1000 });
    };

    if (map.loaded()) toggle3d();
    else map.once("load", toggle3d);
  }, [store.enable3d]);

  return (
    <div className="relative h-full w-full rounded-xl overflow-hidden border">
      <style>{`
        .premium-maplibre-popup { z-index: 9999 !important; pointer-events: auto !important; }
        .premium-maplibre-popup .maplibregl-popup-content { background: transparent !important; box-shadow: none !important; padding: 0 !important; border: none !important; position: relative !important; pointer-events: auto !important; }
        .premium-maplibre-popup .maplibregl-popup-close-button { position: absolute !important; color: ${theme === "dark" ? "#cbd5e1" : "#475569"} !important; font-size: 20px !important; right: 14px !important; top: 14px !important; font-weight: bold !important; background: transparent !important; border: none !important; outline: none !important; z-index: 99999 !important; pointer-events: auto !important; cursor: pointer !important; }
        .premium-maplibre-popup .maplibregl-popup-close-button:hover { color: ${theme === "dark" ? "#f8fafc" : "#0f172a"} !important; }
        .radar-marker { position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; pointer-events: none; }
        .radar-dot { position: absolute; width: 10px; height: 10px; border-radius: 50%; z-index: 2; box-shadow: 0 0 8px rgba(0,0,0,0.3); }
        .radar-ring { position: absolute; width: 10px; height: 10px; border: 2.5px solid; border-radius: 50%; animation: radar-pulse 1.8s cubic-bezier(0.215, 0.610, 0.355, 1.000) infinite; z-index: 1; }
        @keyframes radar-pulse { 0% { transform: scale(0.6); opacity: 1; } 100% { transform: scale(4.5); opacity: 0; } }
      `}</style>

      {/* FLOATING DOCUMENTATION BUTTON MELAYANG DI DALAM PETA */}
      <div className="absolute top-4 right-4 z-40">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => navigate("/documentation")}
          className="h-9 px-3 text-xs font-semibold gap-1.5 shadow-lg bg-card/90 backdrop-blur-md border border-primary/20 text-foreground hover:text-primary transition-all rounded-xl hover:shadow-xl"
        >
          <BookOpen className="w-4 h-4 text-primary" />
          <span className="hidden sm:inline">Panduan & Dokumentasi</span>
        </Button>
      </div>

      {store.filterKecamatan === "Semua" && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-amber-500/95 text-white backdrop-blur-md px-4 py-2.5 rounded-xl shadow-xl border border-amber-400/50 flex items-center gap-2.5 text-xs font-semibold max-w-[90%] sm:max-w-xl text-center pointer-events-auto">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-100" />
          <span>
            <strong>Perhatian:</strong> Silakan pilih Kecamatan di filter
            wilayah terlebih dahulu untuk memuat data statistik & sebaran titik
            lokasi di peta.
          </span>
        </div>
      )}

      {isLoading && (
        <div className="absolute inset-0 z-50 bg-black/60 pointer-events-none transition-opacity duration-300 backdrop-blur-[2px]" />
      )}

      {error && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <p className="text-sm font-medium text-destructive">{error}</p>
        </div>
      )}

      <Map
        ref={mapRef}
        viewport={viewState}
        onViewportChange={setViewState}
        theme={theme === "dark" ? "dark" : "light"}
        projection={{ type: "globe" }}
      >
        <MapControls
          position="bottom-right"
          showZoom
          showCompass
          showFullscreen
        />
      </Map>

      <div
        ref={tooltipRef}
        className="absolute z-50 bg-popover/95 backdrop-blur-md text-popover-foreground border shadow-xl rounded-xl p-4 text-xs pointer-events-none w-70 hidden transition-all duration-75"
        style={{ left: 0, top: 0, transform: "translate3d(0, 0, 0)" }}
      />
    </div>
  );
}
