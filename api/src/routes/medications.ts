import { Router, Request, Response } from 'express';
import db from '../db/connection';
import { authenticate } from '../middleware/auth';
import { medicationSchema, medicationUpdateSchema, medicationLogSchema } from '../validation/schemas';

const router = Router();

/**
 * POST /medications
 * Create a new medication entry.
 */
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const parsed = medicationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.errors });
    }

    const { name, dosage, times_per_day, schedule_times, notes } = parsed.data;

    const [medication] = await db('medications')
      .insert({
        user_id: req.user!.id,
        name,
        dosage,
        times_per_day,
        schedule_times: schedule_times ? `{${schedule_times.join(',')}}` : null,
        notes,
      })
      .returning('*');

    res.status(201).json(medication);
  } catch (error: any) {
    console.error('Create medication error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /medications
 * List user's medications. Returns format matching frontend: { name, time, done }
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const medications = await db('medications')
      .where({ user_id: req.user!.id, active: true })
      .orderBy('created_at', 'desc');

    // For each medication, get today's log status
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const medsWithStatus = await Promise.all(
      medications.map(async (med: any) => {
        const logs = await db('medication_logs')
          .where({ medication_id: med.id })
          .where('scheduled_for', '>=', today.toISOString())
          .where('scheduled_for', '<', tomorrow.toISOString())
          .orderBy('scheduled_for', 'asc');

        // Format each scheduled time as a separate entry (matching frontend)
        if (logs.length > 0) {
          return logs.map((log: any) => ({
            id: med.id,
            log_id: log.id,
            name: `${med.name} ${med.dosage}`,
            time: new Date(log.scheduled_for).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            }),
            done: log.status === 'taken',
            status: log.status,
            medication: med,
          }));
        }

        // No logs yet — show schedule times
        const times = med.schedule_times || [];
        return times.map((t: string) => ({
          id: med.id,
          name: `${med.name} ${med.dosage}`,
          time: t,
          done: false,
          status: 'pending',
          medication: med,
        }));
      })
    );

    res.json({ data: medsWithStatus.flat() });
  } catch (error: any) {
    console.error('List medications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /medications/:id
 * Update a medication.
 */
router.patch('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const parsed = medicationUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.errors });
    }

    const updateData: any = { ...parsed.data, updated_at: new Date().toISOString() };
    if (updateData.schedule_times) {
      updateData.schedule_times = `{${updateData.schedule_times.join(',')}}`;
    }

    const [medication] = await db('medications')
      .where({ id: req.params.id, user_id: req.user!.id })
      .update(updateData)
      .returning('*');

    if (!medication) {
      return res.status(404).json({ error: 'Medication not found' });
    }

    res.json(medication);
  } catch (error: any) {
    console.error('Update medication error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /medications/:id/log
 * Mark a scheduled dose as taken or missed.
 */
router.post('/:id/log', authenticate, async (req: Request, res: Response) => {
  try {
    const parsed = medicationLogSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.errors });
    }

    const { status, taken_at } = parsed.data;

    // Verify medication belongs to user
    const medication = await db('medications')
      .where({ id: req.params.id, user_id: req.user!.id })
      .first();

    if (!medication) {
      return res.status(404).json({ error: 'Medication not found' });
    }

    // Find the pending log entry for today, or create one
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let log = await db('medication_logs')
      .where({ medication_id: req.params.id, status: 'pending' })
      .where('scheduled_for', '>=', today.toISOString())
      .where('scheduled_for', '<', tomorrow.toISOString())
      .orderBy('scheduled_for', 'asc')
      .first();

    if (log) {
      // Update existing log
      const [updated] = await db('medication_logs')
        .where({ id: log.id })
        .update({
          status,
          taken_at: status === 'taken' ? (taken_at || new Date().toISOString()) : null,
        })
        .returning('*');
      return res.json(updated);
    } else {
      // Create a new log entry
      const [newLog] = await db('medication_logs')
        .insert({
          medication_id: req.params.id,
          user_id: req.user!.id,
          scheduled_for: new Date().toISOString(),
          taken_at: status === 'taken' ? (taken_at || new Date().toISOString()) : null,
          status,
        })
        .returning('*');
      return res.status(201).json(newLog);
    }
  } catch (error: any) {
    console.error('Log medication error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
