import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { sql } from '../db/client';

function toCurrencyNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value.replace(/[^0-9.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function formatBusinessDate(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function isValidDateString(value?: string): boolean {
  if (!value) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime());
}

export async function lorryBookingRoutes(app: FastifyInstance) {
  const authHook = { preHandler: [app.authenticate, app.requireAdmin] };

  app.post('/', authHook, async (req: FastifyRequest, reply: FastifyReply) => {
    const body = req.body as Record<string, unknown>;

    const fromPoint = String(body.fromPoint || '').trim();
    const destinationPoint = String(body.destinationPoint || '').trim();
    const name = String(body.name || '').trim();
    const vehicleNumber = String(body.vehicleNumber || '').trim().toUpperCase();

    if (!fromPoint || !destinationPoint) {
      return reply.code(400).send({ success: false, error: 'From Point and Destination Point are required.' });
    }

    const loadFreight = toCurrencyNumber(body.loadFreight);
    const lorryFreight = toCurrencyNumber(body.lorryFreight);
    const coolie = toCurrencyNumber(body.coolie);
    const commissionFreight = toCurrencyNumber(body.commissionFreight);
    const expenses = toCurrencyNumber(body.expenses);

    if (loadFreight < 0 || lorryFreight < 0 || coolie < 0 || commissionFreight < 0 || expenses < 0) {
      return reply.code(400).send({ success: false, error: 'Financial values cannot be negative.' });
    }

    const grossFreight = loadFreight - lorryFreight;
    const totalFreight = grossFreight + coolie + commissionFreight;
    const bookingProfit = totalFreight - expenses;
    const businessDate = formatBusinessDate();

    try {
      const result = await sql`
        WITH inserted_entry AS (
          INSERT INTO lorry_booking_entries (
            id, profit_date, name, vehicle_number, from_point, destination_point,
            load_freight, lorry_freight, gross_freight,
            coolie, commission_freight, total_freight,
            expenses, profit, created_at, updated_at
          )
          VALUES (
            gen_random_uuid()::text,
            ${businessDate},
            ${name},
            ${vehicleNumber},
            ${fromPoint},
            ${destinationPoint},
            ${loadFreight},
            ${lorryFreight},
            ${grossFreight},
            ${coolie},
            ${commissionFreight},
            ${totalFreight},
            ${expenses},
            ${bookingProfit},
            now(),
            now()
          )
          RETURNING id
        ),
        upserted_daily AS (
          INSERT INTO lorry_booking_daily_profits (profit_date, total_profit, created_at, updated_at)
          VALUES (${businessDate}, ${bookingProfit}, now(), now())
          ON CONFLICT (profit_date) DO UPDATE SET
            total_profit = lorry_booking_daily_profits.total_profit + EXCLUDED.total_profit,
            updated_at = now()
          RETURNING profit_date, total_profit
        )
        SELECT profit_date, total_profit
        FROM upserted_daily
      `;

      return reply.code(200).send({
        success: true,
        bookingProfit,
        date: businessDate,
        dailyProfit: Number(result[0]?.total_profit || 0),
      });
    } catch (error) {
      app.log.error(error);
      return reply.code(500).send({ success: false, error: 'Unable to save booking. Please try again.' });
    }
  });

  app.get('/entries', authHook, async (req: FastifyRequest, reply: FastifyReply) => {
    const query = req.query as Record<string, unknown>;
    const limit = Math.min(Number(query.limit || 50), 100);
    const rows = await sql`
      SELECT id, profit_date, name, vehicle_number, from_point, destination_point,
             load_freight, lorry_freight, gross_freight,
             coolie, commission_freight, total_freight,
             expenses, profit, created_at
      FROM lorry_booking_entries
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;
    return reply.code(200).send({ success: true, entries: rows });
  });

  app.get('/profit', authHook, async (req: FastifyRequest, reply: FastifyReply) => {
    const query = req.query as Record<string, unknown>;
    const fromDate = String(query.fromDate || '').trim();
    const toDate = String(query.toDate || '').trim();

    if (!fromDate || !toDate || !isValidDateString(fromDate) || !isValidDateString(toDate)) {
      return reply.code(400).send({ success: false, error: 'Please provide valid fromDate and toDate.' });
    }

    if (fromDate > toDate) {
      return reply.code(400).send({ success: false, error: 'From Date cannot be later than To Date.' });
    }

    const rows = await sql`
      SELECT COALESCE(SUM(total_profit), 0)::numeric AS total_profit
      FROM lorry_booking_daily_profits
      WHERE profit_date >= ${fromDate}
        AND profit_date <= ${toDate}
    `;

    const totalProfit = Number(rows[0]?.total_profit || 0);

    return reply.code(200).send({
      success: true,
      fromDate,
      toDate,
      totalProfit,
    });
  });
}
