import cron from 'node-cron';
import db from '../db/connection';
import { createAlert } from '../services/alertService';

/**
 * Missed-dose detection job.
 * Runs every 15 minutes and checks for medication_logs entries:
 * - Past their scheduled time by more than 30 minutes
 * - Still in 'pending' status (no taken_at)
 * Marks them as 'missed' and creates an alert.
 */
export function startMissedDoseJob(): void {
  // Run every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    console.log('🕐 Running missed-dose detection job...');

    try {
      const now = new Date();
      const graceMinutes = 30; // Give 30 minutes after scheduled time before marking missed
      const cutoffTime = new Date(now.getTime() - graceMinutes * 60 * 1000);

      // Find pending logs that are past their scheduled time + grace period
      const pendingLogs = await db('medication_logs')
        .where({ status: 'pending' })
        .where('scheduled_for', '<', cutoffTime.toISOString())
        .join('medications', 'medication_logs.medication_id', 'medications.id')
        .select(
          'medication_logs.id as log_id',
          'medication_logs.user_id',
          'medication_logs.scheduled_for',
          'medications.name as medication_name',
          'medications.dosage'
        );

      if (pendingLogs.length === 0) {
        return;
      }

      console.log(`  Found ${pendingLogs.length} missed dose(s)`);

      for (const log of pendingLogs) {
        // Mark as missed
        await db('medication_logs')
          .where({ id: log.log_id })
          .update({ status: 'missed' });

        // Create alert
        await createAlert(
          log.user_id,
          'missed_dose',
          `Missed dose: ${log.medication_name} ${log.dosage} was scheduled for ${new Date(log.scheduled_for).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`,
          {
            medication_name: log.medication_name,
            dosage: log.dosage,
            scheduled_for: log.scheduled_for,
            detected_at: now.toISOString(),
          }
        );
      }

      console.log(`  ✅ Processed ${pendingLogs.length} missed dose(s)`);
    } catch (error) {
      console.error('Missed-dose job error:', error);
    }
  });

  console.log('🕐 Missed-dose detection job scheduled (every 15 minutes)');
}
