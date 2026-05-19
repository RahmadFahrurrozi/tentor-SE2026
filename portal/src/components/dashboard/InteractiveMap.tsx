import { useState, useRef, useEffect, useMemo } from 'react';
import { Map, MapControls } from "@/components/ui/map";
import { Loader2 } from "lucide-react";
import maplibregl from "maplibre-gl";

import { useSpatialData } from '@/hooks/useSpatialData';
import { processSlsData, convertBangunanToGeoJson, convertTitikToGeoJson } from '@/utils/dataProcessing';
import { useMapStore } from '@/store/mapStore';

export function InteractiveMap() {
  const mapRef = useRef<maplibregl.Map>(null);
  const store = useMapStore();
  
  const [hoverInfo, setHoverInfo] = useState<{
    x: number;
    y: number;
    properties: any;
    layerId: string;
  } | null>(null);
  
  const {
    dataUsaha,
    dataUsahaDigital,
    dataRumahTangga,
    dataBangunan,
    dataSls,
    isLoading,
    error
  } = useSpatialData();

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

  const geoJsonBangunan = useMemo(() => {
    if (!dataBangunan.length || isLoading) return null;
    return convertBangunanToGeoJson(dataBangunan);
  }, [dataBangunan, isLoading]);

  const geoJsonUsaha = useMemo(() => {
    if (!dataUsaha.length || isLoading) return null;
    return convertTitikToGeoJson(dataUsaha);
  }, [dataUsaha, isLoading]);

  // Efek untuk mengupdate layer peta
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !processedSls) return;

    // Tunggu sampai map ready/loaded
    if (!map.loaded()) {
      map.once('load', addLayers);
    } else {
      addLayers();
    }

    function addLayers() {
      if (!map) return;
      
      // 1. Tambahkan Source SLS
      if (map.getSource('sls-source')) {
        (map.getSource('sls-source') as maplibregl.GeoJSONSource).setData(processedSls);
      } else {
        map.addSource('sls-source', {
          type: 'geojson',
          data: processedSls as any
        });

        // 2. Tambahkan Layer SLS (Polygon)
        map.addLayer({
          id: 'sls-fill-layer',
          type: 'fill',
          source: 'sls-source',
          paint: {
            'fill-color': [
              'interpolate',
              ['linear'],
              ['get', 'jumlah_usaha'],
              0, 'rgba(60, 20, 120, 0.6)', // 0 usaha
              10, 'rgba(120, 20, 180, 0.7)',
              50, 'rgba(180, 60, 120, 0.75)',
              100, 'rgba(220, 80, 60, 0.8)',
              200, 'rgba(255, 30, 30, 0.9)'
            ],
            'fill-opacity': 0.7,
            'fill-outline-color': '#ffffff'
          }
        });

        // Layer Batas (Outline)
        map.addLayer({
          id: 'sls-line-layer',
          type: 'line',
          source: 'sls-source',
          paint: {
            'line-color': 'rgba(200, 200, 255, 0.3)',
            'line-width': 1
          }
        });
      }

      // 3. Tambahkan Layer Bangunan 3D
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
                'Bangunan Usaha', '#ffdc32',
                'Rumah Tangga', '#0072bc',
                '#808080' // default
              ],
              'fill-extrusion-height': 20, // Tinggi statis untuk demo
              'fill-extrusion-base': 0,
              'fill-extrusion-opacity': 0.8
            }
          });
        }
      }

      // 4. Tambahkan Layer Titik Usaha
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
            paint: {
              'circle-radius': 5,
              'circle-color': '#ffdc32',
              'circle-stroke-width': 1,
              'circle-stroke-color': '#ffffff'
            }
          });
        }
      }

      // Setup Events untuk Tooltip
      const layers = ['sls-fill-layer', 'bangunan-3d-layer', 'usaha-circle-layer'];
      
      layers.forEach(layerId => {
        map.on('mousemove', layerId, (e) => {
          if (e.features && e.features.length > 0) {
            map.getCanvas().style.cursor = 'pointer';
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
        });
      });
    }
  }, [processedSls, geoJsonBangunan, geoJsonUsaha]);

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
    
  }, [
    store.showSls,
    store.showBuild,
    store.showUsaha,
    store.showUsahaDigital,
    store.showRt,
    processedSls // Re-run when data is ready
  ]);

  return (
    <div className="relative h-full w-full rounded-xl overflow-hidden border">
      {isLoading && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
          <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
          <p className="text-sm font-medium text-foreground">Memuat dan memproses data spasial Parquet...</p>
        </div>
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
        theme="dark" // Memaksa tema dark seperti yang direquest
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
          {hoverInfo.layerId === 'usaha-circle-layer' && (
            <>
              <p className="font-bold border-b pb-1 mb-2">{hoverInfo.properties['nama final'] || 'Titik Usaha'}</p>
              <p className="text-xs text-muted-foreground truncate">{hoverInfo.properties['alamat final'] || '-'}</p>
              <p className="mt-1">Kategori: <span className="font-semibold">{hoverInfo.properties['kategori'] || '-'}</span></p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
