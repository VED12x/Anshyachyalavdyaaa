import db from '../db/connection';
import { publishEvent, CHANNELS } from '../services/redis';
import { mlService } from './mlService';
import { pushAlertToUser } from '../websocket/gateway';

// Risk thresholds for creating alerts
const HYPO_RISK_THRESHOLD = 0.5;
const HYPER_RISK_THRESHOLD = 0.5;

/**
 * Creates an alert record and pushes it via WebSocket and Redis pub/sub.
 */
export async function createAlert(
  userId: string,
  type: 'hypo_risk' | 'hyper_risk' | 'missed_dose' | 'device_sync' | 'general',
  message: string,
  payload?: Record<string, any>
): Promise<any> {
  const [alert] = await db('alerts')
    .insert({
      user_id: userId,
      type,
      message,
      payload: payload ? JSON.stringify(payload) : null,
    })
    .returning('*');

  // Publish to Redis for WebSocket distribution
  await publishEvent(CHANNELS.ALERT_CREATED, {
    alert_id: alert.id,
    user_id: userId,
    type,
    message,
    payload,
    created_at: alert.created_at,
  });

  // Also push directly via WebSocket
  try {
    pushAlertToUser(userId, alert);
  } catch (err) {
    // WebSocket may not be initialized during tests
    console.warn('WebSocket push failed (may not be initialized):', (err as Error).message);
  }

  return alert;
}

/**
 * Process a new glucose reading:
 * 1. Call ML service for risk prediction
 * 2. If risk exceeds threshold, create an alert
 *
 * Called by the Redis subscriber when a glucose.new_reading event fires.
 */
export async function processGlucoseReading(data: {
  user_id: string;
  reading_id: string;
  value_mgdl: number;
  recorded_at: string;
}): Promise<void> {
  try {
    // Get recent readings for context
    const recentReadings = await db('glucose_readings')
      .where({ user_id: data.user_id })
      .orderBy('recorded_at', 'desc')
      .limit(12);

    if (recentReadings.length < 3) {
      return; // Not enough data for meaningful prediction
    }

    // Get recent meals
    const recentMeals = await db('meals')
      .where({ user_id: data.user_id })
      .orderBy('logged_at', 'desc')
      .limit(3);

    // Call ML service for risk prediction
    const glucoseHistory = recentReadings
      .reverse()
      .map((r: any) => ({ value: r.value_mgdl, timestamp: r.recorded_at }));

    const risk = await mlService.getRiskPrediction(
      glucoseHistory,
      recentMeals.map((m: any) => ({
        description: m.description,
        carbs: m.estimated_carbs_g || 0,
      }))
    );

    // Create alert if risk exceeds threshold
    if (risk.hypo_risk >= HYPO_RISK_THRESHOLD) {
      await createAlert(data.user_id, 'hypo_risk', risk.reason, {
        probability: risk.hypo_risk,
        current_glucose: data.value_mgdl,
        model_version: risk.model_version,
      });
    }

    if (risk.hyper_risk >= HYPER_RISK_THRESHOLD) {
      await createAlert(data.user_id, 'hyper_risk', risk.reason, {
        probability: risk.hyper_risk,
        current_glucose: data.value_mgdl,
        model_version: risk.model_version,
      });
    }
  } catch (error) {
    console.error('Error processing glucose reading for alerts:', error);
  }
}
