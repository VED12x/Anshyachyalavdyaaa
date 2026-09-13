import { Router, Request, Response } from 'express';
import db from '../db/connection';
import { authenticate } from '../middleware/auth';
import { resolvePatientAccess } from '../middleware/careAccess';
import { glucoseReadingSchema, glucoseQuerySchema } from '../validation/schemas';
import { publishEvent, CHANNELS } from '../services/redis';

const router = Router();

/**
 * POST /glucose-readings
 * Log a manual glucose reading.
 */
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const parsed = glucoseReadingSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.errors });
    }

    const { value_mgdl, source, recorded_at } = parsed.data;

    const [reading] = await db('glucose_readings')
      .insert({
        user_id: req.user!.id,
        value_mgdl,
        source,
        recorded_at: recorded_at || new Date().toISOString(),
      })
      .returning('*');

    // Publish event for real-time alerts
    await publishEvent(CHANNELS.GLUCOSE_NEW_READING, {
      user_id: req.user!.id,
      reading_id: reading.id,
      value_mgdl: reading.value_mgdl,
      recorded_at: reading.recorded_at,
      source: reading.source,
    });

    res.status(201).json(reading);
  } catch (error: any) {
    console.error('Create glucose reading error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /glucose-readings
 * List glucose readings with pagination and date filtering.
 * Returns data in the format the frontend expects: { t: string, v: number }
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const queryParsed = glucoseQuerySchema.safeParse(req.query);
    if (!queryParsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: queryParsed.error.errors });
    }

    const { start_date, end_date, page, limit } = queryParsed.data;

    // Resolve patient access (own data or via care link)
    const targetPatientId = req.query.patient_id as string | undefined;
    const { patientId, authorized } = await resolvePatientAccess(
      req.user!.id,
      req.user!.role,
      targetPatientId
    );

    if (!authorized) {
      return res.status(403).json({ error: 'Access denied to this patient\'s data' });
    }

    let query = db('glucose_readings')
      .where({ user_id: patientId })
      .orderBy('recorded_at', 'desc');

    if (start_date) {
      query = query.where('recorded_at', '>=', start_date);
    }
    if (end_date) {
      query = query.where('recorded_at', '<=', end_date);
    }

    const offset = (page - 1) * limit;
    const readings = await query.limit(limit).offset(offset);

    // Get total count for pagination
    const [{ count }] = await db('glucose_readings')
      .where({ user_id: patientId })
      .modify((qb: any) => {
        if (start_date) qb.where('recorded_at', '>=', start_date);
        if (end_date) qb.where('recorded_at', '<=', end_date);
      })
      .count('id as count');

    // Format for frontend: { t: "12a", v: 118 }
    const formatted = readings.map((r: any) => {
      const date = new Date(r.recorded_at);
      const hours = date.getHours();
      const ampm = hours >= 12 ? 'p' : 'a';
      const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
      return {
        id: r.id,
        t: `${displayHour}${ampm}`,
        v: r.value_mgdl,
        source: r.source,
        recorded_at: r.recorded_at,
      };
    });

    res.json({
      data: formatted,
      pagination: {
        page,
        limit,
        total: parseInt(count as string, 10),
        total_pages: Math.ceil(parseInt(count as string, 10) / limit),
      },
    });
  } catch (error: any) {
    console.error('List glucose readings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
