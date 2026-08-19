/**
 * googleMapsService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Google Maps Platform API Service Layer
 * NBT + ARS Fleet Transit — Admin App
 *
 * APIs used:
 *   • Places Autocomplete   – as-you-type place suggestions
 *   • Place Details         – full place info (lat/lng, address, Place ID)
 *   • Geocoding             – resolve pasted Google Maps URLs / coordinates
 *   • Directions            – real route distance + duration + route summary
 *   • Static Maps           – small map tile preview with pin
 *
 * HOW TO SET YOUR API KEY
 * ───────────────────────
 * 1. Go to https://console.cloud.google.com/
 * 2. Create or select a project
 * 3. Enable these APIs:
 *      - Places API (New)
 *      - Geocoding API
 *      - Directions API
 *      - Maps Static API
 * 4. Create an API Key under Credentials
 * 5. Paste the key into GOOGLE_MAPS_API_KEY below
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─── CONFIGURE YOUR API KEY SECURELY ───────────────────────────────────────
// Prefer Expo/Web environment variables such as:
//   EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
//   VITE_GOOGLE_MAPS_API_KEY
//   GOOGLE_MAPS_API_KEY
const getGoogleMapsApiKey = (): string => {
  const candidates = [
    (typeof process !== 'undefined' && (process as any).env?.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY) || '',
    (typeof process !== 'undefined' && (process as any).env?.VITE_GOOGLE_MAPS_API_KEY) || '',
    (typeof process !== 'undefined' && (process as any).env?.GOOGLE_MAPS_API_KEY) || '',
    (typeof globalThis !== 'undefined' && (globalThis as any).__GOOGLE_MAPS_API_KEY__) || '',
    'AIzaSyCRQ3QPWMeXqYFOBtayGkScl7lXynWqNus',
  ];

  return candidates.find((value) => typeof value === 'string' && value.trim().length > 0)?.trim() || '';
};

export const GOOGLE_MAPS_API_KEY: string = getGoogleMapsApiKey();

export const isApiKeyConfigured = () => Boolean(GOOGLE_MAPS_API_KEY && GOOGLE_MAPS_API_KEY.length > 10);

// ─── DATA TYPES ───────────────────────────────────────────────────────────────

export interface PlaceAutocompleteResult {
  placeId: string;
  mainText: string;       // Primary part of the description (e.g. "Lumen Technologies")
  secondaryText: string;  // Secondary part (e.g. "Whitefield, Bengaluru, Karnataka, India")
  fullDescription: string;
}

export interface PlaceDetails {
  placeName: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
  placeId: string;
  mapsUrl: string;
  plusCode?: string;
  viewport?: {
    northeast: { lat: number; lng: number };
    southwest: { lat: number; lng: number };
  };
}

export interface DirectionsResult {
  distanceKm: number;
  distanceText: string;
  durationText: string;
  routeSummary: string;
  startAddress: string;
  endAddress: string;
}

import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
const isWeb = Platform.OS === 'web';

// ─── API ENDPOINTS ────────────────────────────────────────────────────────────

import { API_HOST } from '../db/database';

const BASE = 'https://maps.googleapis.com/maps/api';
const PROXY_BASE = `${API_HOST}/api/maps`;

async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    const token = await SecureStore.getItemAsync('admin_session_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

function getFallbackAutocomplete(query: string): PlaceAutocompleteResult[] {
  const q = query.toLowerCase().trim();
  const mockPlaces: PlaceAutocompleteResult[] = [
    {
      placeId: 'mock-blr-majestic',
      mainText: 'KSR Bengaluru City Junction (Majestic)',
      secondaryText: 'Kempegowda Bus Station, Sevashrama, Bengaluru, Karnataka',
      fullDescription: 'KSR Bengaluru City Junction (Majestic), Bengaluru, Karnataka, India',
    },
    {
      placeId: 'mock-blr-airport',
      mainText: 'Kempegowda International Airport (BLR)',
      secondaryText: 'Devanahalli, Bengaluru, Karnataka 560300',
      fullDescription: 'Kempegowda International Airport (BLR), Devanahalli, Bengaluru, Karnataka, India',
    },
    {
      placeId: 'mock-blr-whitefield',
      mainText: 'Whitefield IT Park',
      secondaryText: 'EPIP Zone, Whitefield, Bengaluru, Karnataka',
      fullDescription: 'Whitefield IT Park, EPIP Zone, Whitefield, Bengaluru, Karnataka, India',
    },
    {
      placeId: 'mock-blr-ecity',
      mainText: 'Electronic City Phase 1',
      secondaryText: 'Hosur Road, Bengaluru, Karnataka 560100',
      fullDescription: 'Electronic City Phase 1, Hosur Road, Bengaluru, Karnataka, India',
    },
    {
      placeId: 'mock-blr-yeshwanthpur',
      mainText: 'Yeshwantpur Railway Station',
      secondaryText: 'Industrial Suburb, Yeswanthpur, Bengaluru, Karnataka',
      fullDescription: 'Yeshwantpur Railway Station, Bengaluru, Karnataka, India',
    },
    {
      placeId: 'mock-delhi-cp',
      mainText: 'Connaught Place',
      secondaryText: 'New Delhi, Delhi 110001',
      fullDescription: 'Connaught Place, New Delhi, Delhi, India',
    },
    {
      placeId: 'mock-mumbai-bkc',
      mainText: 'Bandra Kurla Complex (BKC)',
      secondaryText: 'Bandra East, Mumbai, Maharashtra 400051',
      fullDescription: 'Bandra Kurla Complex (BKC), Mumbai, Maharashtra, India',
    },
    {
      placeId: 'mock-chennai-central',
      mainText: 'Chennai Central Railway Station',
      secondaryText: 'Kannappar Thidal, Periyamet, Chennai, Tamil Nadu',
      fullDescription: 'Chennai Central Railway Station, Chennai, Tamil Nadu, India',
    },
  ];

  return mockPlaces.filter(
    (p) =>
      p.mainText.toLowerCase().includes(q) ||
      p.secondaryText.toLowerCase().includes(q) ||
      p.fullDescription.toLowerCase().includes(q)
  );
}

function getMockPlaceDetails(placeId: string): PlaceDetails | null {
  const mocks: Record<string, PlaceDetails> = {
    'mock-blr-majestic': {
      placeName: 'KSR Bengaluru City Junction (Majestic)',
      formattedAddress: 'Kempegowda Bus Station, Sevashrama, Bengaluru, Karnataka 560023',
      latitude: 12.9784,
      longitude: 77.5684,
      placeId: 'mock-blr-majestic',
      mapsUrl: 'https://maps.google.com/?q=12.9784,77.5684',
    },
    'mock-blr-airport': {
      placeName: 'Kempegowda International Airport (BLR)',
      formattedAddress: 'KIAL Rd, Devanahalli, Bengaluru, Karnataka 560300',
      latitude: 13.1986,
      longitude: 77.7066,
      placeId: 'mock-blr-airport',
      mapsUrl: 'https://maps.google.com/?q=13.1986,77.7066',
    },
    'mock-blr-whitefield': {
      placeName: 'Whitefield IT Park',
      formattedAddress: 'EPIP Zone, Whitefield, Bengaluru, Karnataka 560066',
      latitude: 12.9698,
      longitude: 77.7499,
      placeId: 'mock-blr-whitefield',
      mapsUrl: 'https://maps.google.com/?q=12.9698,77.7499',
    },
    'mock-blr-ecity': {
      placeName: 'Electronic City Phase 1',
      formattedAddress: 'Hosur Road, Electronic City, Bengaluru, Karnataka 560100',
      latitude: 12.8452,
      longitude: 77.6602,
      placeId: 'mock-blr-ecity',
      mapsUrl: 'https://maps.google.com/?q=12.8452,77.6602',
    },
  };

  return mocks[placeId] || null;
}

// ─── PLACES AUTOCOMPLETE ─────────────────────────────────────────────────────
/**
 * Fetches Google Places Autocomplete suggestions for a query.
 * Uses local backend proxy first to avoid browser CORS block.
 */
export async function searchPlacesAutocomplete(
  query: string,
  sessionToken: string
): Promise<PlaceAutocompleteResult[]> {
  if (!query.trim()) return [];

  // 1. Try Backend Proxy (Bypasses Browser CORS & hides API Key)
  try {
    const headers = await getAuthHeaders();
    const proxyUrl = `${PROXY_BASE}/places/autocomplete?input=${encodeURIComponent(query)}&sessiontoken=${encodeURIComponent(sessionToken)}`;
    const res = await fetch(proxyUrl, { headers });
    if (res.ok) {
      const data = await res.json();
      if (data.predictions) {
        return (data.predictions || []).map((p: any): PlaceAutocompleteResult => ({
          placeId: p.place_id,
          mainText: p.structured_formatting?.main_text || p.description,
          secondaryText: p.structured_formatting?.secondary_text || '',
          fullDescription: p.description,
        }));
      }
    }
  } catch (proxyErr) {
    console.warn('[GoogleMaps] Proxy fetch failed:', proxyErr);
  }

  // 2. Direct fetch fallback (Disabled on Web to avoid browser CORS error)
  if (isWeb) {
    console.warn('[GoogleMaps] Direct fetch to maps.googleapis.com skipped on Web (CORS restriction). Returning fallback autocomplete.');
    return getFallbackAutocomplete(query);
  }

  if (!isApiKeyConfigured()) return getFallbackAutocomplete(query);

  const params = new URLSearchParams({
    input: query,
    key: GOOGLE_MAPS_API_KEY,
    sessiontoken: sessionToken,
    components: 'country:in',
    language: 'en',
    types: 'establishment|geocode',
  });

  const url = `${BASE}/place/autocomplete/json?${params.toString()}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.warn('[GoogleMaps] Autocomplete error:', data.status, data.error_message);
      return getFallbackAutocomplete(query);
    }

    return (data.predictions || []).map((p: any): PlaceAutocompleteResult => ({
      placeId: p.place_id,
      mainText: p.structured_formatting?.main_text || p.description,
      secondaryText: p.structured_formatting?.secondary_text || '',
      fullDescription: p.description,
    }));
  } catch (err) {
    console.warn('[GoogleMaps] Autocomplete fetch failed:', err);
    return getFallbackAutocomplete(query);
  }
}

// ─── PLACE DETAILS ────────────────────────────────────────────────────────────
/**
 * Fetches full details for a Place ID: lat/lng, formatted address, Plus Code.
 * Uses local backend proxy first to avoid browser CORS block.
 */
export async function getPlaceDetails(
  placeId: string,
  sessionToken: string
): Promise<PlaceDetails | null> {
  const mockMatch = getMockPlaceDetails(placeId);
  if (mockMatch) return mockMatch;

  // 1. Try Backend Proxy
  try {
    const headers = await getAuthHeaders();
    const proxyUrl = `${PROXY_BASE}/places/details?place_id=${encodeURIComponent(placeId)}`;
    const res = await fetch(proxyUrl, { headers });
    if (res.ok) {
      const data = await res.json();
      if (data.result) {
        const result = data.result;
        const loc = result.geometry?.location;
        return {
          placeName: result.name || result.formatted_address,
          formattedAddress: result.formatted_address || '',
          latitude: loc?.lat ?? 0,
          longitude: loc?.lng ?? 0,
          placeId: result.place_id,
          mapsUrl: result.url || `https://www.google.com/maps/place/?q=place_id:${placeId}`,
          plusCode: result.plus_code?.global_code,
          viewport: result.geometry?.viewport,
        };
      }
    }
  } catch (proxyErr) {
    console.warn('[GoogleMaps] Proxy details failed:', proxyErr);
  }

  // 2. Direct fetch fallback (Disabled on Web to avoid browser CORS error)
  if (isWeb) {
    console.warn('[GoogleMaps] Direct fetch to maps.googleapis.com skipped on Web (CORS restriction).');
    return null;
  }

  if (!isApiKeyConfigured()) return null;

  const params = new URLSearchParams({
    place_id: placeId,
    key: GOOGLE_MAPS_API_KEY,
    sessiontoken: sessionToken,
    fields: 'name,formatted_address,geometry,place_id,plus_code,url',
    language: 'en',
  });

  const url = `${BASE}/place/details/json?${params.toString()}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK') {
      console.warn('[GoogleMaps] Place Details error:', data.status, data.error_message);
      return null;
    }

    const result = data.result;
    const loc = result.geometry?.location;

    return {
      placeName: result.name || result.formatted_address,
      formattedAddress: result.formatted_address || '',
      latitude: loc?.lat ?? 0,
      longitude: loc?.lng ?? 0,
      placeId: result.place_id,
      mapsUrl: result.url || `https://www.google.com/maps/place/?q=place_id:${placeId}`,
      plusCode: result.plus_code?.global_code,
      viewport: result.geometry?.viewport,
    };
  } catch (err) {
    console.warn('[GoogleMaps] Place Details fetch failed:', err);
    return null;
  }
}

// ─── GEOCODE / RESOLVE URL ────────────────────────────────────────────────────
/**
 * Resolves pasted Google Maps URLs into an exact place reference.
 * Supports coordinate URLs, place URLs, search URLs and share URLs where possible.
 */
export async function resolveGoogleMapsUrl(url: string): Promise<PlaceDetails | null> {
  const trimmed = url.trim();
  if (!trimmed) return null;

  const candidateUrls = await collectCandidateUrls(trimmed);
  const direct = parseGoogleMapsCoordinates(candidateUrls);
  if (direct) {
    const geocoded = isApiKeyConfigured() ? await reverseGeocode(direct.lat, direct.lng) : null;
    return geocoded || buildFallbackPlaceFromCoordinates(direct.lat, direct.lng, direct.resolvedUrl || trimmed);
  }

  const placeId = extractPlaceId(candidateUrls);
  if (placeId && isApiKeyConfigured()) {
    return await getPlaceDetails(placeId, generateSessionToken());
  }

  const addressQuery = extractSearchQuery(candidateUrls);
  if (addressQuery && isApiKeyConfigured()) {
    return await geocodeAddress(addressQuery);
  }

  return null;
}

async function collectCandidateUrls(input: string): Promise<string[]> {
  const candidates = [input];
  if (/^(https?:\/\/)/i.test(input)) {
    try {
      const response = await fetch(input, {
        redirect: 'follow' as RequestRedirect,
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      const finalUrl = response.url;
      if (finalUrl && finalUrl !== input) {
        candidates.push(finalUrl);
      }
    } catch (err) {
      console.warn('[GoogleMaps] Redirect resolution failed:', err);
    }
  }
  return candidates;
}

function parseGoogleMapsCoordinates(candidateUrls: string[]): { lat: number; lng: number; resolvedUrl: string } | null {
  for (const candidate of candidateUrls) {
    const normalized = candidate.trim();

    const qPattern = /[?&]q=(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/i;
    const qMatch = normalized.match(qPattern);
    if (qMatch) {
      return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]), resolvedUrl: normalized };
    }

    const atPattern = /@(-?\d+\.?\d*),(-?\d+\.?\d*)/;
    const atMatch = normalized.match(atPattern);
    if (atMatch) {
      return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]), resolvedUrl: normalized };
    }

    const placePattern = /\/(-?\d+\.?\d*),(-?\d+\.?\d*)/;
    const placeMatch = normalized.match(placePattern);
    if (placeMatch) {
      return { lat: parseFloat(placeMatch[1]), lng: parseFloat(placeMatch[2]), resolvedUrl: normalized };
    }

    const queryPattern = /[?&](?:query|destination|origin)=([^&]+)/i;
    const queryMatch = normalized.match(queryPattern);
    if (queryMatch) {
      const decoded = decodeURIComponent(queryMatch[1]);
      const coordPattern = /(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)/;
      const coordMatch = decoded.match(coordPattern);
      if (coordMatch) {
        return { lat: parseFloat(coordMatch[1]), lng: parseFloat(coordMatch[2]), resolvedUrl: normalized };
      }
    }
  }

  return null;
}

function extractPlaceId(candidateUrls: string[]): string | null {
  for (const candidate of candidateUrls) {
    const normalized = candidate.trim();
    const placeIdMatch = /(?:place_id|cid)=([^&]+)/i.exec(normalized);
    if (placeIdMatch) return decodeURIComponent(placeIdMatch[1]);

    const placePathMatch = /maps\/place\/[^/]+\/([^/?#]+)/i.exec(normalized);
    if (placePathMatch) return decodeURIComponent(placePathMatch[1]);
  }
  return null;
}

function extractSearchQuery(candidateUrls: string[]): string | null {
  for (const candidate of candidateUrls) {
    const normalized = candidate.trim();
    const queryMatch = /[?&](?:query|q)=([^&]+)/i.exec(normalized);
    if (queryMatch) {
      const decoded = decodeURIComponent(queryMatch[1]);
      if (decoded && !/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/.test(decoded)) {
        return decoded;
      }
    }

    const placePath = /maps\/place\/([^/?#]+)/i.exec(normalized);
    if (placePath) return decodeURIComponent(placePath[1].replace(/\+/g, ' '));
  }
  return null;
}

async function geocodeAddress(address: string): Promise<PlaceDetails | null> {
  if (!isApiKeyConfigured()) return null;

  const params = new URLSearchParams({
    address,
    key: GOOGLE_MAPS_API_KEY,
    language: 'en',
  });

  try {
    const response = await fetch(`${BASE}/geocode/json?${params.toString()}`);
    const data = await response.json();
    if (data.status !== 'OK' || !data.results?.length) return null;

    const result = data.results[0];
    return {
      placeName: result.formatted_address?.split(',')[0] || address,
      formattedAddress: result.formatted_address || address,
      latitude: result.geometry?.location?.lat ?? 0,
      longitude: result.geometry?.location?.lng ?? 0,
      placeId: result.place_id,
      mapsUrl: `https://www.google.com/maps/place/?q=place_id:${result.place_id}`,
      plusCode: result.plus_code?.global_code,
    };
  } catch (err) {
    console.warn('[GoogleMaps] Geocode address failed:', err);
    return null;
  }
}

function buildFallbackPlaceFromCoordinates(lat: number, lng: number, sourceUrl: string): PlaceDetails {
  return {
    placeName: 'Resolved Google Maps Location',
    formattedAddress: `Coordinates ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
    latitude: lat,
    longitude: lng,
    placeId: `GEO-${lat.toFixed(6)}-${lng.toFixed(6)}`,
    mapsUrl: sourceUrl,
  };
}

/**
 * Reverse geocode lat/lng to a full place using Geocoding API.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<PlaceDetails | null> {
  if (!isApiKeyConfigured()) return null;

  const params = new URLSearchParams({
    latlng: `${lat},${lng}`,
    key: GOOGLE_MAPS_API_KEY,
    language: 'en',
  });

  const url = `${BASE}/geocode/json?${params.toString()}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' || !data.results?.length) {
      console.warn('[GoogleMaps] Geocode error:', data.status);
      return null;
    }

    const result = data.results[0];
    return {
      placeName: result.name || extractShortName(result.formatted_address),
      formattedAddress: result.formatted_address || '',
      latitude: lat,
      longitude: lng,
      placeId: result.place_id,
      mapsUrl: `https://www.google.com/maps/place/?q=place_id:${result.place_id}`,
      plusCode: result.plus_code?.global_code,
    };
  } catch (err) {
    console.warn('[GoogleMaps] Geocode fetch failed:', err);
    return null;
  }
}

function extractShortName(formattedAddress: string): string {
  // Return the first comma-delimited part as the short place name
  return formattedAddress.split(',')[0].trim();
}

// ─── DIRECTIONS API ───────────────────────────────────────────────────────────
/**
 * Calculates real route distance + travel time using the Directions API.
 * Uses place_id: prefix for most accurate routing from exact places.
 */
export async function getDirections(
  originPlaceId: string,
  destinationPlaceId: string,
  vehicleType?: string
): Promise<DirectionsResult | null> {
  // 1. Try Backend Proxy
  try {
    const headers = await getAuthHeaders();
    const proxyUrl = `${PROXY_BASE}/directions?origin=${encodeURIComponent(`place_id:${originPlaceId}`)}&destination=${encodeURIComponent(`place_id:${destinationPlaceId}`)}`;
    const res = await fetch(proxyUrl, { headers });
    if (res.ok) {
      const data = await res.json();
      if (data.routes?.length) {
        const route = data.routes[0];
        const leg = route.legs[0];
        const distanceMeters = leg.distance?.value ?? 0;
        const distanceKm = Math.round(distanceMeters / 1000);
        return {
          distanceKm,
          distanceText: leg.distance?.text ?? `${distanceKm} km`,
          durationText: leg.duration?.text ?? '',
          routeSummary: route.summary || 'via NH44',
          startAddress: leg.start_address || '',
          endAddress: leg.end_address || '',
        };
      }
    }
  } catch (proxyErr) {
    console.warn('[GoogleMaps] Proxy directions failed:', proxyErr);
  }

  // 2. Direct fetch fallback (Disabled on Web to avoid browser CORS error)
  if (isWeb) {
    console.warn('[GoogleMaps] Direct fetch to maps.googleapis.com skipped on Web (CORS restriction).');
    return null;
  }

  if (!isApiKeyConfigured()) return null;

  const params = new URLSearchParams({
    origin: `place_id:${originPlaceId}`,
    destination: `place_id:${destinationPlaceId}`,
    key: GOOGLE_MAPS_API_KEY,
    mode: 'driving',
    language: 'en',
    region: 'in',
    avoid: '',
  });

  const url = `${BASE}/directions/json?${params.toString()}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' || !data.routes?.length) {
      console.warn('[GoogleMaps] Directions error:', data.status, data.error_message);
      return null;
    }

    const route = data.routes[0];
    const leg = route.legs[0];
    const distanceMeters = leg.distance?.value ?? 0;
    const distanceKm = Math.round(distanceMeters / 1000);

    return {
      distanceKm,
      distanceText: leg.distance?.text ?? `${distanceKm} km`,
      durationText: leg.duration?.text ?? '',
      routeSummary: route.summary || 'via NH44',
      startAddress: leg.start_address || '',
      endAddress: leg.end_address || '',
    };
  } catch (err) {
    console.warn('[GoogleMaps] Directions fetch failed:', err);
    return null;
  }
}

// ─── STATIC MAPS URL BUILDER ──────────────────────────────────────────────────
/**
 * Builds a Static Maps API URL for a map tile with a pin at the given coordinates.
 * Returns null if API key is not configured.
 */
export function buildStaticMapUrl(
  lat: number,
  lng: number,
  pinColor: 'green' | 'red' | 'blue' = 'red',
  zoom: number = 14,
  width: number = 600,
  height: number = 200
): string | null {
  if (!isApiKeyConfigured()) return null;

  const colorMap = { green: '0x16a34a', red: '0xdc2626', blue: '0x0284c7' };
  const color = colorMap[pinColor];

  const params = new URLSearchParams({
    center: `${lat},${lng}`,
    zoom: zoom.toString(),
    size: `${width}x${height}`,
    maptype: 'roadmap',
    markers: `color:${color}|label:📍|${lat},${lng}`,
    key: GOOGLE_MAPS_API_KEY,
    scale: '2',
    language: 'en',
  });

  return `${BASE}/staticmap?${params.toString()}`;
}

// ─── SESSION TOKEN GENERATOR ──────────────────────────────────────────────────
/**
 * Generates a random session token for Places Autocomplete billing grouping.
 * A new token should be generated at the start of each search session.
 */
export function generateSessionToken(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

// ─── TOLL ESTIMATION ─────────────────────────────────────────────────────────
/**
 * Estimates toll plazas and costs based on distance and vehicle wheel type.
 * Real-world toll data would require a dedicated Toll API (e.g., TollGuru).
 * This provides a realistic estimate using per-km toll density for Indian NH routes.
 */
export interface TollEstimate {
  isAvailable: boolean;
  count: number;
  estimatedCost: number;
  plazas: { name: string; cost: number }[];
  message?: string;
}

export function estimateTolls(distanceKm: number, wheelType: string): TollEstimate {
  // If no distance or very short route, return zero tolls
  if (!distanceKm || distanceKm <= 30) {
    return {
      isAvailable: true,
      count: 0,
      estimatedCost: 0,
      plazas: [],
    };
  }

  // Toll plaza spacing: approximately one every 65km on national highways
  const count = Math.max(1, Math.round(distanceKm / 65));
  
  // Cost per plaza based on vehicle wheel type (realistic NHAI rates for axle configs)
  let baseCostPerPlaza = 200; // Default
  switch (wheelType) {
    case '6 Wheel':
      baseCostPerPlaza = 220;
      break;
    case '10 Wheel':
      baseCostPerPlaza = 350;
      break;
    case '12 Wheel':
      baseCostPerPlaza = 440;
      break;
    case '14 Wheel':
      baseCostPerPlaza = 550;
      break;
    case '16 Wheel':
      baseCostPerPlaza = 660;
      break;
  }

  // Generate plazas with realistic names and slightly varied costs
  const plazas: { name: string; cost: number }[] = [];
  let totalCost = 0;
  
  for (let i = 0; i < count; i++) {
    // Generate a simulated cost with small variation (+/- 10%)
    const variation = 0.9 + (i * 0.07 % 0.2); // deterministic pseudo-random variation
    const cost = Math.round((baseCostPerPlaza * variation) / 5) * 5; // round to nearest 5
    
    // Names of mock plazas along the route
    const distanceMarker = Math.round((i + 1) * (distanceKm / (count + 1)));
    const plazaName = `NH Toll Plaza (Km ${distanceMarker})`;
    
    plazas.push({ name: plazaName, cost });
    totalCost += cost;
  }

  return {
    isAvailable: true,
    count,
    estimatedCost: totalCost,
    plazas,
  };
}
