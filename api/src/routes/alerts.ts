import { Router, Request, Response } from 'express';
import db from '../db/connection';
import { authenticate } from '../middleware/auth';
import { alertQuerySchema } from '../validation/schemas';

const router = Router();

/**
 * GET /alerts
 * List alerts for the authenticated user, with optional filtering.
 * Serves as fallback for offline clients that missed WebSocket pushes.
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const parsed = alertQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.errors });
    }

    const { unread_only, page, limit } = parsed.data;

    let query = db('alerts')
      .where({ user_id: req.user!.id })
      .orderBy('created_at', 'desc');

    if (unread_only) {
      query = query.where({ read: false });
    }

    const offset = (page - 1) * limit;
    const alerts = await query.limit(limit).offset(offset);

    const [{ count }] = await db('alerts')
      .where({ user_id: req.user!.id })
      .modify((qb: any) => {
        if (unread_only) qb.where({ read: false });
      })
      .count('id as count');

    res.json({
      data: alerts,
      pagination: {
        page,
        limit,
        total: parseInt(count as string, 10),
        total_pages: Math.ceil(parseInt(count as string, 10) / limit),
      },
    });
  } catch (error: any) {
    console.error('List alerts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /alerts/:id/acknowledge
 * Mark an alert as acknowledged/read.
 */
router.patch('/:id/acknowledge', authenticate, async (req: Request, res: Response) => {
  try {
    const [alert] = await db('alerts')
      .where({ id: req.params.id, user_id: req.user!.id })
      .update({
        read: true,
        acknowledged_at: new Date().toISOString(),
      })
      .returning('*');

    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    res.json(alert);
  } catch (error: any) {
    console.error('Acknowledge alert error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
