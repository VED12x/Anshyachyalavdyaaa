import { Router, Request, Response } from 'express';
import db from '../db/connection';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * POST /calls/initiate
 * Patient or Doctor starts a call. Creates a call record and returns a room ID.
 */
router.post('/initiate', authenticate, async (req: Request, res: Response) => {
  try {
    const { recipient_id, call_type } = req.body; // call_type: 'audio' or 'video'

    if (!recipient_id) {
      return res.status(400).json({ error: 'recipient_id is required' });
    }

    // Generate a unique room ID for WebRTC
    const roomId = `dc360-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const [call] = await db('calls')
      .insert({
        caller_id: req.user!.id,
        recipient_id,
        call_type: call_type || 'audio',
        room_id: roomId,
        status: 'ringing',
      })
      .returning('*');

    res.status(201).json({
      data: {
        id: call.id,
        room_id: roomId,
        call_type: call.call_type,
        status: 'ringing',
        caller_id: req.user!.id,
        recipient_id,
      },
    });
  } catch (error: any) {
    console.error('Initiate call error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /calls/:id/answer
 * Recipient answers the call.
 */
router.patch('/:id/answer', authenticate, async (req: Request, res: Response) => {
  try {
    const [call] = await db('calls')
      .where({ id: req.params.id, recipient_id: req.user!.id, status: 'ringing' })
      .update({ status: 'active', answered_at: new Date().toISOString() })
      .returning('*');

    if (!call) {
      return res.status(404).json({ error: 'Call not found or already answered' });
    }

    res.json({ data: call });
  } catch (error: any) {
    console.error('Answer call error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /calls/:id/end
 * Either party ends the call.
 */
router.patch('/:id/end', authenticate, async (req: Request, res: Response) => {
  try {
    const [call] = await db('calls')
      .where({ id: req.params.id })
      .where(function () {
        this.where({ caller_id: req.user!.id }).orWhere({ recipient_id: req.user!.id });
      })
      .whereIn('status', ['ringing', 'active'])
      .update({ status: 'ended', ended_at: new Date().toISOString() })
      .returning('*');

    if (!call) {
      return res.status(404).json({ error: 'Call not found' });
    }

    res.json({ data: call });
  } catch (error: any) {
    console.error('End call error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /calls/active
 * Check if there's an active/ringing call for the current user.
 */
router.get('/active', authenticate, async (req: Request, res: Response) => {
  try {
    const call = await db('calls')
      .where(function () {
        this.where({ caller_id: req.user!.id }).orWhere({ recipient_id: req.user!.id });
      })
      .whereIn('status', ['ringing', 'active'])
      .orderBy('created_at', 'desc')
      .first();

    res.json({ data: call || null });
  } catch (error: any) {
    console.error('Get active call error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /calls/history
 * Get call history for the current user.
 */
router.get('/history', authenticate, async (req: Request, res: Response) => {
  try {
    const calls = await db('calls')
      .where(function () {
        this.where({ caller_id: req.user!.id }).orWhere({ recipient_id: req.user!.id });
      })
      .orderBy('created_at', 'desc')
      .limit(20);

    res.json({ data: calls });
  } catch (error: any) {
    console.error('Call history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /calls/signal
 * WebRTC signaling: exchange SDP offers/answers and ICE candidates.
 */
router.post('/signal', authenticate, async (req: Request, res: Response) => {
  try {
    const { room_id, type, data } = req.body;

    if (!room_id || !type || !data) {
      return res.status(400).json({ error: 'room_id, type, and data are required' });
    }

    // Store the signal in a temporary table for polling
    await db('call_signals')
      .insert({
        room_id,
        sender_id: req.user!.id,
        signal_type: type, // 'offer', 'answer', 'ice-candidate'
        signal_data: JSON.stringify(data),
      });

    res.json({ ok: true });
  } catch (error: any) {
    console.error('Signal error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /calls/signal/:roomId
 * Poll for WebRTC signals from the other party.
 */
router.get('/signal/:roomId', authenticate, async (req: Request, res: Response) => {
  try {
    const signals = await db('call_signals')
      .where({ room_id: req.params.roomId })
      .whereNot({ sender_id: req.user!.id })
      .orderBy('created_at', 'asc');

    // Delete consumed signals
    if (signals.length > 0) {
      await db('call_signals')
        .whereIn('id', signals.map((s: any) => s.id))
        .del();
    }

    res.json({
      data: signals.map((s: any) => ({
        type: s.signal_type,
        data: JSON.parse(s.signal_data),
      })),
    });
  } catch (error: any) {
    console.error('Get signals error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
