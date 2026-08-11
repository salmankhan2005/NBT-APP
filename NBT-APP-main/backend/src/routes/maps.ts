import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { sql } from '../db/client';

/**
 * Maps proxy routes — serve Google Maps API calls server-side so the API key
 * is never exposed to client bundles. Admin app calls /api/maps/* instead of
 * calling Maps APIs directly.
 */
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

  const MAPS_KEY =
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
    'AIzaSyCRQ3QPWMeXqYFOBtayGkScl7lXynWqNus';

  function mapsKeyError(reply: FastifyReply) {
    return reply.code(503).send({ error: 'Maps service unavailable', message: 'GOOGLE_MAPS_API_KEY not configured.' });
  }

  // GET /api/maps/places/autocomplete?input=...&sessiontoken=...
  app.get('/places/autocomplete', authHook, async (req: FastifyRequest, reply: FastifyReply) => {
    if (!MAPS_KEY) return mapsKeyError(reply);
    const { input, sessiontoken } = req.query as { input?: string; sessiontoken?: string };
    if (!input) return reply.code(400).send({ error: 'input query param required' });

    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&key=${MAPS_KEY}&language=en&components=country:in${sessiontoken ? `&sessiontoken=${encodeURIComponent(sessiontoken)}` : ''}`;
    const res = await fetch(url);
    const data = await res.json();
    return reply.code(200).send(data);
  });

  // GET /api/maps/places/details?place_id=...
  app.get('/places/details', authHook, async (req: FastifyRequest, reply: FastifyReply) => {
    if (!MAPS_KEY) return mapsKeyError(reply);
    const { place_id } = req.query as { place_id?: string };
    if (!place_id) return reply.code(400).send({ error: 'place_id query param required' });

    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(place_id)}&fields=geometry,name,formatted_address,url&key=${MAPS_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    return reply.code(200).send(data);
  });

  // GET /api/maps/directions?origin=...&destination=...
  app.get('/directions', authHook, async (req: FastifyRequest, reply: FastifyReply) => {
    if (!MAPS_KEY) return mapsKeyError(reply);
    const { origin, destination } = req.query as { origin?: string; destination?: string };
    if (!origin || !destination) return reply.code(400).send({ error: 'origin and destination query params required' });

    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&mode=driving&language=en&key=${MAPS_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    return reply.code(200).send(data);
  });

  // GET /api/maps/geocode?latlng=...
  app.get('/geocode', authHook, async (req: FastifyRequest, reply: FastifyReply) => {
    if (!MAPS_KEY) return mapsKeyError(reply);
    const { latlng } = req.query as { latlng?: string };
    if (!latlng) return reply.code(400).send({ error: 'latlng query param required' });

    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${encodeURIComponent(latlng)}&key=${MAPS_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    return reply.code(200).send(data);
  });
}
