import { Router, Request, Response } from 'express';
import db from '../db/connection';
import { requireRole } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

// Only admin can access these routes
router.use(requireRole(['admin']));

/**
 * Log admin access to a patient record
 */
const auditSchema = z.object({
  patient_id: z.string().uuid(),
  reason: z.string().min(5),
});

// Admin views a patient
router.post('/audit-log', async (req: Request, res: Response) => {
  try {
    const parsed = auditSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.errors });
    }

    const { patient_id, reason } = parsed.data;

    const patient = await db('users').where({ id: patient_id, role: 'patient' }).first();
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    await db('admin_audit_log').insert({
      admin_id: req.user!.id,
      patient_id,
      reason,
    });

    res.status(201).json({ message: 'Audit log created successfully' });
  } catch (error: any) {
    console.error('Admin audit log error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// List users for admin dashboard
router.get('/users', async (req: Request, res: Response) => {
  try {
    const users = await db('users')
      .select('id', 'name', 'email', 'role', 'diabetes_type', 'created_at')
      .orderBy('created_at', 'desc');
    res.json({ data: users });
  } catch (error: any) {
    console.error('List users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
