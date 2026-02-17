import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Polygon, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import * as h3 from 'h3-js';
import { MapPin, Wifi } from 'lucide-react';

// Helper to center map when user moves
function ChangeView({ center }) {
  const map = useMap();
  map.setView(center, 15); // Zoom level 15 = City Block view
  return null;
}

const MapTab = ({ locationData, cityNodeCount }) => {
  const [hexBoundary, setHexBoundary] = useState([]);
  const [neighborHexes, setNeighborHexes] = useState([]);
  
  const center = locationData ? [locationData.lat, locationData.lng] : [1.3521, 103.8198]; // Default: Singapore

  useEffect(() => {
    if (locationData && locationData.h3Index) {
      // 1. Get User's Hexagon Shape
      const boundary = h3.cellToBoundary(locationData.h3Index);
      setHexBoundary(boundary);

      // 2. Get Neighbors (Simulate Coverage)
      // kRing(origin, radius) gets surrounding hexes
      const neighbors = h3.gridDisk(locationData.h3Index, 1); 
      // Remove the center hex from neighbors so we don't draw it twice
      const surround = neighbors.slice(1).map(h => ({
        id: h,
        boundary: h3.cellToBoundary(h)
      }));
      setNeighborHexes(surround);
    }
  }, [locationData]);

  if (!locationData) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 animate-pulse p-10 text-center">
        <Wifi size={48} className="mb-4 text-gray-700" />
        <p className="text-xs tracking-widest uppercase">Triangulating Position...</p>
        <p className="text-[9px] mt-2">Waiting for GPS Satellite Lock</p>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-0 bg-black">
      {/* MAP CONTAINER */}
      <MapContainer 
        center={center} 
        zoom={15} 
        style={{ height: '100%', width: '100%', background: '#000000' }}
        zoomControl={false}
        attributionControl={false}
      >
        <ChangeView center={center} />
        
        {/* DARK MATTER TILES (The Cyberpunk Look) */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {/* NEIGHBOR HEXES (Faint Cyan - "Coverage") */}
        {neighborHexes.map((hex) => (
          <Polygon
            key={hex.id}
            positions={hex.boundary}
            pathOptions={{ 
              color: '#06b6d4', // Cyan-500
              weight: 1, 
              fillOpacity: 0.1, 
              fillColor: '#06b6d4' 
            }}
          />
        ))}

        {/* USER HEXAGON (Bright Cyan - "Active Node") */}
        {hexBoundary.length > 0 && (
          <Polygon 
            positions={hexBoundary} 
            pathOptions={{ 
              color: '#06b6d4', 
              weight: 2, 
              fillOpacity: 0.3, 
              fillColor: '#06b6d4' 
            }} 
          />
        )}

      </MapContainer>

      {/* OVERLAY HUD */}
      <div className="absolute bottom-24 left-4 right-4 bg-black/80 backdrop-blur border border-gray-800 p-4 rounded-lg z-[1000]">
         <div className="flex justify-between items-center">
            <div>
               <p className="text-[9px] text-gray-500 uppercase">Current Sector</p>
               <p className="text-xs font-mono text-cyan-400">{locationData.h3Index}</p>
            </div>
            <div className="text-right">
               <p className="text-[9px] text-gray-500 uppercase">Coverage Density</p>
               <div className="flex items-center justify-end space-x-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  <p className="text-xs font-bold text-white">{cityNodeCount} NODES</p>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};

export default MapTab;