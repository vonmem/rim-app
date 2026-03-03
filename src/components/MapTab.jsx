import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Polygon, useMap, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import * as h3 from 'h3-js';
import { MapPin, Wifi, Crosshair, AlertTriangle } from 'lucide-react';

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

      {/* ULTRA-COMPACT OVERLAY HUD (Pushed closer to tabs) */}
      <div className="absolute bottom-[60px] left-4 right-4 flex flex-col gap-2 z-[1000]">
        
        {/* 🚨 SAFETY ADVISORY (Only visible when NOT tracking) */}
        {!isActiveGPSTracking && (
          <div className="bg-red-950/60 backdrop-blur-md border border-red-900/60 rounded-lg p-3 flex items-start shadow-[0_0_15px_rgba(220,38,38,0.15)] transition-all">
            <AlertTriangle size={14} className="text-red-500 mr-2 flex-shrink-0 mt-0.5 animate-pulse" />
            <p className="text-[9px] text-red-200/80 leading-relaxed uppercase tracking-wider font-medium">
              <span className="text-red-400 font-bold">Operator Advisory:</span> Stay vigilant. Do not trespass, enter restricted zones, or compromise personal safety while mapping. You assume all risks.
            </p>
          </div>
        )}

        {/* ACTIVE MAPPING CONTROL BAR */}
        <div className="bg-black/90 backdrop-blur-md border border-cyan-500/50 rounded-lg p-3 flex justify-between items-center shadow-[0_0_15px_rgba(34,211,238,0.15)]">
          <div className="flex flex-col">
            <span className="text-[9px] text-gray-400 uppercase font-black tracking-widest flex items-center">
              {isActiveGPSTracking ? (
                <><Crosshair size={10} className="mr-1 text-cyan-400 animate-pulse" /> TRACKING</>
              ) : (
                <><MapPin size={10} className="mr-1 text-gray-500" /> PASSIVE</>
              )}
            </span>
            <span className="text-sm font-mono font-bold text-white mt-0.5">
              {Math.floor(activeGPSDistance)} <span className="text-[10px] text-cyan-500">MAPPED</span>
            </span>
          </div>
          
          <button 
            onClick={isActiveGPSTracking ? stopActiveGPS : startActiveGPS}
            className={`px-5 py-2 rounded font-black text-[10px] tracking-widest transition-all ${
              isActiveGPSTracking 
                ? 'bg-red-900/40 text-red-400 border border-red-500/50 hover:bg-red-900' 
                : 'bg-cyan-900/40 text-cyan-400 border border-cyan-500/50 hover:bg-cyan-900 hover:text-white'
            }`}
          >
            {isActiveGPSTracking ? 'ABORT' : 'INITIATE'}
          </button>
        </div>

        {/* TINY SECTOR STRIP */}
        <div className="bg-black/80 backdrop-blur-sm border border-gray-800 rounded-lg p-2 px-3 flex justify-between items-center">
           <span className="text-[9px] text-gray-500 font-mono tracking-widest uppercase">
              SEC: <span className="text-cyan-400">{liveSector}</span>
           </span>
           <span className="text-[9px] text-green-400 font-mono font-bold tracking-widest flex items-center">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse mr-1.5"></span>
              {cityNodeCount} NODES
           </span>
        </div>

        {activeGPSError && (
          <p className="text-[9px] text-red-400 tracking-widest uppercase font-bold text-center border border-red-900/50 bg-red-900/40 py-1.5 rounded-lg mt-1">
            ⚠️ {activeGPSError}
          </p>
        )}
      </div>
    </div>
  );
};

export default MapTab;