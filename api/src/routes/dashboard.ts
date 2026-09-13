import { Router, Request, Response } from 'express';
import db from '../db/connection';
import { authenticate } from '../middleware/auth';
import { resolvePatientAccess } from '../middleware/careAccess';
import { mlService } from '../services/mlService';

const router = Router();

/**
 * GET /dashboard/summary
 * Aggregate endpoint returning everything the Overview screen needs in one call:
 * - Current glucose reading
 * - Time-in-range % (7 days)
 * - Estimated HbA1c
 * - Medication adherence %
 * - Today's medications
 * - Latest alert
 * - Glucose forecast
 * - Risk prediction
 */
router.get('/summary', authenticate, async (req: Request, res: Response) => {
  try {
    // Resolve patient access
    const targetPatientId = req.query.patient_id as string | undefined;
    const { patientId, authorized } = await resolvePatientAccess(
      req.user!.id,
      req.user!.role,
      targetPatientId
    );

    if (!authorized) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    // --- Current glucose (latest reading) ---
    const latestReading = await db('glucose_readings')
      .where({ user_id: patientId })
      .orderBy('recorded_at', 'desc')
      .first();

    // --- 7-day glucose readings for time-in-range ---
    const weekReadings = await db('glucose_readings')
      .where({ user_id: patientId })
      .where('recorded_at', '>=', sevenDaysAgo.toISOString())
      .orderBy('recorded_at', 'asc');

    // Time in range: 70-180 mg/dL
    const inRangeCount = weekReadings.filter(
      (r: any) => r.value_mgdl >= 70 && r.value_mgdl <= 180
    ).length;
    const timeInRange = weekReadings.length > 0
      ? Math.round((inRangeCount / weekReadings.length) * 100)
      : 0;

    // Average glucose for estimated HbA1c calculation
    // Formula: eA1c = (average_glucose + 46.7) / 28.7
    const avgGlucose = weekReadings.length > 0
      ? weekReadings.reduce((sum: number, r: any) => sum + r.value_mgdl, 0) / weekReadings.length
      : 0;
    const estimatedHbA1c = avgGlucose > 0
      ? parseFloat(((avgGlucose + 46.7) / 28.7).toFixed(1))
      : 0;

    // Hypo/hyper event counts (7 days)
    const hypoEvents = weekReadings.filter((r: any) => r.value_mgdl < 70).length;
    const hyperEvents = weekReadings.filter((r: any) => r.value_mgdl > 180).length;

    // --- Medication adherence (30 days for %) ---
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const medLogs = await db('medication_logs')
      .where({ user_id: patientId })
      .where('scheduled_for', '>=', thirtyDaysAgo.toISOString());

    const totalLogs = medLogs.length;
    const takenLogs = medLogs.filter((l: any) => l.status === 'taken').length;
    const adherence = totalLogs > 0 ? Math.round((takenLogs / totalLogs) * 100) : 100;

    // Today's medication status
    const todayMedLogs = await db('medication_logs')
      .where({ user_id: patientId })
      .where('scheduled_for', '>=', todayStart.toISOString())
      .where('scheduled_for', '<=', todayEnd.toISOString());

    const todayTotal = todayMedLogs.length;
    const todayTaken = todayMedLogs.filter((l: any) => l.status === 'taken').length;

    // --- Latest alert ---
    const latestAlert = await db('alerts')
      .where({ user_id: patientId })
      .orderBy('created_at', 'desc')
      .first();

    // --- Glucose forecast (from ML service) ---
    let forecast = { forecast: [] as any[], model_version: 'unavailable' };
    let risk = { hypo_risk: 0, hyper_risk: 0, event_type: null as string | null, reason: '', model_version: 'unavailable' };

    if (weekReadings.length >= 6) {
      const recentReadings = weekReadings.slice(-12).map((r: any) => ({
        value: r.value_mgdl,
        timestamp: r.recorded_at,
      }));

      // Get recent meals for ML context
      const recentMeals = await db('meals')
        .where({ user_id: patientId })
        .where('logged_at', '>=', todayStart.toISOString())
        .orderBy('logged_at', 'desc')
        .limit(5);

      try {
        [forecast, risk] = await Promise.all([
          mlService.getForecast(recentReadings, recentMeals),
          mlService.getRiskPrediction(recentReadings, recentMeals),
        ]);
      } catch (err) {
        console.warn('ML service unavailable for dashboard forecast');
      }
    }

    // --- Today's glucose history (for chart) ---
    const todayReadings = await db('glucose_readings')
      .where({ user_id: patientId })
      .where('recorded_at', '>=', todayStart.toISOString())
      .where('recorded_at', '<=', todayEnd.toISOString())
      .orderBy('recorded_at', 'asc');

    const glucoseHistory = todayReadings.map((r: any) => {
      const date = new Date(r.recorded_at);
      const hours = date.getHours();
      const ampm = hours >= 12 ? 'p' : 'a';
      const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
      return { t: `${displayHour}${ampm}`, v: r.value_mgdl };
    });

    res.json({
      current_glucose: latestReading
        ? { value: latestReading.value_mgdl, recorded_at: latestReading.recorded_at }
        : null,
      time_in_range: timeInRange,
      estimated_hba1c: estimatedHbA1c,
      avg_glucose_7d: Math.round(avgGlucose),
      hypo_events_7d: hypoEvents,
      hyper_events_7d: hyperEvents,
      adherence,
      today_medication: { taken: todayTaken, total: todayTotal },
      latest_alert: latestAlert || null,
      glucose_history: glucoseHistory,
      forecast: forecast.forecast,
      risk,
    });
  } catch (error: any) {
    console.error('Dashboard summary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
