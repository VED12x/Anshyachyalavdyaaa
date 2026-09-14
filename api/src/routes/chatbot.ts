import { Router, Request, Response } from 'express';
import db from '../db/connection';
import { authenticate } from '../middleware/auth';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
router.use(authenticate);

// 1. Create a new chatbot session
router.post('/sessions', async (req: Request, res: Response) => {
  try {
    const [session] = await db('chatbot_sessions').insert({
      user_id: req.user!.id,
      status: 'bot_active'
    }).returning('*');

    // Add an initial greeting message
    await db('chatbot_messages').insert({
      session_id: session.id,
      sender: 'bot',
      content: 'Hi! I am your support assistant. Please select an option below or type your issue.'
    });

    res.status(201).json({ data: session });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 2. Get session details and messages
router.get('/sessions/:id', async (req: Request, res: Response) => {
  try {
    const session = await db('chatbot_sessions').where({ id: req.params.id, user_id: req.user!.id }).first();
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const messages = await db('chatbot_messages').where({ session_id: session.id }).orderBy('created_at', 'asc');
    const menus = await db('chatbot_menu_config').whereNull('parent_id'); // Top level menus

    res.json({ data: { session, messages, menus } });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 3. Send a message to the session
router.post('/sessions/:id/messages', async (req: Request, res: Response) => {
  try {
    const { content, menu_id } = req.body;
    const session = await db('chatbot_sessions').where({ id: req.params.id, user_id: req.user!.id }).first();
    
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.status !== 'bot_active') {
      return res.status(400).json({ error: 'Session is already escalated or resolved. A human will respond shortly.' });
    }

    // Save user message
    const [userMsg] = await db('chatbot_messages').insert({
      session_id: session.id,
      sender: 'user',
      content: content || 'Selected option',
      option_key: menu_id || null
    }).returning('*');

    let botReply = '';
    let escalateTo = null;

    if (menu_id) {
      const menu = await db('chatbot_menu_config').where({ id: menu_id }).first();
      if (menu) {
        if (menu.action === 'answer') {
          botReply = menu.response_text || 'I have noted your request.';
        } else if (menu.action === 'escalate_to_doctor') {
          botReply = 'I am escalating this to your doctor immediately. They will respond here.';
          escalateTo = 'doctor';
        } else if (menu.action === 'escalate_to_support') {
          botReply = 'I am escalating this to our support team. A representative will respond shortly.';
          escalateTo = 'support';
        }
      }
    } else {
      // Free text fallback -> always escalate to support to avoid dropping messages
      botReply = 'I am escalating your message to our support team to get you the best help.';
      escalateTo = 'support';
    }

    // Save bot reply
    const [botMsg] = await db('chatbot_messages').insert({
      session_id: session.id,
      sender: 'bot',
      content: botReply
    }).returning('*');

    if (escalateTo) {
      await db('chatbot_sessions').where({ id: session.id }).update({
        status: 'escalated',
        escalation_target: escalateTo
      });
      session.status = 'escalated';
    }

    res.status(201).json({ data: { userMessage: userMsg, botMessage: botMsg, session } });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
