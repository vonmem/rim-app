// src/services/LocationService.js

// FIX: Use "import * as h3" instead of "import h3"
import * as h3 from 'h3-js';

class LocationService {
  
  static getPosition() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject);
    });
  }

  static async getHexId() {
    try {
      const position = await this.getPosition();
      const { latitude, longitude } = position.coords;
      
      // H3 Resolution 9 (0.1 km^2 - City Block size)
      const h3Index = h3.latLngToCell(latitude, longitude, 9);
      
      return {
        lat: latitude,
        lng: longitude,
        h3Index: h3Index
      };
    } catch (error) {
      console.warn("Location access denied or failed:", error);
      return null;
    }
  }
}

export default LocationService;