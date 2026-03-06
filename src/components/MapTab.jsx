import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Polygon, Polyline, useMap, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import * as h3 from 'h3-js';
import { MapPin, Wifi, Crosshair, AlertTriangle } from 'lucide-react';

const ROUTE_STORAGE_KEY = 'sonar_current_route';
const MAX_ROUTE_POINTS = 500;
const MIN_DISTANCE_M = 2; // Only add point if moved at least 2m (reduces jitter & array size)

function haversineMeters(a, b) {
  const R = 6_371_000;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

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
  activeGPSLocation,
}) => {
  const [hexBoundary, setHexBoundary] = useState([]);
  const [neighborHexes, setNeighborHexes] = useState([]);
  const [liveSector, setLiveSector] = useState(locationData?.h3Index || 'SCANNING...');

  // Route trail: [[lat, lng], ...] — init from localStorage, append on each valid position
  const [routeHistory, setRouteHistory] = useState(() => {
    try {
      const raw = localStorage.getItem(ROUTE_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const lastRoutePointRef = useRef(null);

  // Persist route to localStorage whenever it changes (debounce not required; slice keeps size bounded)
  useEffect(() => {
    if (routeHistory.length === 0) return;
    try {
      localStorage.setItem(ROUTE_STORAGE_KEY, JSON.stringify(routeHistory));
    } catch (_) {}
  }, [routeHistory]);

  // On each new position while tracking, append to routeHistory (with minimum distance filter)
  useEffect(() => {
    if (!isActiveGPSTracking || !activeGPSLocation) return;
    const pt = [activeGPSLocation.lat, activeGPSLocation.lng];
    const last = lastRoutePointRef.current;
    if (last !== null && haversineMeters(last, pt) < MIN_DISTANCE_M) return;
    lastRoutePointRef.current = pt;
    setRouteHistory((prev) => [...prev, pt].slice(-MAX_ROUTE_POINTS));
  }, [isActiveGPSTracking, activeGPSLocation?.lat, activeGPSLocation?.lng]);

  // Dynamic center
  const currentLat = isActiveGPSTracking && activeGPSLocation ? activeGPSLocation.lat : (locationData?.lat || 1.3521);
  const currentLng = isActiveGPSTracking && activeGPSLocation ? activeGPSLocation.lng : (locationData?.lng || 103.8198);
  const center = [currentLat, currentLng];

  // DYNAMIC HEXAGONS
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

        {/* ROUTE TRAIL: glowing polyline from persisted routeHistory */}
        {routeHistory.length > 1 && (
          <>
            <Polyline
              positions={routeHistory}
              pathOptions={{
                color: '#a855f7',
                weight: 8,
                opacity: 0.35,
              }}
            />
            <Polyline
              positions={routeHistory}
              pathOptions={{
                color: '#22c55e',
                weight: 5,
                opacity: 0.9,
              }}
            />
          </>
        )}

        {/* LIVE RADAR DOT */}
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
      <div className="absolute bottom-16 left-4 right-4 flex flex-col gap-2 z-[1000]">
        
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