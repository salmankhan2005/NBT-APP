import { sql } from './src/db/client';

(async () => {
  await sql`DELETE FROM lorry_booking_daily_profits WHERE profit_date IN ('2026-08-11', '2026-08-12', '2026-08-13')`;
  await sql`INSERT INTO lorry_booking_daily_profits (profit_date, total_profit, created_at, updated_at) VALUES ('2026-08-11', 5000, now(), now())`;
  await sql`INSERT INTO lorry_booking_daily_profits (profit_date, total_profit, created_at, updated_at) VALUES ('2026-08-12', 3000, now(), now())`;
  await sql`INSERT INTO lorry_booking_daily_profits (profit_date, total_profit, created_at, updated_at) VALUES ('2026-08-13', 7000, now(), now())`;
  console.log('seeded');
})();
