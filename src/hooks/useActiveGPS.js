import { useState, useEffect, useRef, useCallback } from 'react';

/** Earth radius in meters for Haversine formula */
const EARTH_RADIUS_M = 6_371_000;

/**
 * Haversine formula: returns distance in meters between two lat/lng points.
 * @param {{ lat: number, lng: number }} a
 * @param {{ lat: number, lng: number }} b
 * @returns {number} distance in meters
 */
function haversineMeters(a, b) {
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(x));
}

const DEFAULT_THRESHOLD_M = 50;
/** Max allowed speed for mapping: 20 km/h ≈ 5.5 m/s (anti-cheat: no vehicles) */
const SPEED_LIMIT_MS = 5.5;
const CONSECUTIVE_PINGS_TO_CLEAR_SPEEDING = 3;

/**
 * useActiveGPS – Tracks user location in the Mini App with a 50m threshold.
 * Uses navigator.geolocation.watchPosition. No native/background; safe for Telegram WebView.
 * Vehicle speed cap: rewards pause when speed > 5.5 m/s (20 km/h).
 *
 * @param {Object} options
 * @param {(distance: number, coords: { lat: number, lng: number }) => void} [options.onSignificantLocationChange] – Fired when user moves >= threshold.
 * @param {number} [options.thresholdMeters=50] – Min distance (m) before state update and callback.
 * @returns {{ currentLocation, distanceTraveled, isTracking, isSpeeding, startTracking, stopTracking, permissionState, permissionError }}
 */
export function useActiveGPS(options = {}) {
  const {
    onSignificantLocationChange,
    thresholdMeters = DEFAULT_THRESHOLD_M,
  } = options;

  const [currentLocation, setCurrentLocation] = useState(null);
  const [distanceTraveled, setDistanceTraveled] = useState(0);
  const [isTracking, setIsTracking] = useState(false);
  const [isSpeeding, setIsSpeeding] = useState(false);
  const [permissionState, setPermissionState] = useState('prompt'); // 'prompt' | 'granted' | 'denied'
  const [permissionError, setPermissionError] = useState(null); // User-facing message for Telegram/WebView quirks

  const watchIdRef = useRef(null);
  const lastRecordedRef = useRef(null);
  const totalDistanceRef = useRef(0);
  const callbackRef = useRef(onSignificantLocationChange);
  const lastPingTimeRef = useRef(Date.now());
  const lastCoordsRef = useRef(null);
  const consecutiveNonSpeedingRef = useRef(0);

  callbackRef.current = onSignificantLocationChange;

  const startTracking = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setPermissionState('denied');
      setPermissionError('Location is not supported in this browser.');
      return;
    }

    setPermissionError(null);
    lastPingTimeRef.current = Date.now();
    lastCoordsRef.current = null;
    consecutiveNonSpeedingRef.current = 0;

    const onPosition = (position) => {
      const now = Date.now();
      const { latitude, longitude, speed: coordsSpeed } = position.coords;
      const coords = { lat: latitude, lng: longitude };

      setCurrentLocation(coords);

      const lastCoords = lastCoordsRef.current;
      lastCoordsRef.current = coords;
      const prevTime = lastPingTimeRef.current;
      lastPingTimeRef.current = now;

      let currentSpeedMs = null;
      if (lastCoords !== null && prevTime > 0) {
        const elapsedSec = (now - prevTime) / 1000;
        if (elapsedSec >= 0.5) {
          const distance = haversineMeters(lastCoords, coords);
          currentSpeedMs = distance / elapsedSec;
        }
      }
      if (currentSpeedMs == null && typeof coordsSpeed === 'number' && coordsSpeed >= 0) {
        currentSpeedMs = coordsSpeed;
      }

      const overLimit = currentSpeedMs != null && currentSpeedMs > SPEED_LIMIT_MS;

      if (overLimit) {
        consecutiveNonSpeedingRef.current = 0;
        setIsSpeeding(true);
        lastRecordedRef.current = coords;
        return;
      }

      consecutiveNonSpeedingRef.current += 1;
      if (consecutiveNonSpeedingRef.current >= CONSECUTIVE_PINGS_TO_CLEAR_SPEEDING) {
        setIsSpeeding(false);
      }

      const last = lastRecordedRef.current;
      if (last === null) {
        lastRecordedRef.current = coords;
        return;
      }

      const distance = haversineMeters(last, coords);
      if (distance < thresholdMeters) return;

      lastRecordedRef.current = coords;
      totalDistanceRef.current += distance;
      setDistanceTraveled((prev) => prev + distance);

      const cb = callbackRef.current;
      if (typeof cb === 'function') {
        cb(distance, coords);
      }
    };

    const onError = (err) => {
      const code = err.code;
      const message = err.message || 'Location unavailable';

      if (code === 1) {
        setPermissionState('denied');
        setPermissionError('Location access denied. Enable it in browser or device settings to use Active Mapping.');
      } else if (code === 2) {
        setPermissionState('denied');
        setPermissionError('Position unavailable. Check your connection or try again.');
      } else if (code === 3) {
        setPermissionError('Location request timed out. You can try again.');
      } else {
        setPermissionError(message);
      }
    };

    const geoOptions = {
      enableHighAccuracy: true,
      maximumAge: 10_000,
      timeout: 15_000,
    };

    watchIdRef.current = navigator.geolocation.watchPosition(onPosition, onError, geoOptions);
    setIsTracking(true);
    setPermissionState('granted');
  }, [thresholdMeters]);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current != null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
  }, []);

  // Cleanup on unmount or when tracking stops (e.g. tab switch) to avoid leaks
  useEffect(() => {
    return () => {
      if (watchIdRef.current != null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, []);

  return {
    currentLocation,
    distanceTraveled,
    isTracking,
    isSpeeding,
    startTracking,
    stopTracking,
    permissionState,
    permissionError,
  };
}

export default useActiveGPS;
