import { Router, Request, Response } from 'express';
import db from '../db/connection';
import { requireRole } from '../middleware/auth';

const router = Router();
router.use(requireRole(['relative']));

router.get('/patients/:id/summary', async (req: Request, res: Response) => {
  try {
    const patientId = req.params.id;
    
    // Verify care link
    const link = await db('care_links')
      .where({ patient_id: patientId, provider_id: req.user!.id, status: 'active' })
      .first();
      
    if (!link) {
      return res.status(403).json({ error: 'No active care link with this patient' });
    }

    // Fetch minimal summary
    const [latestReading] = await db('glucose_readings')
      .where({ user_id: patientId })
      .orderBy('timestamp', 'desc')
      .limit(1);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayMeds = await db('medication_logs')
      .join('medications', 'medication_logs.medication_id', 'medications.id')
      .where('medication_logs.user_id', patientId)
      .where('scheduled_for', '>=', today.toISOString())
      .select('medications.name', 'medication_logs.status', 'medication_logs.scheduled_for');

    const recentAlerts = await db('alerts')
      .where({ user_id: patientId })
      .orderBy('created_at', 'desc')
      .limit(5)
      .select('type', 'message', 'created_at'); // No raw probabilities

    let meals: any[] = [];
    if (link.share_diet_detail) {
      meals = await db('meals')
        .where({ user_id: patientId })
        .orderBy('logged_at', 'desc')
        .limit(5);
    }

    res.json({
      data: {
        latest_glucose: latestReading ? latestReading.value : null,
        trend: latestReading ? latestReading.trend : null,
        today_medications: todayMeds,
        recent_alerts: recentAlerts,
        recent_meals: meals, // Empty if not shared
      }
    });
  } catch (error: any) {
    console.error('Relative summary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


router.get('/patients', async (req: Request, res: Response) => {
  try {
    const patients = await db('care_links')
      .join('users', 'care_links.patient_id', 'users.id')
      .where('care_links.provider_id', req.user!.id)
      .where('care_links.status', 'active')
      .select('users.id', 'users.name', 'users.email', 'care_links.share_diet_detail');
    res.json({ data: patients });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});
export default router;

