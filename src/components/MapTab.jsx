import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Polygon, useMap, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import * as h3 from 'h3-js';
import { MapPin, Wifi, Crosshair } from 'lucide-react';

// Helper to smooth-pan the map when the user moves
function ChangeView({ center }) {
  const map = useMap();
  map.setView(center, 15); 
  return null;
}

const MapTab = ({ 
  locationData, 
  cityNodeCount,
  isActiveGPSTracking,
  startActiveGPS,
  stopActiveGPS,
  activeGPSDistance,
  activeGPSError,
  activeGPSLocation // 🚨 NEW LIVE PROP
}) => {
  const [hexBoundary, setHexBoundary] = useState([]);
  const [neighborHexes, setNeighborHexes] = useState([]);
  const [liveSector, setLiveSector] = useState(locationData?.h3Index || 'SCANNING...');
  
  // 🚨 DYNAMIC CENTER: Use active GPS if tracking, otherwise fallback to static location
  const currentLat = isActiveGPSTracking && activeGPSLocation ? activeGPSLocation.lat : (locationData?.lat || 1.3521);
  const currentLng = isActiveGPSTracking && activeGPSLocation ? activeGPSLocation.lng : (locationData?.lng || 103.8198);
  const center = [currentLat, currentLng];

  // 🚨 DYNAMIC HEXAGONS: Redraw the grid when they physically move!
  useEffect(() => {
    let lat = locationData?.lat;
    let lng = locationData?.lng;
    let h3Index = locationData?.h3Index;

    // If actively tracking, calculate their live H3 sector (Resolution 9)
    if (isActiveGPSTracking && activeGPSLocation) {
      lat = activeGPSLocation.lat;
      lng = activeGPSLocation.lng;
      h3Index = h3.latLngToCell(lat, lng, 9);
    }

    if (h3Index) {
      setLiveSector(h3Index);
      const boundary = h3.cellToBoundary(h3Index);
      setHexBoundary(boundary);

      const neighbors = h3.gridDisk(h3Index, 1); 
      const surround = neighbors.slice(1).map(h => ({
        id: h,
        boundary: h3.cellToBoundary(h)
      }));
      setNeighborHexes(surround);
    }
  }, [locationData, activeGPSLocation, isActiveGPSTracking]);

  if (!locationData && !activeGPSLocation) {
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
      <MapContainer 
        center={center} 
        zoom={15} 
        style={{ height: '100%', width: '100%', background: '#000000' }}
        zoomControl={false}
        attributionControl={false}
      >
        <ChangeView center={center} />
        
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />

        {/* NEIGHBOR HEXES */}
        {neighborHexes.map((hex) => (
          <Polygon
            key={hex.id}
            positions={hex.boundary}
            pathOptions={{ color: '#06b6d4', weight: 1, fillOpacity: 0.1, fillColor: '#06b6d4' }}
          />
        ))}

        {/* USER HEXAGON */}
        {hexBoundary.length > 0 && (
          <Polygon 
            positions={hexBoundary} 
            pathOptions={{ color: '#06b6d4', weight: 2, fillOpacity: 0.3, fillColor: '#06b6d4' }} 
          />
        )}

        {/* 🚨 THE LIVE RADAR DOT */}
        <CircleMarker 
          center={center} 
          radius={6} 
          pathOptions={{ 
            color: isActiveGPSTracking ? '#22c55e' : '#06b6d4', // Green if tracking, Cyan if static
            fillColor: isActiveGPSTracking ? '#22c55e' : '#06b6d4', 
            fillOpacity: 1,
            weight: 2
          }} 
        />
      </MapContainer>

      {/* OVERLAY HUD CONTAINER */}
      <div className="absolute bottom-24 left-4 right-4 flex flex-col gap-3 z-[1000]">
        
        <div className="bg-black/90 backdrop-blur-md border border-cyan-500/50 rounded-lg p-4 shadow-[0_0_20px_rgba(34,211,238,0.15)]">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-sm font-black text-white tracking-widest flex items-center uppercase">
                {isActiveGPSTracking ? (
                  <Crosshair size={14} className="mr-2 text-cyan-400 animate-pulse" />
                ) : (
                  <MapPin size={14} className="mr-2 text-gray-500" />
                )}
                Active Mapping
              </h3>
              <p className="text-[9px] text-gray-400 mt-1 uppercase tracking-wider">Earn 50 RP per 50m mapped</p>
            </div>
            
            <button 
              onClick={isActiveGPSTracking ? stopActiveGPS : startActiveGPS}
              className={`px-4 py-2 rounded font-black text-[10px] tracking-widest transition-all ${
                isActiveGPSTracking 
                  ? 'bg-red-900/40 text-red-400 border border-red-500/50 hover:bg-red-900 shadow-[0_0_10px_rgba(239,68,68,0.2)]' 
                  : 'bg-cyan-900/40 text-cyan-400 border border-cyan-500/50 hover:bg-cyan-900 hover:text-white shadow-[0_0_10px_rgba(34,211,238,0.2)]'
              }`}
            >
              {isActiveGPSTracking ? 'ABORT TRACKING' : 'INITIATE'}
            </button>
          </div>

          <div className="bg-gray-900/80 rounded border border-gray-800 p-3 flex justify-between items-center">
            <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Distance Mapped</span>
            <span className="text-xl font-mono font-bold text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">
              {Math.floor(activeGPSDistance)} <span className="text-xs text-cyan-500">m</span>
            </span>
          </div>
        </div>

        <div className="bg-black/80 backdrop-blur border border-gray-800 p-4 rounded-lg">
           <div className="flex justify-between items-center">
              <div>
                 <p className="text-[9px] text-gray-500 uppercase">Current Sector</p>
                 <p className="text-xs font-mono text-cyan-400">{liveSector}</p>
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
    </div>
  );
};

export default MapTab;