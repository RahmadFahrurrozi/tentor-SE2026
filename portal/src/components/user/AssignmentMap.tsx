import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Skeleton } from "@/components/ui/skeleton";

// Fix Leaflet icons
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface AssignmentMapProps {
  assignments: string[];
  role: string;
}

const AssignmentMap: React.FC<AssignmentMapProps> = ({ assignments }) => {
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

  if (loading) {
    return <Skeleton className="w-full h-full" />;
  }

  const mapStyle = (feature: any) => {
    // Logic to check if feature is assigned
    // For now, this only works if properties in geoData match assignments
    const idkec = feature.properties.idkec;
    const iddesa = feature.properties.iddesa;

    const isAssigned =
      assignments.includes(iddesa) || assignments.includes(idkec);

    return {
      fillColor: isAssigned ? "#4f46e5" : "#f5f5f4",
      weight: 1,
      opacity: 1,
      color: isAssigned ? "#4338ca" : "#d6d3d1",
      fillOpacity: isAssigned ? 0.6 : 0.2,
    };
  };

  return (
    <div className="w-full h-full relative">
      <MapContainer
        center={[-8.2192, 114.3691]}
        zoom={10}
        className="w-full h-full"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {geoData && (
          <GeoJSON
            data={geoData}
            style={mapStyle}
            onEachFeature={(feature, layer) => {
              const props = feature.properties;
              const isAssigned = isAssignedFeature(feature, assignments);

              layer.bindTooltip(
                `
                 <div class="px-2 py-1">
                   <p class="text-xs font-semibold">${props.nmdesa || props.nmkec || "Wilayah"}</p>
                   <p class="text-[10px] text-stone-500">${props.nmkec}</p>
                   ${isAssigned ? '<span class="text-[10px] text-indigo-600 font-bold">DITUGASKAN</span>' : ""}
                 </div>
               `,
                { sticky: true },
              );
            }}
          />
        )}
        <MapAutoFit geoData={geoData} assignments={assignments} />
      </MapContainer>
    </div>
  );
};

// Helper to check if feature is assigned
function isAssignedFeature(feature: any, assignments: string[]) {
  const idkec = feature.properties.idkec;
  const iddesa = feature.properties.iddesa;
  return assignments.includes(iddesa) || assignments.includes(idkec);
}

// Sub-component to fit map to assigned features
const MapAutoFit = ({
  geoData,
  assignments,
}: {
  geoData: any;
  assignments: string[];
}) => {
  const map = useMap();

  useEffect(() => {
    if (!geoData || assignments.length === 0) return;

    // Filter features that are assigned
    const assignedFeatures = geoData.features.filter((f: any) =>
      isAssignedFeature(f, assignments),
    );

    if (assignedFeatures.length > 0) {
      const bounds = L.geoJSON({
        type: "FeatureCollection",
        features: assignedFeatures,
      } as any).getBounds();
      map.fitBounds(bounds, { padding: [20, 20] });
    }
  }, [geoData, assignments, map]);

  return null;
};

export default AssignmentMap;
