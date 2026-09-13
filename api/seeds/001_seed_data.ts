import { Knex } from 'knex';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

export async function seed(knex: Knex): Promise<void> {
  // Clear existing data (in reverse order of dependencies)
  await knex('messages').del();
  await knex('alerts').del();
  await knex('medication_logs').del();
  await knex('medications').del();
  await knex('meals').del();
  await knex('activity_logs').del();
  await knex('glucose_readings').del();
  await knex('devices').del();
  await knex('care_links').del();
  await knex('users').del();

  const passwordHash = await bcrypt.hash('password123', 12);

  // --- Users ---
  const patientId = uuidv4();
  const clinicianId = uuidv4();
  const caregiverId = uuidv4();

  await knex('users').insert([
    {
      id: patientId,
      role: 'patient',
      email: 'patient@demo.com',
      password_hash: passwordHash,
      name: 'Aarav Sharma',
      diabetes_type: 'type2',
    },
    {
      id: clinicianId,
      role: 'clinician',
      email: 'doctor@demo.com',
      password_hash: passwordHash,
      name: 'Dr. Utkarsha Pacharney',
      diabetes_type: null,
    },
    {
      id: caregiverId,
      role: 'caregiver',
      email: 'caregiver@demo.com',
      password_hash: passwordHash,
      name: 'Meera Sharma',
      diabetes_type: null,
    },
  ]);

  // --- Care Links ---
  const careLinkId = uuidv4();
  await knex('care_links').insert([
    {
      id: careLinkId,
      patient_id: patientId,
      provider_id: clinicianId,
      provider_role: 'clinician',
      status: 'active',
    },
    {
      id: uuidv4(),
      patient_id: patientId,
      provider_id: caregiverId,
      provider_role: 'caregiver',
      status: 'active',
    },
  ]);

  // --- Glucose Readings (7 days of data) ---
  const glucoseReadings: any[] = [];
  const now = new Date();

  for (let day = 6; day >= 0; day--) {
    // Generate readings every 2 hours (12 per day)
    for (let hour = 0; hour < 24; hour += 2) {
      const recordedAt = new Date(now);
      recordedAt.setDate(recordedAt.getDate() - day);
      recordedAt.setHours(hour, Math.floor(Math.random() * 60), 0, 0);

      // Simulate realistic glucose patterns:
      // - Lower at night (80-110)
      // - Spikes after meals (130-180 around 8am, 1pm, 7pm)
      // - Moderate otherwise (100-140)
      let baseValue: number;
      if (hour >= 0 && hour < 6) {
        baseValue = 80 + Math.random() * 30; // Night: 80-110
      } else if (hour >= 7 && hour <= 9) {
        baseValue = 130 + Math.random() * 50; // Breakfast spike: 130-180
      } else if (hour >= 12 && hour <= 14) {
        baseValue = 120 + Math.random() * 40; // Lunch spike: 120-160
      } else if (hour >= 18 && hour <= 20) {
        baseValue = 125 + Math.random() * 55; // Dinner spike: 125-180
      } else {
        baseValue = 100 + Math.random() * 40; // Normal: 100-140
      }

      glucoseReadings.push({
        id: uuidv4(),
        user_id: patientId,
        value_mgdl: Math.round(baseValue),
        source: 'manual',
        recorded_at: recordedAt.toISOString(),
      });
    }
  }

  // Insert in batches to avoid overwhelming the database
  const BATCH_SIZE = 20;
  for (let i = 0; i < glucoseReadings.length; i += BATCH_SIZE) {
    await knex('glucose_readings').insert(glucoseReadings.slice(i, i + BATCH_SIZE));
  }

  // --- Medications ---
  const metforminId = uuidv4();
  const vitaminDId = uuidv4();

  await knex('medications').insert([
    {
      id: metforminId,
      user_id: patientId,
      name: 'Metformin',
      dosage: '500mg',
      times_per_day: 2,
      schedule_times: '{08:00,20:00}',
      active: true,
    },
    {
      id: vitaminDId,
      user_id: patientId,
      name: 'Vitamin D3',
      dosage: '1000 IU',
      times_per_day: 1,
      schedule_times: '{08:00}',
      active: true,
    },
  ]);

  // --- Medication Logs (today) ---
  const today = new Date();
  today.setHours(8, 0, 0, 0);
  const tonightSchedule = new Date();
  tonightSchedule.setHours(20, 0, 0, 0);

  await knex('medication_logs').insert([
    {
      id: uuidv4(),
      medication_id: metforminId,
      user_id: patientId,
      scheduled_for: today.toISOString(),
      taken_at: new Date(today.getTime() + 5 * 60000).toISOString(), // Taken 5 min late
      status: 'taken',
    },
    {
      id: uuidv4(),
      medication_id: metforminId,
      user_id: patientId,
      scheduled_for: tonightSchedule.toISOString(),
      taken_at: null,
      status: 'pending',
    },
    {
      id: uuidv4(),
      medication_id: vitaminDId,
      user_id: patientId,
      scheduled_for: today.toISOString(),
      taken_at: new Date(today.getTime() + 2 * 60000).toISOString(),
      status: 'taken',
    },
  ]);

  // --- Meals (today) ---
  const breakfastTime = new Date();
  breakfastTime.setHours(7, 40, 0, 0);
  const lunchTime = new Date();
  lunchTime.setHours(13, 10, 0, 0);

  await knex('meals').insert([
    {
      id: uuidv4(),
      user_id: patientId,
      description: 'Breakfast — oats & almonds',
      estimated_carbs_g: 38,
      protein_g: 12,
      fat_g: 14,
      fiber_g: 6,
      calories: 320,
      tag: 'Balanced',
      recommendation: 'Great choice! Oats provide sustained energy. Consider adding more protein.',
      logged_at: breakfastTime.toISOString(),
    },
    {
      id: uuidv4(),
      user_id: patientId,
      description: 'Lunch — dal, rice, salad',
      estimated_carbs_g: 62,
      protein_g: 18,
      fat_g: 8,
      fiber_g: 9,
      calories: 420,
      tag: 'Moderate',
      recommendation: 'Consider reducing rice portion slightly to lower carb load.',
      logged_at: lunchTime.toISOString(),
    },
  ]);

  // --- Activity Logs ---
  const walkTime = new Date();
  walkTime.setHours(6, 30, 0, 0);

  await knex('activity_logs').insert([
    {
      id: uuidv4(),
      user_id: patientId,
      type: 'walking',
      duration_minutes: 30,
      calories_burned: 150,
      logged_at: walkTime.toISOString(),
    },
  ]);

  // --- Alerts ---
  await knex('alerts').insert([
    {
      id: uuidv4(),
      user_id: patientId,
      type: 'hyper_risk',
      payload: JSON.stringify({
        probability: 0.68,
        predicted_peak: 168,
        predicted_time: '+90m',
      }),
      message: 'Model estimates a 68% chance of exceeding 180 mg/dL around 8:30 PM based on tonight\'s meal log and recent pattern.',
      read: false,
    },
  ]);

  // --- Messages ---
  await knex('messages').insert([
    {
      id: uuidv4(),
      sender_id: clinicianId,
      recipient_id: patientId,
      content: 'Your time-in-range improved this week — nice work. Let\'s keep the dinner portion smaller through the weekend.',
      read: true,
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    },
    {
      id: uuidv4(),
      sender_id: patientId,
      recipient_id: clinicianId,
      content: 'Will do. Should I still take the 8pm dose if I eat earlier?',
      read: true,
      created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
    },
  ]);

  console.log('✅ Seed data inserted successfully');
  console.log(`   Patient: patient@demo.com (${patientId})`);
  console.log(`   Clinician: doctor@demo.com (${clinicianId})`);
  console.log(`   Caregiver: caregiver@demo.com (${caregiverId})`);
  console.log(`   Glucose readings: ${glucoseReadings.length} records (7 days)`);
  console.log(`   Care link: active between patient and clinician`);
}
