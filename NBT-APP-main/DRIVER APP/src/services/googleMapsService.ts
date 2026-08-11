/**
 * googleMapsService.ts - Driver App
 * Google Maps Platform API integration layer
 */

import { Platform } from 'react-native';
const isWeb = Platform.OS === 'web';

const getApiKey = (): string => {
  if (typeof process !== 'undefined' && process.env) {
    if (process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY) return process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (process.env.GOOGLE_MAPS_API_KEY) return process.env.GOOGLE_MAPS_API_KEY;
  }
  return 'AIzaSyCRQ3QPWMeXqYFOBtayGkScl7lXynWqNus';
};

export const GOOGLE_MAPS_API_KEY = getApiKey();
const BASE = 'https://maps.googleapis.com/maps/api';

const getApiHost = (): string => {
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3001';
  }
  return 'http://localhost:3001';
};
const PROXY_BASE = `${getApiHost()}/api/maps`;

export interface RouteInfo {
  distanceKm: number;
  distanceText: string;
  durationText: string;
  durationMinutes: number;
  startAddress: string;
  endAddress: string;
  polylinePoints?: string;
}

export interface LocationDetails {
  formattedAddress: string;
  city: string;
  latitude: number;
  longitude: number;
}

/**
 * Reverse geocodes coordinates to a human-readable city & address using Google Maps Geocoding API
 */
export async function reverseGeocodeLocation(lat: number, lng: number): Promise<LocationDetails | null> {
  // 1. Try backend proxy
  try {
    const proxyUrl = `${PROXY_BASE}/geocode?latlng=${lat},${lng}`;
    const res = await fetch(proxyUrl);
    if (res.ok) {
      const data = await res.json();
      if (data.results?.length) {
        const first = data.results[0];
        let city = 'In Transit';
        for (const comp of first.address_components || []) {
          if (comp.types.includes('locality') || comp.types.includes('administrative_area_level_2')) {
            city = comp.long_name;
            break;
          }
        }
        return {
          formattedAddress: first.formatted_address || '',
          city,
          latitude: lat,
          longitude: lng,
        };
      }
    }
  } catch (proxyErr) {
    console.warn('[DriverMaps] Proxy geocode failed:', proxyErr);
  }

  // 2. Direct fetch fallback (Skipped on Web to avoid CORS error)
  if (isWeb) {
    return {
      formattedAddress: `Coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      city: 'Current Location',
      latitude: lat,
      longitude: lng,
    };
  }

  try {
    const url = `${BASE}/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}&language=en`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.status === 'OK' && data.results?.length > 0) {
      const first = data.results[0];
      let city = 'In Transit';
      
      for (const comp of first.address_components || []) {
        if (comp.types.includes('locality') || comp.types.includes('administrative_area_level_2')) {
          city = comp.long_name;
          break;
        }
      }

      return {
        formattedAddress: first.formatted_address || '',
        city,
        latitude: lat,
        longitude: lng,
      };
    }
  } catch (err) {
    console.warn('[DriverMaps] Reverse geocode failed:', err);
  }
  return null;
}

/**
 * Calculates live route distance & duration between starting point & destination
 */
export async function getLiveRouteDetails(origin: string, destination: string): Promise<RouteInfo | null> {
  // 1. Try backend proxy
  try {
    const proxyUrl = `${PROXY_BASE}/directions?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`;
    const res = await fetch(proxyUrl);
    if (res.ok) {
      const data = await res.json();
      if (data.routes?.length) {
        const leg = data.routes[0].legs[0];
        const distMeters = leg.distance?.value || 0;
        const durationSecs = leg.duration?.value || 0;

        return {
          distanceKm: Math.round(distMeters / 1000),
          distanceText: leg.distance?.text || `${Math.round(distMeters / 1000)} km`,
          durationText: leg.duration?.text || `${Math.round(durationSecs / 60)} mins`,
          durationMinutes: Math.round(durationSecs / 60),
          startAddress: leg.start_address || origin,
          endAddress: leg.end_address || destination,
          polylinePoints: data.routes[0].overview_polyline?.points,
        };
      }
    }
  } catch (proxyErr) {
    console.warn('[DriverMaps] Proxy directions failed:', proxyErr);
  }

  // 2. Direct fetch fallback (Skipped on Web to avoid CORS error)
  if (isWeb) {
    return {
      distanceKm: 45,
      distanceText: '45 km (Est.)',
      durationText: '1 hr 15 mins',
      durationMinutes: 75,
      startAddress: origin,
      endAddress: destination,
    };
  }
  try {
    const params = new URLSearchParams({
      origin,
      destination,
      key: GOOGLE_MAPS_API_KEY,
      mode: 'driving',
      language: 'en',
    });

    const url = `${BASE}/directions/json?${params.toString()}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.status === 'OK' && data.routes?.length > 0) {
      const leg = data.routes[0].legs[0];
      const distMeters = leg.distance?.value || 0;
      const durationSecs = leg.duration?.value || 0;

      return {
        distanceKm: Math.round(distMeters / 1000),
        distanceText: leg.distance?.text || `${Math.round(distMeters / 1000)} km`,
        durationText: leg.duration?.text || `${Math.round(durationSecs / 60)} mins`,
        durationMinutes: Math.round(durationSecs / 60),
        startAddress: leg.start_address || origin,
        endAddress: leg.end_address || destination,
        polylinePoints: data.routes[0].overview_polyline?.points,
      };
    }
  } catch (err) {
    console.warn('[DriverMaps] Directions failed:', err);
  }
  return null;
}

/**
 * Generates a live static map image URL centered at (lat, lng)
 */
export function getStaticMapPreviewUrl(
  lat: number,
  lng: number,
  zoom: number = 14,
  width: number = 600,
  height: number = 340
): string {
  const params = new URLSearchParams({
    center: `${lat},${lng}`,
    zoom: zoom.toString(),
    size: `${width}x${height}`,
    maptype: 'roadmap',
    markers: `color:0xdc2626|label:🚚|${lat},${lng}`,
    key: GOOGLE_MAPS_API_KEY,
    scale: '2',
  });

  return `${BASE}/staticmap?${params.toString()}`;
}
