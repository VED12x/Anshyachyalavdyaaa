import rateLimit from 'express-rate-limit';
import { config } from '../config';

/**
 * General rate limiter for all API endpoints.
 */
export const generalLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});

/**
 * Strict rate limiter for auth endpoints to prevent brute-force attacks.
 * 20 requests per 15 minutes.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts, please try again later' },
  keyGenerator: (req) => req.ip || 'unknown',
});

/**
 * Rate limiter for device ingestion to prevent a misbehaving device from flooding.
 * 300 requests per 5 minutes per IP.
 */
export const deviceIngestionLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Device ingestion rate limit exceeded' },
});
