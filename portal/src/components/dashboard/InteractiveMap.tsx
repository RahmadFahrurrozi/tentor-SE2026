import { useState, useRef, useEffect, useMemo } from 'react';
import { Map, MapControls } from "@/components/ui/map";
import maplibregl from "maplibre-gl";

import { processSlsData, convertBangunanToGeoJson, convertTitikToGeoJson, calculateBbox } from '@/utils/dataProcessing';
import { useMapStore } from '@/store/mapStore';
import { useTheme } from '@/context/theme-provider';

export function InteractiveMap({ spatialData }: { spatialData: any }) {
  const mapRef = useRef<maplibregl.Map>(null);
  const store = useMapStore();
  const { theme } = useTheme();
  
  const [hoverInfo, setHoverInfo] = useState<{
    x: number;
    y: number;
    properties: any;
    layerId: string;
  } | null>(null);

  const [selectedPoint, setSelectedPoint] = useState<{
    lng: number;
    lat: number;
    type: 'usaha' | 'rt' | 'usaha-digital';
    name: string;
    kategori: string;
    alamat: string;
  } | null>(null);

  const [hoveredSlsId, setHoveredSlsId] = useState<string | null>(null);
  
  const {
    dataUsaha,
    dataUsahaDigital,
    dataRumahTangga,
    dataBangunan,
    dataSls,
    dataKab,
    dataDesa,
    isLoading,
    error
  } = spatialData;

  const [viewState, setViewState] = useState({
    center: [114.3692, -8.2192] as [number, number],
    zoom: 10,
    pitch: 45, // Set pitch untuk 3D view
    bearing: 0
  });

  // Proses data SLS
  const processedSls = useMemo(() => {
    if (!dataSls || isLoading) return null;
    return processSlsData(
      dataSls, 
      dataUsaha, 
      dataUsahaDigital, 
      dataRumahTangga, 
      dataBangunan
    );
  }, [dataSls, dataUsaha, dataUsahaDigital, dataRumahTangga, dataBangunan, isLoading]);

  // Filter SLS berdasarkan Desa
  const filteredSls = useMemo(() => {
    if (!processedSls) return null;
    if (store.filterDesa === 'Semua') return processedSls;
    return {
      ...processedSls,
      features: processedSls.features.filter((f: any) => {
        const iddesa = f.properties.iddesa || String(f.properties.idsls_str || '').substring(0, 10);
        return String(iddesa) === store.filterDesa;
      })
    };
  }, [processedSls, store.filterDesa]);

  // Filter Batas Desa (Regions)
  const geoJsonDesaBoundary = useMemo(() => {
    if (!dataDesa || store.filterKecamatan === 'Semua') return null;
    const features = dataDesa.features.filter((f: any) => {
      const idkec = f.properties.idkec || f.properties.id_kec || String(f.properties.iddesa || '').substring(0, 7);
      return String(idkec) === store.filterKecamatan;
    });
    return {
      type: 'FeatureCollection',
      features
    };
  }, [dataDesa, store.filterKecamatan]);

  const filterDataByDesa = (data: any[]) => {
    if (store.filterDesa === 'Semua' || !data || !data.length) return data;
    return data.filter(row => {
      const idslsStr = String(row['idsls_str'] || row['idsls final'] || '');
      return idslsStr.substring(0, 10) === store.filterDesa;
    });
  };

  const geoJsonBangunan = useMemo(() => {
    if (!dataBangunan.length || isLoading) return null;
    return convertBangunanToGeoJson(filterDataByDesa(dataBangunan));
  }, [dataBangunan, isLoading, store.filterDesa]);

  const geoJsonUsaha = useMemo(() => {
    if (!dataUsaha.length || isLoading) return null;
    return convertTitikToGeoJson(filterDataByDesa(dataUsaha));
  }, [dataUsaha, isLoading, store.filterDesa]);

  const geoJsonUsahaDigital = useMemo(() => {
    if (!dataUsahaDigital.length || isLoading) return null;
    return convertTitikToGeoJson(filterDataByDesa(dataUsahaDigital));
  }, [dataUsahaDigital, isLoading, store.filterDesa]);

  const geoJsonRt = useMemo(() => {
    if (!dataRumahTangga.length || isLoading) return null;
    return convertTitikToGeoJson(filterDataByDesa(dataRumahTangga));
  }, [dataRumahTangga, isLoading, store.filterDesa]);

  // Animasi Pulsating Glow (Riak Memancar)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedPoint) return;

    const runAnimation = () => {
      const coords = [selectedPoint.lng, selectedPoint.lat];
      const geojson = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: coords
          },
          properties: {}
        }]
      };

      const color = selectedPoint.type === 'usaha' 
        ? '#F59E0B' 
        : selectedPoint.type === 'usaha-digital' 
          ? '#FF32DC' 
          : '#2563EB';

      if (map.getSource('selected-point-source')) {
        (map.getSource('selected-point-source') as maplibregl.GeoJSONSource).setData(geojson as any);
      } else {
        map.addSource('selected-point-source', {
          type: 'geojson',
          data: geojson as any
        });
      }

      // Layer Lingkaran Luar (Riak Memancar)
      if (!map.getLayer('selected-point-glow-outer')) {
        map.addLayer({
          id: 'selected-point-glow-outer',
          type: 'circle',
          source: 'selected-point-source',
          paint: {
            'circle-radius': 5,
            'circle-color': color,
            'circle-opacity': 1.0,
            'circle-stroke-width': 1,
            'circle-stroke-color': color,
            'circle-pitch-alignment': 'map'
          }
        });
      } else {
        map.setPaintProperty('selected-point-glow-outer', 'circle-color', color);
        map.setPaintProperty('selected-point-glow-outer', 'circle-stroke-color', color);
      }

      // Layer Lingkaran Inti Solid
      if (!map.getLayer('selected-point-glow-inner')) {
        map.addLayer({
          id: 'selected-point-glow-inner',
          type: 'circle',
          source: 'selected-point-source',
          paint: {
            'circle-radius': 6,
            'circle-color': '#ffffff',
            'circle-stroke-width': 2.5,
            'circle-stroke-color': color
          }
        });
      } else {
        map.setPaintProperty('selected-point-glow-inner', 'circle-stroke-color', color);
      }

      let animationFrameId: number;
      let start: number | null = null;
      const duration = 1500;

      const animate = (timestamp: number) => {
        if (!start) start = timestamp;
        const progress = ((timestamp - start) % duration) / duration;

        const radius = 5 + progress * 45;
        const opacity = 1.0 - progress;

        if (map.getLayer('selected-point-glow-outer')) {
          map.setPaintProperty('selected-point-glow-outer', 'circle-radius', radius);
          map.setPaintProperty('selected-point-glow-outer', 'circle-opacity', opacity * 0.85);
        }

        animationFrameId = requestAnimationFrame(animate);
      };

      animationFrameId = requestAnimationFrame(animate);

      return () => {
        cancelAnimationFrame(animationFrameId);
      };
    };

    let cleanupAnim: (() => void) | undefined;
    if (map.loaded()) {
      cleanupAnim = runAnimation();
    } else {
      map.once('load', () => {
        cleanupAnim = runAnimation();
      });
    }

    return () => {
      if (cleanupAnim) cleanupAnim();
      if (map.getLayer('selected-point-glow-outer')) map.removeLayer('selected-point-glow-outer');
      if (map.getLayer('selected-point-glow-inner')) map.removeLayer('selected-point-glow-inner');
      if (map.getSource('selected-point-source')) map.removeSource('selected-point-source');
    };
  }, [selectedPoint]);

  // Efek untuk update filter hover SLS
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.loaded()) return;

    if (map.getLayer('sls-hover-line-layer')) {
      if (hoveredSlsId) {
        map.setFilter('sls-hover-line-layer', ['==', ['get', 'idsls_str'], hoveredSlsId]);
        map.setPaintProperty('sls-hover-line-layer', 'line-opacity', 0.95);
      } else {
        map.setPaintProperty('sls-hover-line-layer', 'line-opacity', 0);
      }
    }
  }, [hoveredSlsId]);

  // Efek untuk mengupdate layer peta
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Tunggu sampai map ready/loaded
    if (!map.loaded()) {
      map.once('load', addLayers);
    } else {
      addLayers();
    }

    function addLayers() {
      if (!map) return;

      // 0. Tambahkan Source/Layer Outline Kabupaten Banyuwangi
      if (dataKab) {
        if (map.getSource('kab-source')) {
          (map.getSource('kab-source') as maplibregl.GeoJSONSource).setData(dataKab);
        } else {
          map.addSource('kab-source', {
            type: 'geojson',
            data: dataKab
          });

          map.addLayer({
            id: 'kab-line-layer',
            type: 'line',
            source: 'kab-source',
            paint: {
              'line-color': '#00ffcc',
              'line-width': 1.5,
              'line-opacity': 0.7
            }
          });
        }
      }

      // 0b. Tambahkan Source/Layer Batas Kecamatan & Desa
      if (geoJsonDesaBoundary) {
        if (map.getSource('desa-boundary-source')) {
          (map.getSource('desa-boundary-source') as maplibregl.GeoJSONSource).setData(geoJsonDesaBoundary as any);
        } else {
          map.addSource('desa-boundary-source', {
            type: 'geojson',
            data: geoJsonDesaBoundary as any
          });

          // Layer Batas Desa (Indigo tipis)
          map.addLayer({
            id: 'desa-boundary-layer',
            type: 'line',
            source: 'desa-boundary-source',
            paint: {
              'line-color': theme === 'dark' ? 'rgba(129, 140, 248, 0.5)' : 'rgba(99, 102, 241, 0.5)',
              'line-width': 1.8
            }
          });

          // Layer Batas Kecamatan (Indigo tebal)
          map.addLayer({
            id: 'kec-boundary-layer',
            type: 'line',
            source: 'desa-boundary-source',
            paint: {
              'line-color': theme === 'dark' ? 'rgba(99, 102, 241, 0.8)' : 'rgba(79, 70, 229, 0.8)',
              'line-width': 3.0
            }
          });
        }
      } else {
        if (map.getSource('desa-boundary-source')) {
          (map.getSource('desa-boundary-source') as maplibregl.GeoJSONSource).setData({
            type: 'FeatureCollection',
            features: []
          });
        }
      }
      
      // 1. Tambahkan Source SLS
      if (filteredSls) {
        if (map.getSource('sls-source')) {
          (map.getSource('sls-source') as maplibregl.GeoJSONSource).setData(filteredSls);
        } else {
          map.addSource('sls-source', {
            type: 'geojson',
            data: filteredSls as any
          });

          // 2. Tambahkan Layer SLS (Polygon) - Menggunakan Warna Netral Bersih (Bukan Choropleth)
          map.addLayer({
            id: 'sls-fill-layer',
            type: 'fill',
            source: 'sls-source',
            paint: {
              'fill-color': theme === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(79, 70, 229, 0.03)',
              'fill-opacity': 0.7
            }
          });

          // Layer Batas SLS (Outline tipis)
          map.addLayer({
            id: 'sls-line-layer',
            type: 'line',
            source: 'sls-source',
            paint: {
              'line-color': theme === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(15, 23, 42, 0.1)',
              'line-width': 0.8
            }
          });

          // Layer Hover Highlight Putih
          map.addLayer({
            id: 'sls-hover-line-layer',
            type: 'line',
            source: 'sls-source',
            filter: ['==', ['get', 'idsls_str'], ''],
            paint: {
              'line-color': '#ffffff',
              'line-width': 3,
              'line-opacity': 0
            }
          });
        }
      } else {
        if (map.getSource('sls-source')) {
          (map.getSource('sls-source') as maplibregl.GeoJSONSource).setData({
            type: 'FeatureCollection',
            features: []
          });
        }
      }

      // 3. Tambahkan Layer Bangunan 3D - Warna Kuning (Usaha) & Biru (RT)
      if (geoJsonBangunan) {
        if (map.getSource('bangunan-source')) {
          (map.getSource('bangunan-source') as maplibregl.GeoJSONSource).setData(geoJsonBangunan as any);
        } else {
          map.addSource('bangunan-source', {
            type: 'geojson',
            data: geoJsonBangunan as any
          });

          map.addLayer({
            id: 'bangunan-3d-layer',
            type: 'fill-extrusion',
            source: 'bangunan-source',
            paint: {
              'fill-extrusion-color': [
                'match',
                ['get', 'status_bangunan'],
                'Bangunan Usaha', '#F59E0B',
                'Rumah Tangga', '#2563EB',
                '#808080' // default
              ],
              'fill-extrusion-height': 20,
              'fill-extrusion-base': 0,
              'fill-extrusion-opacity': 0.8
            }
          });
        }
      } else {
        if (map.getSource('bangunan-source')) {
          (map.getSource('bangunan-source') as maplibregl.GeoJSONSource).setData({
            type: 'FeatureCollection',
            features: []
          });
        }
      }

      // 4. Tambahkan Layer Titik Usaha (Kuning Emas Premium)
      if (geoJsonUsaha) {
        if (map.getSource('usaha-source')) {
          (map.getSource('usaha-source') as maplibregl.GeoJSONSource).setData(geoJsonUsaha as any);
        } else {
          map.addSource('usaha-source', {
            type: 'geojson',
            data: geoJsonUsaha as any
          });

          map.addLayer({
            id: 'usaha-circle-layer',
            type: 'circle',
            source: 'usaha-source',
            layout: { visibility: store.showUsaha ? 'visible' : 'none' },
            paint: {
              'circle-radius': 7,
              'circle-color': '#F59E0B',
              'circle-stroke-width': 1.2,
              'circle-stroke-color': '#ffffff'
            }
          });
        }
      } else {
        if (map.getSource('usaha-source')) {
          (map.getSource('usaha-source') as maplibregl.GeoJSONSource).setData({
            type: 'FeatureCollection',
            features: []
          });
        }
      }

      // 5. Tambahkan Layer Titik Usaha Digital
      if (geoJsonUsahaDigital) {
        if (map.getSource('usaha-digital-source')) {
          (map.getSource('usaha-digital-source') as maplibregl.GeoJSONSource).setData(geoJsonUsahaDigital as any);
        } else {
          map.addSource('usaha-digital-source', {
            type: 'geojson',
            data: geoJsonUsahaDigital as any
          });

          map.addLayer({
            id: 'usaha-digital-circle-layer',
            type: 'circle',
            source: 'usaha-digital-source',
            layout: { visibility: store.showUsahaDigital ? 'visible' : 'none' },
            paint: {
              'circle-radius': 5,
              'circle-color': '#FF32DC',
              'circle-stroke-width': 1,
              'circle-stroke-color': '#ffffff'
            }
          });
        }
      } else {
        if (map.getSource('usaha-digital-source')) {
          (map.getSource('usaha-digital-source') as maplibregl.GeoJSONSource).setData({
            type: 'FeatureCollection',
            features: []
          });
        }
      }

      // 6. Tambahkan Layer Titik Rumah Tangga (Biru Royal Premium)
      if (geoJsonRt) {
        if (map.getSource('rt-source')) {
          (map.getSource('rt-source') as maplibregl.GeoJSONSource).setData(geoJsonRt as any);
        } else {
          map.addSource('rt-source', {
            type: 'geojson',
            data: geoJsonRt as any
          });

          map.addLayer({
            id: 'rt-circle-layer',
            type: 'circle',
            source: 'rt-source',
            layout: { visibility: store.showRt ? 'visible' : 'none' },
            paint: {
              'circle-radius': 3.5,
              'circle-color': '#2563EB',
              'circle-stroke-width': 0.8,
              'circle-stroke-color': '#ffffff'
            }
          });
        }
      } else {
        if (map.getSource('rt-source')) {
          (map.getSource('rt-source') as maplibregl.GeoJSONSource).setData({
            type: 'FeatureCollection',
            features: []
          });
        }
      }

      // Setup Events untuk Tooltip & Hover
      const layers = [
        'sls-fill-layer', 
        'bangunan-3d-layer', 
        'usaha-circle-layer', 
        'usaha-digital-circle-layer', 
        'rt-circle-layer'
      ];
      
      layers.forEach(layerId => {
        map.on('mousemove', layerId, (e) => {
          if (e.features && e.features.length > 0) {
            map.getCanvas().style.cursor = 'pointer';
            
            // Set hover highlight jika di SLS
            if (layerId === 'sls-fill-layer') {
              const idsls = e.features[0].properties.idsls_str;
              setHoveredSlsId(idsls);
            }

            setHoverInfo({
              x: e.point.x,
              y: e.point.y,
              properties: e.features[0].properties,
              layerId
            });
          }
        });

        map.on('mouseleave', layerId, () => {
          map.getCanvas().style.cursor = '';
          setHoverInfo(null);
          if (layerId === 'sls-fill-layer') {
            setHoveredSlsId(null);
          }
        });

        // Event Klik untuk memunculkan Popup Premium & Riak Pancaran Lebar
        if (['usaha-circle-layer', 'usaha-digital-circle-layer', 'rt-circle-layer'].includes(layerId)) {
          map.on('click', layerId, (e) => {
            if (!e.features || e.features.length === 0) return;
            const props = e.features[0].properties;
            
            const type = layerId === 'usaha-circle-layer' 
              ? 'usaha' 
              : layerId === 'usaha-digital-circle-layer'
                ? 'usaha-digital'
                : 'rt';
            const nama = props['nama final'] || props['nama_krt'] || props['nama'] || props['nama_kpl'] || (type === 'rt' ? 'Rumah Tangga' : 'Titik Usaha');
            const alamat = props['alamat final'] || props['alamat'] || '-';
            const kategori = props['kategori'] || props['jenis_rt'] || '-';

            // Set state to trigger pulsating ripple
            setSelectedPoint({
              lng: e.lngLat.lng,
              lat: e.lngLat.lat,
              type,
              name: nama,
              kategori,
              alamat
            });

            const badgeColor = type === 'usaha' 
              ? 'background-color: rgba(245, 158, 11, 0.15); color: #F59E0B; border: 1px solid rgba(245, 158, 11, 0.3);' 
              : type === 'usaha-digital'
                ? 'background-color: rgba(255, 50, 220, 0.15); color: #FF32DC; border: 1px solid rgba(255, 50, 220, 0.3);'
                : 'background-color: rgba(37, 99, 235, 0.15); color: #2563EB; border: 1px solid rgba(37, 99, 235, 0.3);';

            const badgeLabel = type === 'usaha'
              ? 'Usaha Biasa'
              : type === 'usaha-digital'
                ? 'Usaha Digital'
                : 'Rumah Tangga';

            const iconSvg = type === 'rt' 
              ? `<svg style="width: 14px; height: 14px; margin-right: 4px; display: inline-block; vertical-align: middle;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`
              : `<svg style="width: 14px; height: 14px; margin-right: 4px; display: inline-block; vertical-align: middle;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 7h-9L4 12V5a2 2 0 0 0-2-2H1a1 1 0 0 0-1 1v19a1 1 0 0 0 1 1h22a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1z"/><path d="M16 11V7h-4v4"/></svg>`;

            const html = `
              <div style="
                font-family: 'Outfit', 'Inter', sans-serif;
                color: ${theme === 'dark' ? '#f8fafc' : '#0f172a'};
                padding: 14px;
                border-radius: 16px;
                max-width: 260px;
                background: ${theme === 'dark' ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)'};
                backdrop-filter: blur(8px);
                border: 1px solid ${theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)'};
                box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
              ">
                <!-- Header Badge -->
                <div style="margin-bottom: 10px; display: flex; align-items: center; justify-content: space-between;">
                  <span style="
                    font-size: 10px;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    padding: 3px 8px;
                    border-radius: 9999px;
                    display: inline-flex;
                    align-items: center;
                    ${badgeColor}
                  ">
                    ${iconSvg}
                    ${badgeLabel}
                  </span>
                </div>

                <!-- Entity Name -->
                <h3 style="
                  margin: 0 0 6px 0;
                  font-size: 14px;
                  font-weight: 700;
                  line-height: 1.3;
                  letter-spacing: -0.01em;
                ">
                  ${nama}
                </h3>

                <!-- Category Details -->
                <div style="
                  margin-bottom: 8px;
                  font-size: 11px;
                  color: ${theme === 'dark' ? '#94a3b8' : '#64748b'};
                ">
                  <span style="font-weight: 500;">Kategori:</span> 
                  <span style="font-weight: 600; color: ${theme === 'dark' ? '#cbd5e1' : '#334155'};">${kategori}</span>
                </div>

                <!-- Divider -->
                <div style="
                  height: 1px;
                  background: ${theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)'};
                  margin: 10px 0;
                "></div>

                <!-- Address Section -->
                <div style="
                  display: flex;
                  align-items: flex-start;
                  font-size: 11px;
                  line-height: 1.4;
                  color: ${theme === 'dark' ? '#cbd5e1' : '#475569'};
                ">
                  <svg style="width: 14px; height: 14px; margin-right: 6px; flex-shrink: 0; margin-top: 1px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                  <span>${alamat}</span>
                </div>
              </div>
            `;
            
            new maplibregl.Popup({ 
              closeButton: true, 
              closeOnClick: true, 
              maxWidth: '280px',
              className: 'premium-maplibre-popup'
            })
              .setLngLat(e.lngLat)
              .setHTML(html)
              .addTo(map);
          });
        }
      });
    }
  }, [filteredSls, geoJsonBangunan, geoJsonUsaha, dataKab, geoJsonUsahaDigital, geoJsonRt, geoJsonDesaBoundary, theme]);

  // Efek untuk Auto-Zoom saat filter berubah
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const zoomToFeature = () => {
      if (store.filterKecamatan !== 'Semua' && filteredSls) {
        let geoToUse = filteredSls as any;
        if (store.filterDesa !== 'Semua') {
          const desaFeatures = filteredSls.features.filter((f: any) => {
            const iddesa = f.properties.iddesa || String(f.properties.idsls_str || '').substring(0, 10);
            return String(iddesa) === store.filterDesa;
          });
          if (desaFeatures.length > 0) {
            geoToUse = { type: 'FeatureCollection', features: desaFeatures };
          }
        }
        const bbox = calculateBbox(geoToUse);
        if (bbox) {
          map.fitBounds(bbox, { padding: 50, duration: 1000 });
        }
      } else if (store.filterKecamatan === 'Semua' && dataKab) {
        const bbox = calculateBbox(dataKab);
        if (bbox) {
          map.fitBounds(bbox, { padding: 50, duration: 1000 });
        }
      }
    };

    if (map.loaded()) {
      zoomToFeature();
    } else {
      map.once('load', zoomToFeature);
    }
  }, [store.filterKecamatan, store.filterDesa, filteredSls, dataKab]);

  // Efek untuk mengatur 3D Mode
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const toggle3d = () => {
      map.easeTo({
        pitch: store.enable3d ? 60 : 0,
        duration: 1000
      });
    };

    if (map.loaded()) {
      toggle3d();
    } else {
      map.once('load', toggle3d);
    }
  }, [store.enable3d]);

  // Efek untuk mengatur visibilitas layer berdasarkan MapStore
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.loaded()) return;

    const setVisibility = (layerId: string, isVisible: boolean) => {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, 'visibility', isVisible ? 'visible' : 'none');
      }
    };

    // Toggle SLS
    setVisibility('sls-fill-layer', store.showSls);
    setVisibility('sls-line-layer', store.showSls);
    
    // Toggle Bangunan 3D
    setVisibility('bangunan-3d-layer', store.showBuild);
    
    // Toggle Titik Usaha
    setVisibility('usaha-circle-layer', store.showUsaha);
    
    // Toggle Titik Usaha Digital
    setVisibility('usaha-digital-circle-layer', store.showUsahaDigital);

    // Toggle Titik Rumah Tangga
    setVisibility('rt-circle-layer', store.showRt);

    // Toggle Outline Kabupaten
    setVisibility('kab-line-layer', store.showKab);
    
  }, [
    store.showSls,
    store.showBuild,
    store.showUsaha,
    store.showUsahaDigital,
    store.showRt,
    store.showKab,
    filteredSls
  ]);

  return (
    <div className="relative h-full w-full rounded-xl overflow-hidden border">
      <style>{`
        .premium-maplibre-popup {
          z-index: 9999 !important;
          pointer-events: auto !important;
        }
        .premium-maplibre-popup .maplibregl-popup-content {
          background: transparent !important;
          box-shadow: none !important;
          padding: 0 !important;
          border: none !important;
          position: relative !important;
          pointer-events: auto !important;
        }
        .premium-maplibre-popup .maplibregl-popup-close-button {
          position: absolute !important;
          color: ${theme === 'dark' ? '#cbd5e1' : '#475569'} !important;
          font-size: 20px !important;
          right: 14px !important;
          top: 14px !important;
          font-weight: bold !important;
          background: transparent !important;
          border: none !important;
          outline: none !important;
          z-index: 99999 !important;
          pointer-events: auto !important;
          cursor: pointer !important;
        }
        .premium-maplibre-popup .maplibregl-popup-close-button:hover {
          color: ${theme === 'dark' ? '#f8fafc' : '#0f172a'} !important;
        }
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
        theme={theme === 'dark' ? 'dark' : 'light'} 
        projection={{ type: "globe" }} // Menggunakan proyeksi globe 3D
      >
        <MapControls 
          position="bottom-right" 
          showZoom={true} 
          showCompass={true} 
          showFullscreen={true} 
        />
      </Map>

      {/* Tooltip Overlay */}
      {hoverInfo && (
        <div 
          className="absolute z-50 bg-popover/95 backdrop-blur-sm text-popover-foreground border shadow-lg rounded-lg p-3 text-sm pointer-events-none w-[250px]"
          style={{ left: hoverInfo.x + 15, top: hoverInfo.y + 15 }}
        >
          {hoverInfo.layerId === 'sls-fill-layer' && (
            <>
              <p className="font-bold border-b pb-1 mb-2">Info SLS: {hoverInfo.properties.idsls_str}</p>
              <p>Jumlah Usaha: <span className="font-semibold">{hoverInfo.properties.jumlah_usaha}</span></p>
              <p>Jumlah Keluarga: <span className="font-semibold">{hoverInfo.properties.jumlah_keluarga}</span></p>
              <p>Total Bangunan: <span className="font-semibold">{hoverInfo.properties.total_bangunan}</span></p>
            </>
          )}
          {hoverInfo.layerId === 'bangunan-3d-layer' && (
            <>
              <p className="font-bold border-b pb-1 mb-2">Bangunan Fisik</p>
              <p>Status: <span className="font-semibold">{hoverInfo.properties.status_bangunan || '-'}</span></p>
              <p>Jml Usaha: <span className="font-semibold">{hoverInfo.properties.jml_usaha || '0'}</span></p>
            </>
          )}
          {['usaha-circle-layer', 'usaha-digital-circle-layer', 'rt-circle-layer'].includes(hoverInfo.layerId) && (
            <>
              <p className="font-bold border-b pb-1 mb-2">
                {hoverInfo.properties['nama final'] || hoverInfo.properties['nama_krt'] || 'Titik Lokasi'}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {hoverInfo.properties['alamat final'] || hoverInfo.properties['alamat'] || '-'}
              </p>
              <p className="mt-1">
                Kategori: <span className="font-semibold">{hoverInfo.properties['kategori'] || hoverInfo.properties['jenis_rt'] || '-'}</span>
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
