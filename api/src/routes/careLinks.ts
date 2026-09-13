import { Router, Request, Response } from 'express';
import db from '../db/connection';
import { authenticate } from '../middleware/auth';
import { careLinkSchema } from '../validation/schemas';

const router = Router();

/**
 * POST /care-links
 * Create a new care link between a patient and a clinician/caregiver.
 * Can be initiated by either the patient or the provider.
 */
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const parsed = careLinkSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.errors });
    }

    const { patient_id, provider_role } = parsed.data;

    // Determine who is the patient and who is the provider
    let actualPatientId: string;
    let actualProviderId: string;

    if (req.user!.role === 'patient') {
      actualPatientId = req.user!.id;
      actualProviderId = patient_id; // In this case, patient_id is actually the provider ID
    } else {
      actualPatientId = patient_id;
      actualProviderId = req.user!.id;
    }

    // Verify the patient exists and is actually a patient
    const patient = await db('users')
      .where({ id: actualPatientId, role: 'patient' })
      .first();
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    // Verify the provider exists
    const provider = await db('users')
      .where({ id: actualProviderId })
      .whereIn('role', ['clinician', 'caregiver'])
      .first();
    if (!provider) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    // Check for existing link
    const existing = await db('care_links')
      .where({ patient_id: actualPatientId, provider_id: actualProviderId })
      .first();

    if (existing) {
      if (existing.status === 'active') {
        return res.status(409).json({ error: 'Care link already active' });
      }
      // Reactivate a revoked link
      const [updated] = await db('care_links')
        .where({ id: existing.id })
        .update({ status: 'active', updated_at: new Date().toISOString() })
        .returning('*');
      return res.json(updated);
    }

    const [link] = await db('care_links')
      .insert({
        patient_id: actualPatientId,
        provider_id: actualProviderId,
        provider_role,
        status: 'active',
      })
      .returning('*');

    res.status(201).json(link);
  } catch (error: any) {
    console.error('Create care link error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /care-links
 * List care links for the authenticated user.
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    let links;

    if (req.user!.role === 'patient') {
      links = await db('care_links')
        .where({ patient_id: req.user!.id })
        .join('users', 'care_links.provider_id', 'users.id')
        .select(
          'care_links.*',
          'users.name as provider_name',
          'users.email as provider_email',
          'users.role as provider_user_role'
        );
    } else {
      links = await db('care_links')
        .where({ provider_id: req.user!.id })
        .join('users', 'care_links.patient_id', 'users.id')
        .select(
          'care_links.*',
          'users.name as patient_name',
          'users.email as patient_email'
        );
    }

    res.json({ data: links });
  } catch (error: any) {
    console.error('List care links error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /care-links/:id/revoke
 * Revoke a care link. Only the patient can revoke access.
 * Revocation is immediate — no cache staleness, as care-link checks
 * always query the database directly.
 */
router.post('/:id/revoke', authenticate, async (req: Request, res: Response) => {
  try {
    // Only the patient can revoke access
    const link = await db('care_links')
      .where({ id: req.params.id, patient_id: req.user!.id })
      .first();

    if (!link) {
      return res.status(404).json({ error: 'Care link not found or you do not have permission to revoke it' });
    }

    if (link.status === 'revoked') {
      return res.status(400).json({ error: 'Care link already revoked' });
    }

    const [updated] = await db('care_links')
      .where({ id: req.params.id })
      .update({
        status: 'revoked',
        updated_at: new Date().toISOString(),
      })
      .returning('*');

    res.json({
      message: 'Care link revoked successfully',
      care_link: updated,
    });
  } catch (error: any) {
    console.error('Revoke care link error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
