import React, { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { Map } from "@/components/ui/map";
import { Skeleton } from "@/components/ui/skeleton";

interface AssignmentMapProps {
  assignments: string[];
  role: string;
}

const AssignmentMap: React.FC<AssignmentMapProps> = ({ assignments }) => {
  const mapRef = useRef<maplibregl.Map>(null);
  const [geoData, setGeoData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load simplified regions GeoJSON (Desa level)
    fetch("/data/regions.json")
      .then((res) => res.json())
      .then((data) => {
        setGeoData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading map data:", err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !geoData) return;

    if (!map.loaded()) {
      map.once('load', () => renderLayer(map));
    } else {
      renderLayer(map);
    }

    function renderLayer(mapInstance: maplibregl.Map) {
      if (!mapInstance.getSource('assignment-source')) {
        mapInstance.addSource('assignment-source', {
          type: 'geojson',
          data: geoData
        });

        mapInstance.addLayer({
          id: 'assignment-fill',
          type: 'fill',
          source: 'assignment-source',
          paint: {
            'fill-color': [
              'case',
              // Logic to check if feature is assigned
              // This is a simple approximation; normally we'd dynamically update feature state or properties
              ['boolean', false], '#4f46e5',
              '#f5f5f4'
            ],
            'fill-opacity': 0.6
          }
        });

        mapInstance.addLayer({
          id: 'assignment-line',
          type: 'line',
          source: 'assignment-source',
          paint: {
            'line-color': '#d6d3d1',
            'line-width': 1
          }
        });
      }

      // Update color dynamically based on assignments
      // We will mutate the GeoJSON properties and re-set data
      const updatedGeoData = {
        ...geoData,
        features: geoData.features.map((f: any) => {
          const idkec = f.properties.idkec;
          const iddesa = f.properties.iddesa;
          const isAssigned = assignments.includes(iddesa) || assignments.includes(idkec);
          return {
            ...f,
            properties: {
              ...f.properties,
              isAssigned
            }
          };
        })
      };

      (mapInstance.getSource('assignment-source') as maplibregl.GeoJSONSource).setData(updatedGeoData);
      
      mapInstance.setPaintProperty('assignment-fill', 'fill-color', [
        'case',
        ['==', ['get', 'isAssigned'], true], '#4f46e5',
        '#f5f5f4'
      ]);

      // Fit Bounds to assigned features
      const assignedFeatures = updatedGeoData.features.filter((f: any) => f.properties.isAssigned);
      if (assignedFeatures.length > 0) {
        // Simple bounds calculation
        let minLng = 180, minLat = 90, maxLng = -180, maxLat = -90;
        assignedFeatures.forEach((f: any) => {
          if (f.geometry.type === 'Polygon') {
            f.geometry.coordinates[0].forEach((coord: number[]) => {
              minLng = Math.min(minLng, coord[0]);
              maxLng = Math.max(maxLng, coord[0]);
              minLat = Math.min(minLat, coord[1]);
              maxLat = Math.max(maxLat, coord[1]);
            });
          }
        });
        if (minLng < 180) {
          mapInstance.fitBounds([[minLng, minLat], [maxLng, maxLat]], { padding: 20 });
        }
      }
    }

  }, [geoData, assignments]);

  if (loading) {
    return <Skeleton className="w-full h-full" />;
  }

  return (
    <div className="w-full h-full relative">
      <Map
        ref={mapRef}
        viewport={{ center: [114.3691, -8.2192], zoom: 10, pitch: 0, bearing: 0 }}
      />
    </div>
  );
};

export default AssignmentMap;
