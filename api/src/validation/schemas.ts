import { z } from 'zod';

// --- Auth Schemas ---
export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required').max(255),
  role: z.enum(['patient', 'caregiver', 'clinician']),
  diabetes_type: z.enum(['type1', 'type2', 'gestational', 'prediabetes']).optional().nullable(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const refreshTokenSchema = z.object({
  refresh_token: z.string().min(1, 'Refresh token is required'),
});

// --- Glucose Schemas ---
export const glucoseReadingSchema = z.object({
  value_mgdl: z.number().min(20, 'Glucose value must be at least 20 mg/dL').max(600, 'Glucose value must be at most 600 mg/dL'),
  source: z.enum(['manual', 'device']).optional().default('manual'),
  recorded_at: z.string().datetime().optional(),
});

export const glucoseQuerySchema = z.object({
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});

// --- Medication Schemas ---
export const medicationSchema = z.object({
  name: z.string().min(1, 'Medication name is required').max(255),
  dosage: z.string().min(1, 'Dosage is required').max(100),
  times_per_day: z.number().int().min(1).max(10).optional().default(1),
  schedule_times: z.array(z.string()).optional(),
  notes: z.string().optional().nullable(),
});

export const medicationUpdateSchema = medicationSchema.partial();

export const medicationLogSchema = z.object({
  status: z.enum(['taken', 'missed']),
  taken_at: z.string().datetime().optional().nullable(),
});

// --- Meal Schemas ---
export const mealSchema = z.object({
  description: z.string().min(1, 'Meal description is required'),
  photo_url: z.string().url().optional().nullable(),
  logged_at: z.string().datetime().optional(),
});

// --- Activity Schemas ---
export const activityLogSchema = z.object({
  type: z.string().min(1, 'Activity type is required').max(100),
  duration_minutes: z.number().int().min(1, 'Duration must be at least 1 minute'),
  calories_burned: z.number().int().optional().nullable(),
  notes: z.string().optional().nullable(),
  logged_at: z.string().datetime().optional(),
});

// --- Device Schemas ---
export const devicePairSchema = z.object({
  device_type: z.enum(['glucometer', 'cgm', 'wearable']),
  external_id: z.string().min(1, 'External device ID is required'),
  name: z.string().optional().nullable(),
  manufacturer: z.string().optional().nullable(),
});

export const deviceReadingSchema = z.object({
  readings: z.array(z.object({
    value_mgdl: z.number().min(20).max(600),
    recorded_at: z.string().datetime(),
  })).min(1, 'At least one reading is required'),
});

// --- Message Schemas ---
export const messageSchema = z.object({
  recipient_id: z.string().min(1, 'Invalid recipient ID'),
  content: z.string().min(1, 'Message content is required').max(5000),
});

export const messageQuerySchema = z.object({
  with_user_id: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});

// --- Care Link Schemas ---
export const careLinkSchema = z.object({
  patient_id: z.string().uuid('Invalid patient ID'),
  provider_role: z.enum(['caregiver', 'clinician']),
});

// --- Alert Query Schema ---
export const alertQuerySchema = z.object({
  unread_only: z.coerce.boolean().optional().default(false),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});
