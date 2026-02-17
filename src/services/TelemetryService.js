// src/services/TelemetryService.js

class TelemetryService {
  static async getNetworkStats() {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    
    // Basic Hardware Stats
    const hardware = {
      memory: navigator.deviceMemory || 'unknown', // RAM in GB
      cores: navigator.hardwareConcurrency || 'unknown', // CPU Cores
      platform: navigator.platform || 'unknown',
      userAgent: navigator.userAgent
    };

    // Network Signal Stats (Chrome/Android/Edge only - Safari returns null)
    if (connection) {
      return {
        ...hardware,
        type: connection.effectiveType || 'unknown', // '4g', '3g', 'wifi'
        downlink: connection.downlink || 0, // Mbps
        rtt: connection.rtt || 0, // Ping (ms)
        saveData: connection.saveData || false
      };
    }

    // Fallback for iOS/Safari (Partial Data)
    return {
      ...hardware,
      type: 'unknown',
      downlink: 0,
      rtt: 0
    };
  }

  static async generatePing() {
    // Simple verification ping to calculate true application latency
    const start = Date.now();
    try {
      await fetch(import.meta.env.VITE_SUPABASE_URL, { method: 'HEAD', mode: 'no-cors' });
      return Date.now() - start;
    } catch (e) {
      return -1; // Offline
    }
  }
}

export default TelemetryService;