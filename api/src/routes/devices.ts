import { Router, Request, Response } from 'express';
import db from '../db/connection';
import { authenticate } from '../middleware/auth';
import { devicePairSchema, deviceReadingSchema } from '../validation/schemas';
import { publishEvent, CHANNELS } from '../services/redis';
import { deviceIngestionLimiter } from '../middleware/rateLimiter';

const router = Router();

/**
 * POST /devices/pair
 * Register a device (glucometer, CGM, wearable) against the authenticated user.
 */
router.post('/pair', authenticate, async (req: Request, res: Response) => {
  try {
    const parsed = devicePairSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.errors });
    }

    const { device_type, external_id, name, manufacturer } = parsed.data;

    // Check if device already paired
    const existing = await db('devices')
      .where({ user_id: req.user!.id, external_id })
      .first();

    if (existing) {
      return res.status(409).json({
        error: 'Device already paired',
        device: existing,
      });
    }

    const [device] = await db('devices')
      .insert({
        user_id: req.user!.id,
        device_type,
        external_id,
        name: name || null,
        manufacturer: manufacturer || null,
      })
      .returning('*');

    res.status(201).json(device);
  } catch (error: any) {
    console.error('Pair device error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /devices
 * List user's paired devices.
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const devices = await db('devices')
      .where({ user_id: req.user!.id, active: true })
      .orderBy('paired_at', 'desc');

    res.json({ data: devices });
  } catch (error: any) {
    console.error('List devices error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /devices/:id/readings
 * Ingest glucose readings from a device.
 * - Enforces idempotency: duplicate (device_id + recorded_at) are skipped.
 * - Publishes glucose.new_reading event to Redis for each new reading.
 */
router.post('/:id/readings', authenticate, deviceIngestionLimiter, async (req: Request, res: Response) => {
  try {
    const parsed = deviceReadingSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.errors });
    }

    // Verify device belongs to user
    const device = await db('devices')
      .where({ id: req.params.id, user_id: req.user!.id })
      .first();

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    const { readings } = parsed.data;
    const inserted: any[] = [];
    const skipped: number[] = [];

    for (let i = 0; i < readings.length; i++) {
      const reading = readings[i];
      try {
        // Insert with conflict handling for idempotency
        // The unique index on (device_id, recorded_at) prevents duplicates
        const [row] = await db('glucose_readings')
          .insert({
            user_id: req.user!.id,
            value_mgdl: reading.value_mgdl,
            source: 'device',
            device_id: req.params.id,
            recorded_at: reading.recorded_at,
          })
          .onConflict(db.raw('(device_id, recorded_at) WHERE device_id IS NOT NULL'))
          .ignore()
          .returning('*');

        if (row) {
          inserted.push(row);

          // Publish event for real-time processing
          await publishEvent(CHANNELS.GLUCOSE_NEW_READING, {
            user_id: req.user!.id,
            reading_id: row.id,
            value_mgdl: row.value_mgdl,
            recorded_at: row.recorded_at,
            source: 'device',
            device_id: req.params.id,
          });
        } else {
          skipped.push(i);
        }
      } catch (err: any) {
        // Handle unique constraint violation gracefully
        if (err.code === '23505') {
          skipped.push(i);
        } else {
          throw err;
        }
      }
    }

    // Update device last_synced_at
    await db('devices')
      .where({ id: req.params.id })
      .update({ last_synced_at: new Date().toISOString() });

    res.status(201).json({
      inserted: inserted.length,
      skipped: skipped.length,
      total: readings.length,
      readings: inserted,
    });
  } catch (error: any) {
    console.error('Device readings ingestion error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
