import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { config } from './config';
import { generalLimiter, authLimiter } from './middleware/rateLimiter';
import { authenticate } from './middleware/auth';
import { initWebSocket } from './websocket/gateway';
import { subscribeToChannel, CHANNELS } from './services/redis';
import { processGlucoseReading } from './services/alertService';
import { startMissedDoseJob } from './jobs/missedDose';

// Route imports
import authRoutes from './routes/auth';
import glucoseRoutes from './routes/glucose';
import medicationRoutes from './routes/medications';
import mealRoutes from './routes/meals';
import activityRoutes from './routes/activity';
import dashboardRoutes from './routes/dashboard';
import deviceRoutes from './routes/devices';
import alertRoutes from './routes/alerts';
import doctorRoutes from './routes/doctor';
import adminRoutes from './routes/admin';
import relativeRoutes from './routes/relative';
import chatbotRoutes from './routes/chatbot';
import messageRoutes from './routes/messages';
import careLinkRoutes from './routes/careLinks';
import callRoutes from './routes/calls';

const app = express();
app.set('trust proxy', 1);
const httpServer = createServer(app);

// --- Global Middleware ---
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(generalLimiter);

// Structured JSON logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (config.nodeEnv === 'production') {
      console.log(JSON.stringify({
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration_ms: duration,
        timestamp: new Date().toISOString(),
      }));
    }
  });
  next();
});

// --- Health Check (unauthenticated) ---
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'diabetescare360-api',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// --- Metrics endpoint for monitoring ---
let requestCount = 0;
let errorCount = 0;
const startTime = Date.now();

app.use((req, res, next) => {
  requestCount++;
  res.on('finish', () => {
    if (res.statusCode >= 400) errorCount++;
  });
  next();
});

app.get('/metrics', (_req, res) => {
  const uptimeSeconds = (Date.now() - startTime) / 1000;
  res.json({
    uptime_seconds: uptimeSeconds,
    total_requests: requestCount,
    total_errors: errorCount,
    error_rate: requestCount > 0 ? (errorCount / requestCount).toFixed(4) : '0',
    requests_per_second: (requestCount / uptimeSeconds).toFixed(2),
  });
});

// --- Routes ---
app.use('/auth', authLimiter, authRoutes);
app.use('/glucose-readings', authenticate, glucoseRoutes);
app.use('/medications', authenticate, medicationRoutes);
app.use('/meals', authenticate, mealRoutes);
app.use('/activity-logs', authenticate, activityRoutes);
app.use('/dashboard', authenticate, dashboardRoutes);
app.use('/devices', authenticate, deviceRoutes);
app.use('/alerts', authenticate, alertRoutes);
app.use('/doctor', authenticate, doctorRoutes);
app.use('/admin', authenticate, adminRoutes);
app.use('/relative', authenticate, relativeRoutes);
app.use('/chatbot', authenticate, chatbotRoutes);
app.use('/messages', authenticate, messageRoutes);
app.use('/care-links', authenticate, careLinkRoutes);
app.use('/calls', authenticate, callRoutes);

// --- 404 Handler ---
app.use((_req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// --- Global Error Handler ---
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// --- Start Server ---
const PORT = config.port;

if (process.env.NODE_ENV !== 'test') {
  httpServer.listen(PORT, () => {
    console.log(`\n🚀 DiabetesCare 360 API running on port ${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/health`);
    console.log(`   Metrics: http://localhost:${PORT}/metrics`);
    console.log(`   Environment: ${config.nodeEnv}\n`);

    // Initialize WebSocket gateway
    initWebSocket(httpServer);

    // Subscribe to glucose readings for alert processing
    subscribeToChannel(CHANNELS.GLUCOSE_NEW_READING, processGlucoseReading);

    // Start missed-dose cron job
    startMissedDoseJob();
  });
}

// For testing
export { app, httpServer };
