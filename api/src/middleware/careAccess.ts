import db from '../db/connection';

/**
 * Checks whether a provider (clinician or caregiver) has an active care link
 * to a specific patient. This is the single source of truth for data-sharing
 * authorization — used across all routes where a non-patient accesses
 * patient data.
 *
 * @param providerId - The ID of the clinician/caregiver requesting access
 * @param patientId - The ID of the patient whose data is being accessed
 * @returns true if an active care link exists
 */
export async function checkCareAccess(providerId: string, patientId: string): Promise<boolean> {
  const link = await db('care_links')
    .where({
      patient_id: patientId,
      provider_id: providerId,
      status: 'active',
    })
    .first();

  return !!link;
}

/**
 * Resolves the target patient ID from the request.
 * - If the user IS the patient, returns their own ID.
 * - If the user is a clinician/caregiver, checks the care link and returns
 *   the patient ID from the route params.
 * - Throws if access is denied.
 *
 * @param userId - The authenticated user's ID
 * @param userRole - The authenticated user's role
 * @param targetPatientId - The patient ID from the request (optional, used by clinicians)
 * @returns The patient ID to scope queries to
 */
export async function resolvePatientAccess(
  userId: string,
  userRole: string,
  targetPatientId?: string
): Promise<{ patientId: string; authorized: boolean }> {
  // Patients access their own data
  if (userRole === 'patient') {
    return { patientId: userId, authorized: true };
  }

  // Clinicians and caregivers must specify which patient
  if (!targetPatientId) {
    return { patientId: '', authorized: false };
  }

  const hasAccess = await checkCareAccess(userId, targetPatientId);
  return { patientId: targetPatientId, authorized: hasAccess };
}
