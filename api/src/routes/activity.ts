import { Router, Request, Response } from 'express';
import db from '../db/connection';
import { authenticate } from '../middleware/auth';
import { activityLogSchema } from '../validation/schemas';

const router = Router();

/**
 * POST /activity-logs
 * Log a physical activity.
 */
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const parsed = activityLogSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.errors });
    }

    const { type, duration_minutes, calories_burned, notes, logged_at } = parsed.data;

    const [activity] = await db('activity_logs')
      .insert({
        user_id: req.user!.id,
        type,
        duration_minutes,
        calories_burned: calories_burned || null,
        notes: notes || null,
        logged_at: logged_at || new Date().toISOString(),
      })
      .returning('*');

    res.status(201).json(activity);
  } catch (error: any) {
    console.error('Create activity log error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /activity-logs
 * List activity logs for the authenticated user.
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;

    const offset = (page - 1) * limit;
    const activities = await db('activity_logs')
      .where({ user_id: req.user!.id })
      .orderBy('logged_at', 'desc')
      .limit(limit)
      .offset(offset);

    const [{ count }] = await db('activity_logs')
      .where({ user_id: req.user!.id })
      .count('id as count');

    res.json({
      data: activities,
      pagination: {
        page,
        limit,
        total: parseInt(count as string, 10),
        total_pages: Math.ceil(parseInt(count as string, 10) / limit),
      },
    });
  } catch (error: any) {
    console.error('List activity logs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
