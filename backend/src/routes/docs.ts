import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { sql } from '../db/client';

export async function docsRoutes(app: FastifyInstance) {
  const adminHook = { preHandler: [app.authenticate, app.requireAdmin] };

  // ── GC Notes Routes ───────────────────────────────────────────────────────
  app.get('/gc', adminHook, async (_req: FastifyRequest, reply: FastifyReply) => {
    const rows = await sql`
      SELECT * FROM gc_notes
      ORDER BY created_at DESC
    `;
    return reply.code(200).send(rows);
  });

  app.post('/gc', adminHook, async (req: FastifyRequest, reply: FastifyReply) => {
    const body = req.body as Record<string, any>;
    const id = body.id || body.noteNumber || `GC-${Date.now()}`;
    const gcNumber = body.noteNumber || body.gcNumber || `GC-${Math.floor(1000 + Math.random() * 9000)}`;
    const date = body.date || new Date().toISOString();
    const consignorName = body.consignor || body.consignorName || '';
    const consigneeName = body.consignee || body.consigneeName || '';
    const freightAmount = Number(body.freight ?? body.freightAmount ?? 0);
    const totalAmount = Number(body.total ?? body.totalAmount ?? 0);
    const advanceAmount = Number(body.lessAdvance ?? body.advanceAmount ?? 0);
    const balanceAmount = Number(body.balance ?? body.balanceAmount ?? 0);

    await sql`
      INSERT INTO gc_notes (
        id, gc_number, date, consignor_name, consignee_name, items,
        freight_amount, total_amount, advance_amount, balance_amount, raw_data
      )
      VALUES (
        ${id}, ${gcNumber}, ${date}, ${consignorName}, ${consigneeName},
        ${JSON.stringify(body.items || [])}, ${freightAmount}, ${totalAmount},
        ${advanceAmount}, ${balanceAmount}, ${JSON.stringify(body)}
      )
      ON CONFLICT (id) DO UPDATE SET
        gc_number      = EXCLUDED.gc_number,
        date           = EXCLUDED.date,
        consignor_name = EXCLUDED.consignor_name,
        consignee_name = EXCLUDED.consignee_name,
        items          = EXCLUDED.items,
        freight_amount = EXCLUDED.freight_amount,
        total_amount   = EXCLUDED.total_amount,
        advance_amount = EXCLUDED.advance_amount,
        balance_amount = EXCLUDED.balance_amount,
        raw_data       = EXCLUDED.raw_data,
        updated_at     = now()
    `;

    return reply.code(201).send({ id, gcNumber });
  });

  app.delete('/gc/:id', adminHook, async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    await sql`DELETE FROM gc_notes WHERE id = ${id}`;
    return reply.code(200).send({ deleted: true });
  });

  // ── Memo Routes ───────────────────────────────────────────────────────────
  app.get('/memos', adminHook, async (_req: FastifyRequest, reply: FastifyReply) => {
    const rows = await sql`
      SELECT * FROM memos
      ORDER BY created_at DESC
    `;
    return reply.code(200).send(rows);
  });

  app.post('/memos', adminHook, async (req: FastifyRequest, reply: FastifyReply) => {
    const body = req.body as Record<string, any>;
    const id = body.id || body.memoId || `MEMO-${Date.now()}`;
    const date = body.date || new Date().toISOString();
    const contentHtml = body.contentHtml || '';

    await sql`
      INSERT INTO memos (id, date, content_html, created_by, status)
      VALUES (${id}, ${date}, ${contentHtml}, ${body.createdBy || 'Admin'}, ${body.status || 'SAVED'})
      ON CONFLICT (id) DO UPDATE SET
        content_html = EXCLUDED.content_html,
        status       = EXCLUDED.status,
        updated_at   = now()
    `;

    return reply.code(201).send({ id });
  });

  app.delete('/memos/:id', adminHook, async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    await sql`DELETE FROM memos WHERE id = ${id}`;
    return reply.code(200).send({ deleted: true });
  });
}
