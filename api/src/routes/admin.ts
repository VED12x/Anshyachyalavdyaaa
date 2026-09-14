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


// System Health (Phase 12)
router.get('/system-health', async (req: Request, res: Response) => {
  // Proxy to the internal metrics variables or return basic health
  res.json({
    data: {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    }
  });
});

// Admin Escalations (Phase 12)
router.get('/escalations', async (req: Request, res: Response) => {
  try {
    const escalations = await db('chatbot_sessions')
      .join('users', 'chatbot_sessions.user_id', 'users.id')
      .where('status', 'escalated')
      .where('escalation_target', 'support')
      .select('chatbot_sessions.*', 'users.name as patient_name', 'users.email')
      .orderBy('started_at', 'desc');
    res.json({ data: escalations });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Food Database (Phase 16 prep)
router.get('/food-database', async (req: Request, res: Response) => {
  try {
    const foods = await db('food_items').orderBy('name', 'asc');
    res.json({ data: foods });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin Deactivate User (Phase 12)
router.patch('/users/:id/deactivate', async (req: Request, res: Response) => {
  try {
    const updated = await db('users')
      .where({ id: req.params.id })
      .update({ role: 'deactivated', updated_at: new Date().toISOString() })
      .returning('*');
    
    if (updated.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ data: updated[0] });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin view patient (creates audit log automatically)
router.get('/patients/:id', async (req: Request, res: Response) => {
  try {
    const reason = req.query.reason as string;
    if (!reason || reason.length < 5) {
      return res.status(400).json({ error: 'Audit reason required (min 5 chars) to view patient data' });
    }

    const patient = await db('users').where({ id: req.params.id, role: 'patient' }).first();
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    // Write audit log
    await db('admin_audit_log').insert({
      admin_id: req.user!.id,
      patient_id: patient.id,
      reason,
    });

    // Return sensitive patient data (same as doctor report)
    const [latestReading] = await db('glucose_readings')
      .where({ user_id: patient.id })
      .orderBy('timestamp', 'desc')
      .limit(1);

    res.json({
      data: {
        patient: { id: patient.id, name: patient.name, email: patient.email },
        latest_glucose: latestReading || null
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Chatbot Menu (Phase 14)
router.get('/chatbot-menu', async (req: Request, res: Response) => {
  try {
    const menus = await db('chatbot_menu_config').orderBy('label', 'asc');
    res.json({ data: menus });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/chatbot-menu/:id', async (req: Request, res: Response) => {
  try {
    const { label, response_text, action } = req.body;
    const [updated] = await db('chatbot_menu_config')
      .where({ id: req.params.id })
      .update({ label, response_text, action })
      .returning('*');
    res.json({ data: updated });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});
export default router;
