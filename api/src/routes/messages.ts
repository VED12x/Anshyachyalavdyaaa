import { Router, Request, Response } from 'express';
import db from '../db/connection';
import { authenticate } from '../middleware/auth';
import { messageSchema, messageQuerySchema } from '../validation/schemas';
import { publishEvent, CHANNELS } from '../services/redis';
import { checkCareAccess } from '../middleware/careAccess';

const router = Router();

/**
 * POST /messages
 * Send a message from the authenticated user to another user.
 * Both users must be connected via an active care link.
 */
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const parsed = messageSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.errors });
    }

    const { recipient_id, content } = parsed.data;

    // Verify recipient exists
    const recipient = await db('users').where({ id: recipient_id }).first();
    if (!recipient) {
      return res.status(404).json({ error: 'Recipient not found' });
    }

    // Verify care link exists between sender and recipient (in either direction)
    const careLink = await db('care_links')
      .where(function () {
        this.where({ patient_id: req.user!.id, provider_id: recipient_id, status: 'active' })
          .orWhere({ patient_id: recipient_id, provider_id: req.user!.id, status: 'active' });
      })
      .first();

    if (!careLink) {
      return res.status(403).json({ error: 'No active care link with this user' });
    }

    const [message] = await db('messages')
      .insert({
        sender_id: req.user!.id,
        recipient_id,
        content,
      })
      .returning('*');

    // Publish event for real-time WebSocket delivery
    await publishEvent(CHANNELS.MESSAGE_SENT, {
      message_id: message.id,
      sender_id: req.user!.id,
      recipient_id,
      content,
      created_at: message.created_at,
    });

    res.status(201).json({
      id: message.id,
      from: req.user!.id === message.sender_id ? 'me' : 'doctor',
      text: message.content,
      created_at: message.created_at,
    });
  } catch (error: any) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /messages
 * Get message thread with a specific user.
 * Supports pagination. Returns format matching frontend: { from: "me"|"doctor", text }
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const parsed = messageQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.errors });
    }

    const { with_user_id, page, limit } = parsed.data;

    let query = db('messages')
      .orderBy('created_at', 'desc');

    if (with_user_id) {
      // Get thread between current user and specified user
      query = query.where(function () {
        this.where({ sender_id: req.user!.id, recipient_id: with_user_id })
          .orWhere({ sender_id: with_user_id, recipient_id: req.user!.id });
      });
    } else {
      // Get all messages involving current user
      query = query.where(function () {
        this.where({ sender_id: req.user!.id })
          .orWhere({ recipient_id: req.user!.id });
      });
    }

    const offset = (page - 1) * limit;
    const messages = await query.limit(limit).offset(offset);

    // Mark received messages as read
    if (with_user_id) {
      await db('messages')
        .where({ sender_id: with_user_id, recipient_id: req.user!.id, read: false })
        .update({ read: true });
    }

    // Format for frontend
    const formatted = messages.map((m: any) => ({
      id: m.id,
      from: m.sender_id === req.user!.id ? 'me' : 'doctor',
      text: m.content,
      created_at: m.created_at,
      read: m.read,
    }));

    res.json({ data: formatted.reverse() }); // Oldest first for chat display
  } catch (error: any) {
    console.error('List messages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
