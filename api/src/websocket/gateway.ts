import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { subscribeToChannel, CHANNELS } from '../services/redis';
import db from '../db/connection';

let io: Server;

/**
 * Initialize the WebSocket gateway with JWT authentication.
 * Clients must pass their access token as a query parameter or auth header.
 */
export function initWebSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: '*', // Configure properly in production
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  // JWT Authentication middleware for WebSocket connections
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;

    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token as string, config.jwtSecret) as {
        id: string;
        role: string;
        email: string;
      };

      (socket as any).user = decoded;
      next();
    } catch (error) {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = (socket as any).user;
    console.log(`🔌 WebSocket connected: ${user.email} (${user.role})`);

    // Join user's personal room for targeted pushes
    socket.join(`user:${user.id}`);

    // If clinician/caregiver, also join rooms for all linked patients
    if (user.role === 'clinician' || user.role === 'caregiver') {
      joinPatientRooms(socket, user.id);
    }

    socket.on('disconnect', () => {
      console.log(`🔌 WebSocket disconnected: ${user.email}`);
    });
  });

  // Subscribe to Redis events and broadcast via WebSocket
  setupRedisSubscriptions();

  console.log('🔌 WebSocket gateway initialized');
  return io;
}

/**
 * Join WebSocket rooms for all patients linked to a clinician/caregiver.
 */
async function joinPatientRooms(socket: Socket, providerId: string): Promise<void> {
  try {
    const links = await db('care_links')
      .where({ provider_id: providerId, status: 'active' })
      .select('patient_id');

    for (const link of links) {
      socket.join(`patient:${link.patient_id}`);
    }
  } catch (error) {
    console.error('Error joining patient rooms:', error);
  }
}

/**
 * Subscribe to Redis pub/sub channels and push events to WebSocket clients.
 */
function setupRedisSubscriptions(): void {
  // New glucose reading → push to patient and linked providers
  subscribeToChannel(CHANNELS.GLUCOSE_NEW_READING, (data) => {
    io.to(`user:${data.user_id}`).emit('glucose:new', data);
    io.to(`patient:${data.user_id}`).emit('glucose:new', data);
  });

  // New alert → push to patient and linked providers
  subscribeToChannel(CHANNELS.ALERT_CREATED, (data) => {
    io.to(`user:${data.user_id}`).emit('alert:new', data);
    io.to(`patient:${data.user_id}`).emit('alert:new', data);
  });

  // New message → push to recipient
  subscribeToChannel(CHANNELS.MESSAGE_SENT, (data) => {
    io.to(`user:${data.recipient_id}`).emit('message:new', {
      id: data.message_id,
      from: 'doctor',
      text: data.content,
      created_at: data.created_at,
    });
  });
}

/**
 * Get the Socket.io server instance for use in other modules.
 */
export function getIO(): Server {
  if (!io) {
    throw new Error('WebSocket not initialized. Call initWebSocket first.');
  }
  return io;
}

/**
 * Push an alert directly to a user's WebSocket channel.
 */
export function pushAlertToUser(userId: string, alert: any): void {
  if (io) {
    io.to(`user:${userId}`).emit('alert:new', alert);
    io.to(`patient:${userId}`).emit('alert:new', alert);
  }
}
