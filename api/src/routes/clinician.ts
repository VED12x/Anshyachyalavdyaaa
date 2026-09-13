import { Router, Request, Response } from 'express';
import db from '../db/connection';
import { authenticate, requireRole } from '../middleware/auth';
import { checkCareAccess } from '../middleware/careAccess';

const router = Router();

/**
 * GET /clinician/patients
 * List all patients linked to the authenticated clinician, with quick-glance status.
 */
router.get('/patients', authenticate, requireRole(['clinician']), async (req: Request, res: Response) => {
  try {
    // Get all active care links for this clinician
    const links = await db('care_links')
      .where({ provider_id: req.user!.id, status: 'active' })
      .join('users', 'care_links.patient_id', 'users.id')
      .select(
        'users.id as patient_id',
        'users.name',
        'users.email',
        'users.diabetes_type',
        'care_links.id as care_link_id',
        'care_links.created_at as linked_since'
      );

    // For each patient, compute quick-glance status
    const patients = await Promise.all(
      links.map(async (link: any) => {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        // Time in range (7d)
        const readings = await db('glucose_readings')
          .where({ user_id: link.patient_id })
          .where('recorded_at', '>=', sevenDaysAgo.toISOString());

        const inRange = readings.filter(
          (r: any) => r.value_mgdl >= 70 && r.value_mgdl <= 180
        ).length;
        const timeInRange = readings.length > 0
          ? Math.round((inRange / readings.length) * 100)
          : 0;

        // Open alerts
        const [{ count: alertCount }] = await db('alerts')
          .where({ user_id: link.patient_id, read: false })
          .count('id as count');

        // Latest glucose
        const latestReading = await db('glucose_readings')
          .where({ user_id: link.patient_id })
          .orderBy('recorded_at', 'desc')
          .first();

        return {
          patient_id: link.patient_id,
          name: link.name,
          email: link.email,
          diabetes_type: link.diabetes_type,
          care_link_id: link.care_link_id,
          linked_since: link.linked_since,
          status: {
            time_in_range: timeInRange,
            open_alerts: parseInt(alertCount as string, 10),
            latest_glucose: latestReading
              ? { value: latestReading.value_mgdl, recorded_at: latestReading.recorded_at }
              : null,
          },
        };
      })
    );

    res.json({ data: patients });
  } catch (error: any) {
    console.error('List clinician patients error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /clinician/patients/:id/report
 * Detailed patient report: glucose history, medication adherence, meal log.
 * Enforces care-link authorization.
 */
router.get('/patients/:id/report', authenticate, requireRole(['clinician', 'caregiver']), async (req: Request, res: Response) => {
  try {
    const patientId = req.params.id;

    // Enforce care-link check
    const hasAccess = await checkCareAccess(req.user!.id, patientId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'No active care link to this patient' });
    }

    const patient = await db('users').where({ id: patientId }).first();
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Glucose history (30 days)
    const glucoseHistory = await db('glucose_readings')
      .where({ user_id: patientId })
      .where('recorded_at', '>=', thirtyDaysAgo.toISOString())
      .orderBy('recorded_at', 'asc');

    // Time-in-range calculations
    const weekReadings = glucoseHistory.filter(
      (r: any) => new Date(r.recorded_at) >= sevenDaysAgo
    );
    const inRangeCount = weekReadings.filter(
      (r: any) => r.value_mgdl >= 70 && r.value_mgdl <= 180
    ).length;
    const timeInRange = weekReadings.length > 0
      ? Math.round((inRangeCount / weekReadings.length) * 100)
      : 0;

    const avgGlucose = weekReadings.length > 0
      ? Math.round(weekReadings.reduce((s: number, r: any) => s + r.value_mgdl, 0) / weekReadings.length)
      : 0;

    // Medication adherence
    const medLogs = await db('medication_logs')
      .where({ user_id: patientId })
      .where('scheduled_for', '>=', thirtyDaysAgo.toISOString());

    const totalLogs = medLogs.length;
    const takenLogs = medLogs.filter((l: any) => l.status === 'taken').length;
    const adherence = totalLogs > 0 ? Math.round((takenLogs / totalLogs) * 100) : 100;

    // Meal log (7 days)
    const meals = await db('meals')
      .where({ user_id: patientId })
      .where('logged_at', '>=', sevenDaysAgo.toISOString())
      .orderBy('logged_at', 'desc');

    // Alerts (30 days)
    const alerts = await db('alerts')
      .where({ user_id: patientId })
      .where('created_at', '>=', thirtyDaysAgo.toISOString())
      .orderBy('created_at', 'desc');

    res.json({
      patient: {
        id: patient.id,
        name: patient.name,
        email: patient.email,
        diabetes_type: patient.diabetes_type,
      },
      summary: {
        time_in_range: timeInRange,
        avg_glucose_7d: avgGlucose,
        adherence,
        total_readings_30d: glucoseHistory.length,
      },
      glucose_history: glucoseHistory.map((r: any) => ({
        value: r.value_mgdl,
        recorded_at: r.recorded_at,
        source: r.source,
      })),
      medication_adherence: {
        total: totalLogs,
        taken: takenLogs,
        missed: medLogs.filter((l: any) => l.status === 'missed').length,
        pending: medLogs.filter((l: any) => l.status === 'pending').length,
      },
      meals: meals.map((m: any) => ({
        description: m.description,
        carbs: m.estimated_carbs_g,
        tag: m.tag,
        logged_at: m.logged_at,
      })),
      alerts,
    });
  } catch (error: any) {
    console.error('Clinician patient report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
