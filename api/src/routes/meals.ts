import { Router, Request, Response } from 'express';
import db from '../db/connection';
import { authenticate } from '../middleware/auth';
import { mealSchema } from '../validation/schemas';
import { mlService } from '../services/mlService';

const router = Router();

/**
 * POST /meals
 * Log a meal. Automatically calls the ML service for NLP dietary analysis.
 */
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const parsed = mealSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.errors });
    }

    const { description, photo_url, logged_at } = parsed.data;

    // Call ML service for NLP dietary analysis
    const analysis = await mlService.analyzeMeal(description, photo_url);

    const [meal] = await db('meals')
      .insert({
        user_id: req.user!.id,
        description,
        photo_url: photo_url || null,
        estimated_carbs_g: analysis.estimated_carbs_g,
        protein_g: analysis.protein_g,
        fat_g: analysis.fat_g,
        fiber_g: analysis.fiber_g,
        calories: analysis.calories,
        tag: analysis.tag,
        recommendation: analysis.recommendation,
        logged_at: logged_at || new Date().toISOString(),
      })
      .returning('*');

    res.status(201).json({
      ...meal,
      analysis,
    });
  } catch (error: any) {
    console.error('Create meal error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /meals
 * List meals for the authenticated user.
 * Returns format matching frontend: { name, time, carbs, tag }
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const date = req.query.date as string; // optional: filter by specific date

    let query = db('meals')
      .where({ user_id: req.user!.id })
      .orderBy('logged_at', 'desc');

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      query = query
        .where('logged_at', '>=', startOfDay.toISOString())
        .where('logged_at', '<=', endOfDay.toISOString());
    }

    const offset = (page - 1) * limit;
    const meals = await query.limit(limit).offset(offset);

    // Format for frontend
    const formatted = meals.map((m: any) => ({
      id: m.id,
      name: m.description,
      time: new Date(m.logged_at).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }),
      carbs: m.estimated_carbs_g ? `${Math.round(m.estimated_carbs_g)}g carbs` : '—',
      tag: m.tag || 'Pending',
      recommendation: m.recommendation,
      logged_at: m.logged_at,
      nutrition: {
        carbs_g: m.estimated_carbs_g,
        protein_g: m.protein_g,
        fat_g: m.fat_g,
        fiber_g: m.fiber_g,
        calories: m.calories,
      },
    }));

    res.json({ data: formatted });
  } catch (error: any) {
    console.error('List meals error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


/**
 * POST /meals/simulate (Phase 16)
 * Calls the ML service for NLP dietary analysis WITHOUT saving to the database.
 */
router.post('/simulate', authenticate, async (req: Request, res: Response) => {
  try {
    const parsed = mealSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.errors });
    }
    const { description, photo_url } = parsed.data;
    const analysis = await mlService.analyzeMeal(description, photo_url);
    res.json({ data: analysis });
  } catch (error: any) {
    console.error('Simulate meal error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
export default router;
