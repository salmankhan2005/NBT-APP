import { z, ZodSchema } from 'zod';
import { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Returns a Fastify preHandler that validates `request.body` against the given Zod schema.
 * Sends 400 with formatted field errors on failure.
 */
export function validateBody<T>(schema: ZodSchema<T>) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const result = schema.safeParse(request.body);
    if (!result.success) {
      const fieldErrors = result.error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      reply.code(400).send({ error: 'Validation failed', details: fieldErrors });
    } else {
      (request as any).validatedBody = result.data;
    }
  };
}

// ── Reusable Zod schemas ─────────────────────────────────────────────────────

export const LoginSchema = z.object({
  trackingId: z.string().min(1).max(50).trim(),
  pin: z.string().min(4).max(12).trim(),
});

export const StartTripSchema = z.object({
  driverName: z.string().min(1).max(100).trim(),
  odometer: z.number().nonnegative(),
  odometerPhotoUrl: z.string().max(2000).trim(),
  dieselLevel: z.enum(['EMPTY', '1/4', '1/2', '3/4', 'FULL']),
  gps: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    city: z.string().max(100).trim(),
    address: z.string().max(300).trim(),
  }),
});

export const GpsSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  city: z.string().max(100).trim(),
  address: z.string().max(300).trim(),
});

export const ExpenseSchema = z.object({
  category: z.enum(['FUEL', 'TOLL', 'RTO', 'POLICE', 'LORRY', 'OTHER']),
  amount: z.number().positive().max(999999),
  reason: z.string().max(500).trim().optional(),
  liters: z.number().positive().optional(),
  receiptUrl: z.string().max(2000).trim().optional(),
  location: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    city: z.string().max(100).trim(),
    address: z.string().max(300).trim(),
  }).optional(),
});

export const PodSchema = z.object({
  podPhotoUrl: z.string().max(500000).trim().optional().default(''),
  podSignature: z.string().max(500000).trim().optional().default('Signed'),
  podNotes: z.string().max(5000).trim().optional(),
  gps: GpsSchema.optional(),
});

export const CompleteTripSchema = z.object({
  odometerEnd: z.number().nonnegative(),
  odometerEndPhotoUrl: z.string().max(2000).optional(),
  dieselEnd: z.enum(['EMPTY', '1/4', '1/2', '3/4', 'FULL']),
});

export const SyncSchema = z.object({
  actions: z.array(
    z.object({
      id: z.string(),
      type: z.enum(['START_TRIP', 'ADD_EXPENSE', 'UPLOAD_POD', 'COMPLETE_TRIP', 'UPDATE_GPS']),
      payload: z.record(z.unknown()),
      timestamp: z.string(),
    })
  ).max(500),
});

export const CreateTripSchema = z.object({
  id: z.string().min(1).max(50).trim(),
  driverId: z.string().min(1).max(50).trim(),
  trackingId: z.string().min(1).max(50).trim(),
  driverName: z.string().min(1).max(100).trim(),
  vehicleNumber: z.string().min(1).max(20).trim(),
  vehicleType: z.enum(['6 Wheel', '10 Wheel', '12 Wheel', '16 Wheel']),
  startingPoint: z.string().min(1).max(300).trim(),
  destination: z.string().min(1).max(300).trim(),
  tollsCount: z.number().nonnegative().int(),
  estimatedTollCost: z.number().nonnegative(),
  driverPin: z.string().min(4).max(12).trim().optional(),
  agreedFreight: z.number().nonnegative().optional().default(0),
});
