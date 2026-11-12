import { useState, useRef, useEffect, useMemo } from "react";
import { Map, MapControls } from "@/components/ui/map";
import maplibregl from "maplibre-gl";

import {
  processSlsData,
  convertTitikToGeoJson,
  calculateBbox,
} from "@/utils/dataProcessing";
import { useMapStore } from "@/store/mapStore";
import { useTheme } from "@/context/theme-provider";

export function InteractiveMap({ spatialData }: { spatialData: any }) {
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
    if (store.filterDesa === "Semua") return processedSls;
    return {
      ...processedSls,
      features: processedSls.features.filter((f: any) => {
        const iddesa =
          f.properties.iddesa ||
          String(f.properties.idsls_str || "").substring(0, 10);
        return String(iddesa) === store.filterDesa;
      }),
    };
  }, [processedSls, store.filterDesa]);

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

  const geoJsonUsaha = useMemo(() => {
    if (!dataUsaha.length || isLoading) return null;
    return convertTitikToGeoJson(filterDataByDesaAndSearch(dataUsaha));
  }, [dataUsaha, isLoading, store.filterDesa, store.filterNama]);

  const geoJsonUsahaDigital = useMemo(() => {
    if (!dataUsahaDigital.length || isLoading) return null;
    return convertTitikToGeoJson(filterDataByDesaAndSearch(dataUsahaDigital));
  }, [dataUsahaDigital, isLoading, store.filterDesa, store.filterNama]);

  const geoJsonUsahaPertanian = useMemo(() => {
    if (!dataUsahaPertanian?.length || isLoading) return null;
    return convertTitikToGeoJson(
      filterDataByDesaAndSearch(dataUsahaPertanian, "pertanian"),
    );
  }, [dataUsahaPertanian, isLoading, store.filterDesa, store.filterNama]);

  const geoJsonRt = useMemo(() => {
    if (!dataRumahTangga.length || isLoading) return null;
    return convertTitikToGeoJson(filterDataByDesaAndSearch(dataRumahTangga));
  }, [dataRumahTangga, isLoading, store.filterDesa, store.filterNama]);

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

    const mapCanvas = mapRef.current?.getCanvas();
    const maxWidth = mapCanvas?.clientWidth || window.innerWidth;
    const maxHeight = mapCanvas?.clientHeight || window.innerHeight;
    const tooltipW = layerId === "sls-fill-layer" ? 315 : 280;
    const tooltipH = layerId === "sls-fill-layer" ? 290 : 140;

    const x =
      e.point.x + tooltipW + 24 > maxWidth
        ? Math.max(12, e.point.x - tooltipW - 15)
        : e.point.x + 15;
    const y =
      e.point.y + tooltipH + 24 > maxHeight
        ? Math.max(12, maxHeight - tooltipH - 16)
        : e.point.y + 15;

    tooltip.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    tooltip.style.display = "block";

    let html = "";
    if (layerId === "sls-fill-layer") {
      const sudah = Number(properties.sudah_terdata || 0);
      const belum = Number(properties.belum_terdata || 0);
      const total = Number(properties.total_bangunan || 0);
      const usaha = Number(properties.jumlah_usaha || 0);
      const rt = Number(properties.jumlah_keluarga || 0);
      const usahaDigital = Number(properties.jumlah_usaha_digital || 0);
      const usahaPertanian = Number(properties.jumlah_usaha_pertanian || 0);

      const pct = total > 0 ? Math.min(100, Math.round((sudah / total) * 100)) : 0;
      const isDark = theme === "dark";
      const pctColor =
        pct >= 80 ? "#10B981" : pct >= 40 ? "#F59E0B" : "#EF4444";
      const pctBg =
        pct >= 80
          ? "rgba(16, 185, 129, 0.14)"
          : pct >= 40
            ? "rgba(245, 158, 11, 0.14)"
            : "rgba(239, 68, 68, 0.14)";

      const slsName = properties.nmsls || `SLS ${properties.idsls_str || "-"}`;
      const wilayahSub = [properties.nmdesa, properties.nmkec]
        .filter(Boolean)
        .join(" • ");

      const cardBg = isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.03)";
      const cardBorder = isDark
        ? "rgba(255,255,255,0.08)"
        : "rgba(15,23,42,0.07)";
      const mutedText = isDark ? "#94A3B8" : "#64748B";
      const mainText = isDark ? "#F8FAFC" : "#0F172A";
      const trackBg = isDark ? "rgba(255,255,255,0.1)" : "rgba(15,23,42,0.08)";

      html = `
        <div style="font-family: 'Outfit', 'Inter', sans-serif; color: ${mainText};">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px;">
            <span style="font-family: ui-monospace, monospace; font-size: 10px; font-weight: 600; padding: 2px 7px; border-radius: 6px; background: ${cardBg}; border: 1px solid ${cardBorder}; color: ${mutedText};">
              ${properties.idsls_str || "-"}
            </span>
            <span style="font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 9999px; background: ${pctBg}; color: ${pctColor};">
              ${pct}% Terdata
            </span>
          </div>

          <p style="margin: 0; font-weight: 700; font-size: 13px; line-height: 1.3; letter-spacing: -0.01em;">
            ${slsName}
          </p>
          ${
            wilayahSub
              ? `<p style="margin: 2px 0 0 0; font-size: 11px; color: ${mutedText};">${wilayahSub}</p>`
              : ""
          }

          <div style="margin-top: 10px; padding: 10px; border-radius: 10px; background: ${cardBg}; border: 1px solid ${cardBorder};">
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: ${mutedText}; margin-bottom: 6px;">
              <span style="font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em;">Cakupan Bangunan</span>
              <span style="font-weight: 700; color: ${mainText};">${total.toLocaleString("id-ID")} Total</span>
            </div>
            <div style="width: 100%; height: 6px; border-radius: 9999px; background: ${trackBg}; overflow: hidden; margin-bottom: 8px;">
              <div style="width: ${pct}%; height: 100%; border-radius: 9999px; background: linear-gradient(90deg, #10B981, #34D399);"></div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 11px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: ${mutedText};">Sudah</span>
                <span style="font-weight: 700; color: #10B981;">${sudah.toLocaleString("id-ID")}</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: ${mutedText};">Belum</span>
                <span style="font-weight: 700; color: #EF4444;">${belum.toLocaleString("id-ID")}</span>
              </div>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 8px;">
            <div style="padding: 8px; border-radius: 10px; background: ${cardBg}; border: 1px solid ${cardBorder};">
              <div style="display: flex; align-items: center; gap: 5px; font-size: 10px; color: ${mutedText}; margin-bottom: 2px;">
                <span style="width: 6px; height: 6px; border-radius: 9999px; background: #F59E0B;"></span>
                <span>Usaha Biasa</span>
              </div>
              <p style="margin: 0; font-size: 14px; font-weight: 700; font-variant-numeric: tabular-nums;">${usaha.toLocaleString("id-ID")}</p>
            </div>
            <div style="padding: 8px; border-radius: 10px; background: ${cardBg}; border: 1px solid ${cardBorder};">
              <div style="display: flex; align-items: center; gap: 5px; font-size: 10px; color: ${mutedText}; margin-bottom: 2px;">
                <span style="width: 6px; height: 6px; border-radius: 9999px; background: #3B82F6;"></span>
                <span>Keluarga / RT</span>
              </div>
              <p style="margin: 0; font-size: 14px; font-weight: 700; font-variant-numeric: tabular-nums;">${rt.toLocaleString("id-ID")}</p>
            </div>
            <div style="padding: 8px; border-radius: 10px; background: ${cardBg}; border: 1px solid ${cardBorder};">
              <div style="display: flex; align-items: center; gap: 5px; font-size: 10px; color: ${mutedText}; margin-bottom: 2px;">
                <span style="width: 6px; height: 6px; border-radius: 9999px; background: #10B981;"></span>
                <span>Pertanian</span>
              </div>
              <p style="margin: 0; font-size: 14px; font-weight: 700; font-variant-numeric: tabular-nums;">${usahaPertanian.toLocaleString("id-ID")}</p>
            </div>
            <div style="padding: 8px; border-radius: 10px; background: ${cardBg}; border: 1px solid ${cardBorder};">
              <div style="display: flex; align-items: center; gap: 5px; font-size: 10px; color: ${mutedText}; margin-bottom: 2px;">
                <span style="width: 6px; height: 6px; border-radius: 9999px; background: #EC4899;"></span>
                <span>Usaha Digital</span>
              </div>
              <p style="margin: 0; font-size: 14px; font-weight: 700; font-variant-numeric: tabular-nums;">${usahaDigital.toLocaleString("id-ID")}</p>
            </div>
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
            properties["alamat final"] ||
            properties["alamat"] ||
            "-"
          : properties["deskripsi_project"] ||
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
              props["alamat final"] ||
              props["alamat"] ||
              "-";

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
                <div style="height: 1px; background: ${theme === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)"}; margin: 10px 0;"></div>
                <div style="font-size: 11px; line-height: 1.4; color: ${theme === "dark" ? "#cbd5e1" : "#475569"};">${alamat}</div>
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
    };

    const listeners: Array<{ type: string; layer: string; listener: any }> = [];

    const cleanupListeners = () => {
      listeners.forEach(({ type, layer, listener }) => {
        if (map && map.loaded()) map.off(type as any, layer, listener);
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
    geoJsonUsaha,
    geoJsonUsahaDigital,
    geoJsonUsahaPertanian,
    geoJsonRt,
    geoJsonDesaBoundary,
    geoJsonDesaSelected,
    dataKab,
    theme,
    store.showSls,
    store.showUsaha,
    store.showUsahaDigital,
    store.showUsahaPertanian,
    store.showRt,
    store.showKab,
    store.filterKecamatan,
    store.filterDesa,
  ]);

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
    if (store.filterDesa && store.filterDesa !== "Semua" && geoJsonDesaSelected?.features?.length > 0) {
      bbox = calculateBbox(geoJsonDesaSelected);
    } 
    // 2. Prioritas kedua: Kalau ada Kecamatan yang dipilih (tapi Desa "Semua")
    else if (store.filterKecamatan && store.filterKecamatan !== "Semua" && geoJsonDesaBoundary?.features?.length > 0) {
      bbox = calculateBbox(geoJsonDesaBoundary);
    } 
    // 3. Prioritas terakhir: Balik ke Kabupaten
    else if (dataKab?.features?.length > 0) {
      bbox = calculateBbox(dataKab);
    }

    // Kalau koordinat bbox dapet, lakuin efek "Woozz"
    if (bbox && bbox.length === 4) {
      map.fitBounds(
        [[bbox[0], bbox[1]], [bbox[2], bbox[3]]], 
        {
          padding: 80,         // Kasih jarak pinggir biar wilayahnya nggak mepet layar
          duration: 2500,      // Durasi 2.5 detik biar efek terbangnya kerasa banget
          pitch: store.enable3d ? 60 : 0, // Kalau lagi 3D, pertahankan angle-nya
          essential: true,     // Maksa Maplibre jalanin animasi ini tanpa ragu
          curve: 1.5,          // Bikin kurva terbangnya makin melengkung ala "woozz"
        }
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
  store.enable3d
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
        className="absolute z-50 bg-popover/95 backdrop-blur-xl text-popover-foreground border border-border/80 shadow-2xl rounded-2xl p-4 text-xs pointer-events-none w-[315px] hidden transition-transform duration-75"
        style={{ left: 0, top: 0, transform: "translate3d(0, 0, 0)" }}
      />
    </div>
  );
}
