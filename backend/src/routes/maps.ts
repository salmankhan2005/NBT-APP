import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

/**
 * Maps proxy routes — OpenStreetMap (Nominatim + OSRM) based.
 * All endpoints are free and require no API key.
 *
 * Nominatim usage policy requires:
 *  - max 1 request/second
 *  - a valid User-Agent header
 *
 * Response shapes are transformed to match the previous Google Maps format
 * so that frontend code changes are minimal.
 */

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const OSRM_BASE = 'https://router.project-osrm.org';
const USER_AGENT = 'NBT-ARS-FleetTransit/1.0';

export async function mapsRoutes(app: FastifyInstance) {
  const authHook = {
    preHandler: [
      async (req: FastifyRequest, reply: FastifyReply) => {
        if (req.headers.authorization) {
          try {
            await app.authenticate(req, reply);
          } catch {
            // Soft auth for maps proxy
          }
        }
      },
    ],
  };

  // GET /api/maps/places/autocomplete?input=...&sessiontoken=...
  // Uses Nominatim search — returns predictions in Google-like format
  app.get('/places/autocomplete', authHook, async (req: FastifyRequest, reply: FastifyReply) => {
    const { input } = req.query as { input?: string; sessiontoken?: string };
    if (!input) return reply.code(400).send({ error: 'input query param required' });

    try {
      const url = `${NOMINATIM_BASE}/search?q=${encodeURIComponent(input)}&format=json&addressdetails=1&limit=8&countrycodes=in&accept-language=en`;
      const res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT },
      });
      const data = await res.json();

      // Transform Nominatim results to Google Places Autocomplete format
      const predictions = (data as any[]).map((item: any) => ({
        place_id: `osm_${item.osm_type}_${item.osm_id}`,
        description: item.display_name,
        structured_formatting: {
          main_text: item.name || item.display_name?.split(',')[0] || '',
          secondary_text: item.display_name?.split(',').slice(1).join(',').trim() || '',
        },
        // Extra OSM data for details lookup
        _osm: {
          osm_type: item.osm_type,
          osm_id: item.osm_id,
          lat: item.lat,
          lon: item.lon,
          address: item.address,
        },
      }));

      return reply.code(200).send({ predictions, status: 'OK' });
    } catch (err) {
      app.log.error('Nominatim autocomplete error:', err);
      return reply.code(500).send({ error: 'Geocoding service error', predictions: [] });
    }
  });

  // GET /api/maps/places/details?place_id=...
  // Uses Nominatim lookup / search by OSM ID
  app.get('/places/details', authHook, async (req: FastifyRequest, reply: FastifyReply) => {
    const { place_id } = req.query as { place_id?: string };
    if (!place_id) return reply.code(400).send({ error: 'place_id query param required' });

    try {
      let url: string;
      // Parse osm_type and osm_id from our custom place_id format: osm_<type>_<id>
      const osmMatch = place_id.match(/^osm_(node|way|relation)_(\d+)$/);
      if (osmMatch) {
        const osmType = osmMatch[1][0].toUpperCase(); // N, W, R
        const osmId = osmMatch[2];
        url = `${NOMINATIM_BASE}/lookup?osm_ids=${osmType}${osmId}&format=json&addressdetails=1&accept-language=en`;
      } else {
        // Fallback: treat as search query
        url = `${NOMINATIM_BASE}/search?q=${encodeURIComponent(place_id)}&format=json&addressdetails=1&limit=1&accept-language=en`;
      }

      const res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT },
      });
      const data = await res.json();
      const items = Array.isArray(data) ? data : [data];

      if (items.length === 0) {
        return reply.code(200).send({ result: null, status: 'ZERO_RESULTS' });
      }

      const item = items[0];
      const result = {
        name: item.name || item.display_name?.split(',')[0] || '',
        formatted_address: item.display_name || '',
        geometry: {
          location: {
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
          },
          viewport: item.boundingbox ? {
            northeast: { lat: parseFloat(item.boundingbox[1]), lng: parseFloat(item.boundingbox[3]) },
            southwest: { lat: parseFloat(item.boundingbox[0]), lng: parseFloat(item.boundingbox[2]) },
          } : undefined,
        },
        place_id: place_id,
        url: `https://www.openstreetmap.org/${item.osm_type}/${item.osm_id}`,
      };

      return reply.code(200).send({ result, status: 'OK' });
    } catch (err) {
      app.log.error('Nominatim details error:', err);
      return reply.code(500).send({ error: 'Geocoding service error' });
    }
  });

  // GET /api/maps/directions?origin=...&destination=...
  // Uses OSRM — returns route in Google-like format
  app.get('/directions', authHook, async (req: FastifyRequest, reply: FastifyReply) => {
    const { origin, destination } = req.query as { origin?: string; destination?: string };
    if (!origin || !destination) return reply.code(400).send({ error: 'origin and destination query params required' });

    try {
      // First, geocode origin and destination if they are place names (not coordinates)
      const originCoords = await resolveToCoords(origin);
      const destCoords = await resolveToCoords(destination);

      if (!originCoords || !destCoords) {
        return reply.code(200).send({ routes: [], status: 'ZERO_RESULTS' });
      }

      // OSRM expects lng,lat (not lat,lng)
      const url = `${OSRM_BASE}/route/v1/driving/${originCoords.lng},${originCoords.lat};${destCoords.lng},${destCoords.lat}?overview=full&geometries=polyline&steps=true`;
      const res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT },
      });
      const data = await res.json() as any;

      if (data.code !== 'Ok' || !data.routes?.length) {
        return reply.code(200).send({ routes: [], status: 'ZERO_RESULTS' });
      }

      const osrmRoute = data.routes[0];
      const distanceMeters = Math.round(osrmRoute.distance);
      const durationSecs = Math.round(osrmRoute.duration);
      const distanceKm = Math.round(distanceMeters / 1000);
      const durationMins = Math.round(durationSecs / 60);

      // Format duration text
      let durationText: string;
      if (durationMins >= 60) {
        const hrs = Math.floor(durationMins / 60);
        const mins = durationMins % 60;
        durationText = mins > 0 ? `${hrs} hr ${mins} mins` : `${hrs} hr`;
      } else {
        durationText = `${durationMins} mins`;
      }

      // Transform to Google Directions-like response
      const routes = [{
        legs: [{
          distance: { value: distanceMeters, text: `${distanceKm} km` },
          duration: { value: durationSecs, text: durationText },
          start_address: origin,
          end_address: destination,
        }],
        summary: osrmRoute.legs?.[0]?.summary || 'via road',
        overview_polyline: {
          points: osrmRoute.geometry || '',
        },
      }];

      return reply.code(200).send({ routes, status: 'OK' });
    } catch (err) {
      app.log.error('OSRM directions error:', err);
      return reply.code(500).send({ error: 'Routing service error', routes: [] });
    }
  });

  // GET /api/maps/geocode?latlng=...
  // Uses Nominatim reverse geocoding
  app.get('/geocode', authHook, async (req: FastifyRequest, reply: FastifyReply) => {
    const { latlng } = req.query as { latlng?: string };
    if (!latlng) return reply.code(400).send({ error: 'latlng query param required' });

    const [lat, lng] = latlng.split(',').map((s: string) => s.trim());
    if (!lat || !lng) return reply.code(400).send({ error: 'Invalid latlng format. Expected: lat,lng' });

    try {
      const url = `${NOMINATIM_BASE}/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&accept-language=en`;
      const res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT },
      });
      const data = await res.json() as any;

      if (data.error) {
        return reply.code(200).send({ results: [], status: 'ZERO_RESULTS' });
      }

      // Transform to Google Geocoding-like response
      const address = data.address || {};
      const addressComponents = [];

      if (address.city || address.town || address.village) {
        addressComponents.push({
          long_name: address.city || address.town || address.village,
          short_name: address.city || address.town || address.village,
          types: ['locality', 'political'],
        });
      }
      if (address.state_district) {
        addressComponents.push({
          long_name: address.state_district,
          short_name: address.state_district,
          types: ['administrative_area_level_2', 'political'],
        });
      }
      if (address.state) {
        addressComponents.push({
          long_name: address.state,
          short_name: address.state,
          types: ['administrative_area_level_1', 'political'],
        });
      }
      if (address.country) {
        addressComponents.push({
          long_name: address.country,
          short_name: address.country_code?.toUpperCase() || address.country,
          types: ['country', 'political'],
        });
      }

      const results = [{
        formatted_address: data.display_name || '',
        address_components: addressComponents,
        geometry: {
          location: { lat: parseFloat(lat), lng: parseFloat(lng) },
        },
        place_id: `osm_${data.osm_type}_${data.osm_id}`,
      }];

      return reply.code(200).send({ results, status: 'OK' });
    } catch (err) {
      app.log.error('Nominatim reverse geocode error:', err);
      return reply.code(500).send({ error: 'Geocoding service error', results: [] });
    }
  });

  // GET /api/maps/staticmap?lat=...&lng=...&zoom=14&width=600&height=220&color=red
  app.get('/staticmap', staticMapHandler);
}

/**
 * Helper: resolve a place name or place_id: prefix or coordinate string to { lat, lng }
 */
async function resolveToCoords(input: string): Promise<{ lat: number; lng: number } | null> {
  const trimmed = input.trim();

  // Check if it's already coordinates (e.g. "12.9716,77.5946")
  const coordMatch = trimmed.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
  if (coordMatch) {
    return { lat: parseFloat(coordMatch[1]), lng: parseFloat(coordMatch[2]) };
  }

  // Check if it's a place_id: prefix (from Google Directions format)
  let searchQuery = trimmed;
  if (trimmed.startsWith('place_id:')) {
    const pid = trimmed.replace('place_id:', '').trim();
    // Check if it's our OSM place_id format
    const osmMatch = pid.match(/^osm_(node|way|relation)_(\d+)$/);
    if (osmMatch) {
      const osmType = osmMatch[1][0].toUpperCase();
      const osmId = osmMatch[2];
      try {
        const url = `${NOMINATIM_BASE}/lookup?osm_ids=${osmType}${osmId}&format=json&accept-language=en`;
        const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
        const data = await res.json() as any[];
        if (data.length > 0) {
          return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        }
      } catch {
        // Fall through to search
      }
    }
    // If it's a Google-format place_id, just use it as a search query
    searchQuery = pid;
  }

  // Geocode via Nominatim search
  try {
    const url = `${NOMINATIM_BASE}/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=1&accept-language=en`;
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    const data = await res.json() as any[];
    if (data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch {
    // Failed to resolve
  }

  return null;
}

// Helper to convert lat, lng, zoom to tile coordinates
function getTileCoords(lat: number, lng: number, zoom: number) {
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  );
  return { x, y };
}

// ─── Static Map Image Proxy ────────────────────────────────────────────────────
// GET /api/maps/staticmap?lat=...&lng=...&zoom=14&width=600&height=220&color=red
// Fetches an OpenStreetMap / CartoDB tile image or Google Static Map image server-side.
// Renders rich SVG pin markers, pulse rings, and GPS coordinate telemetry.
export async function staticMapHandler(req: FastifyRequest, reply: FastifyReply) {
  const { lat: latStr, lng: lngStr, zoom: zoomStr = '14', width: widthStr = '600', height: heightStr = '220', color = 'red' } = req.query as {
    lat?: string; lng?: string; zoom?: string; width?: string; height?: string; color?: string;
  };

  if (!latStr || !lngStr) {
    return reply.code(400).send({ error: 'lat and lng query params are required' });
  }

  const lat = parseFloat(latStr);
  const lng = parseFloat(lngStr);
  if (isNaN(lat) || isNaN(lng)) {
    return reply.code(400).send({ error: 'Invalid lat or lng values' });
  }

  const zoom = Math.min(Math.max(parseInt(zoomStr, 10) || 14, 1), 19);
  const width = Math.min(Math.max(parseInt(widthStr, 10) || 600, 100), 1200);
  const height = Math.min(Math.max(parseInt(heightStr, 10) || 220, 100), 800);

  const pinHex = color === 'green' ? '#22c55e' : color === 'blue' ? '#3b82f6' : '#ef4444';
  const pinHexDark = color === 'green' ? '#15803d' : color === 'blue' ? '#1d4ed8' : '#b91c1c';

  // 1. Try Google Maps API if valid key present
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (apiKey && apiKey !== 'AIzaSyCRQ3QPWMeXqYFOBtayGkScl7lXynWqNus') {
    const markerColor = color === 'green' ? '0x22c55e' : color === 'blue' ? '0x3b82f6' : '0xef4444';
    const googleUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${zoom}&size=${width}x${height}&markers=color:${markerColor}%7C${lat},${lng}&maptype=roadmap&key=${apiKey}`;

    try {
      const gRes = await fetch(googleUrl);
      if (gRes.ok) {
        const contentType = gRes.headers.get('content-type') ?? 'image/png';
        reply.header('Content-Type', contentType);
        reply.header('Cache-Control', 'public, max-age=86400');
        return reply.send(Buffer.from(await gRes.arrayBuffer()));
      }
    } catch {
      // Fall through to OpenStreetMap tile engine
    }
  }

  // 2. OpenStreetMap / CartoDB Voyager Tile Engine
  const { x, y } = getTileCoords(lat, lng, zoom);

  const tileUrls = [
    `https://basemaps.cartocdn.com/rastertiles/voyager/${zoom}/${x}/${y}.png`,
    `https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`
  ];

  let tileBase64: string | null = null;

  for (const tUrl of tileUrls) {
    try {
      const tileRes = await fetch(tUrl, {
        headers: { 'User-Agent': USER_AGENT }
      });
      if (tileRes.ok) {
        const buffer = await tileRes.arrayBuffer();
        tileBase64 = `data:image/png;base64,${Buffer.from(buffer).toString('base64')}`;
        break;
      }
    } catch {
      // Try next tile server
    }
  }

  reply.header('Content-Type', 'image/svg+xml');
  reply.header('Cache-Control', 'public, max-age=86400');

  const formattedLat = Math.abs(lat).toFixed(4) + (lat >= 0 ? '&#176; N' : '&#176; S');
  const formattedLng = Math.abs(lng).toFixed(4) + (lng >= 0 ? '&#176; E' : '&#176; W');

  if (tileBase64) {
    // Rich SVG with base64 raster tile background + vector pin overlay
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#000" flood-opacity="0.35"/>
    </filter>
    <linearGradient id="badgeBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" stop-opacity="0.85"/>
      <stop offset="100%" stop-color="#1e293b" stop-opacity="0.95"/>
    </linearGradient>
  </defs>

  <!-- OSM Map Tile -->
  <image href="${tileBase64}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice" />

  <!-- Vignette / Soft Border Overlay -->
  <rect width="100%" height="100%" fill="none" stroke="#64748b" stroke-opacity="0.3" stroke-width="2" />

  <!-- Center Pin Radar Ripple -->
  <circle cx="${width / 2}" cy="${height / 2}" r="22" fill="${pinHex}" fill-opacity="0.18" />
  <circle cx="${width / 2}" cy="${height / 2}" r="12" fill="${pinHex}" fill-opacity="0.35" />
  <circle cx="${width / 2}" cy="${height / 2}" r="5" fill="#ffffff" stroke="${pinHexDark}" stroke-width="2" />

  <!-- Pin Marker Icon -->
  <g transform="translate(${width / 2 - 16}, ${height / 2 - 36})" filter="url(#shadow)">
    <path d="M16 0C7.16 0 0 7.16 0 16c0 12 16 26 16 26s16-14 16-26C32 7.16 24.84 0 16 0zm0 21c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z" fill="${pinHex}"/>
    <circle cx="16" cy="16" r="6" fill="#ffffff"/>
  </g>

  <!-- Location Telemetry Badge -->
  <g transform="translate(12, ${height - 36})">
    <rect width="210" height="24" rx="6" fill="url(#badgeBg)" stroke="#334155" stroke-width="1"/>
    <circle cx="16" cy="12" r="4" fill="#22c55e" />
    <text x="28" y="16" fill="#f8fafc" font-size="11" font-weight="600" font-family="system-ui, -apple-system, sans-serif">GPS: ${formattedLat}, ${formattedLng}</text>
  </g>

  <!-- OpenStreetMap Attribution Badge -->
  <g transform="translate(${width - 128}, ${height - 24})">
    <rect width="120" height="18" rx="4" fill="#ffffff" fill-opacity="0.85"/>
    <text x="60" y="13" fill="#334155" font-size="9" font-weight="700" text-anchor="middle" font-family="sans-serif">&#169; OpenStreetMap</text>
  </g>
</svg>`;

    return reply.send(svg);
  }

  // 3. Fallback Stylized Vector Map Preview (if offline or tile fetch blocked)
  const svgFallback = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#cbd5e1" stroke-width="1" stroke-opacity="0.6"/>
    </pattern>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#000" flood-opacity="0.3"/>
    </filter>
  </defs>

  <!-- Background Canvas -->
  <rect width="100%" height="100%" fill="#f1f5f9"/>
  <rect width="100%" height="100%" fill="url(#grid)"/>

  <!-- Simulated Road Network Lines -->
  <path d="M 0 ${height * 0.4} Q ${width * 0.4} ${height * 0.2} ${width} ${height * 0.6}" fill="none" stroke="#ffffff" stroke-width="12"/>
  <path d="M 0 ${height * 0.4} Q ${width * 0.4} ${height * 0.2} ${width} ${height * 0.6}" fill="none" stroke="#fbbf24" stroke-width="6"/>

  <path d="M ${width * 0.3} 0 Q ${width * 0.5} ${height * 0.6} ${width * 0.7} ${height}" fill="none" stroke="#ffffff" stroke-width="10"/>
  <path d="M ${width * 0.3} 0 Q ${width * 0.5} ${height * 0.6} ${width * 0.7} ${height}" fill="none" stroke="#94a3b8" stroke-width="4"/>

  <!-- Center Location Ripple -->
  <circle cx="${width / 2}" cy="${height / 2}" r="20" fill="${pinHex}" fill-opacity="0.2"/>
  <circle cx="${width / 2}" cy="${height / 2}" r="8" fill="${pinHex}" fill-opacity="0.4"/>

  <!-- Pin Marker Icon -->
  <g transform="translate(${width / 2 - 16}, ${height / 2 - 36})" filter="url(#shadow)">
    <path d="M16 0C7.16 0 0 7.16 0 16c0 12 16 26 16 26s16-14 16-26C32 7.16 24.84 0 16 0zm0 21c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z" fill="${pinHex}"/>
    <circle cx="16" cy="16" r="6" fill="#ffffff"/>
  </g>

  <!-- Location Badge -->
  <g transform="translate(12, ${height - 36})">
    <rect width="210" height="24" rx="6" fill="#0f172a" fill-opacity="0.9"/>
    <circle cx="16" cy="12" r="4" fill="#22c55e" />
    <text x="28" y="16" fill="#f8fafc" font-size="11" font-weight="600" font-family="system-ui, sans-serif">GPS: ${formattedLat}, ${formattedLng}</text>
  </g>
</svg>`;

  return reply.send(svgFallback);
}

